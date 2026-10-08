import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic';

const bars = [11, 23, 37, 53].map((close, i) => ({
  time: i * 60000,
  open: close,
  high: close + 3,
  low: close - 1,
  close,
  volume: 2 * (i + 1),
}));
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((x) => x.severity === 'error');

// https://www.tradingview.com/pine-script-reference/v6/ entries683/755.
// V5 migration: /to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables.
describe('worklist1443/1444 function namespace boundaries', () => {
  for (const member of ['tsi', 'wpr'] as const) {
    for (const version of [4, 5, 6]) {
      it(`v${version} ${member} resolves the published name and computes`, () => {
        const name = version === 4 ? member : `ta.${member}`;
        const call = member === 'tsi' ? `${name}(close, 1, 1)` : `${name}(1)`;
        const source = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Rename")\nplot(${call})`;
        expect(errors(source)).toEqual([]);
        const result = executeScript(parse(source), bars);
        expect(result.errors).toEqual([]);
        expect(result.plots[0]!.values).toEqual(member === 'tsi' ? [null, 1, 1, 1] : [-75, -75, -75, -75]);
      });
    }
    for (const version of [5, 6]) {
      it(`v${version} rejects legacy bare ${member}`, () => {
        const call = member === 'tsi' ? 'tsi(close, 1, 1)' : 'wpr(1)';
        expect(
          errors(`//@version=${version}\nindicator("Rename refusal")\nplot(${call})`).some((x) =>
            x.message.includes(member),
          ),
        ).toBe(true);
      });
    }
  }
});
