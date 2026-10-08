import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [9, -4, 7, 2, -11, 5, 13, 1].map((delta, index) => ({
  time: (index + 1) * 60_000,
  open: 20,
  high: 40,
  low: 0,
  close: 20 + delta,
  volume: 100,
}));

const expected = {
  parameter: {
    a2: [null, null, 9, -4, 7, 2, -11, 5],
    a3: [null, null, null, 9, -4, 7, 2, -11],
    b2: [null, null, -27, 12, -21, -6, 33, -15],
    b3: [null, null, null, -27, 12, -21, -6, 33],
  },
  local: {
    a2: [null, null, 23, null, 19, 9, null, 15],
    a3: [null, null, null, 23, null, 19, 9, null],
    b2: [null, null, null, 29, null, null, 71, null],
    b3: [null, null, null, null, 29, null, null, 71],
  },
};

describe('documented independent UDF deep histories', () => {
  for (const version of [5, 6]) {
    for (const binding of ['parameter', 'local'] as const) {
      // Reference entries => and []: written calls own independent local trails.
      // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call
      // Every call executes each bar; missing local values still occupy slots.
      it(`v${version} retains offsets2/3 of each call's ${binding}`, () => {
        const body = binding === 'parameter' ? '[source[2], source[3]]' : `local = -99.0
    local := source > 0 ? source * 2 + 5 : float(na)
    [local[2], local[3]]`;
        const ast = parse(`//@version=${version}
indicator("Independent deep histories")
sample(float source) =>
    ${body}
[a2, a3] = sample(close - open)
[b2, b3] = sample((close - open) * -3)
plot(a2, "a2")
plot(a3, "a3")
plot(b2, "b2")
plot(b3, "b3")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        for (const [title, values] of Object.entries(expected[binding])) {
          const plot = result.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          expect(plot!.values, title).toEqual(values);
        }
      });
    }
  }
});
