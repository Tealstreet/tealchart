import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('finite less comparisons, ranks1641/1642', () => {
  for (const version of [5, 6]) {
    for (const [kind, sample] of [
      ['int', 'bar_index - 1'],
      ['float', '(bar_index - 1) * 0.5'],
    ] as const) {
      it.each([
        ['<', [1, 0, 0, 0], [0, 0, 1, 1]],
        ['<=', [1, 1, 0, 0], [0, 1, 1, 1]],
      ] as const)(
        `v${version} ${kind} distinguishes the finite %s boundary in both operand orders`,
        (operator, forward, reverse) => {
          const source = `//@version=${version}
indicator("Finite less comparisons")
${kind} sample = ${sample}
forward = sample ${operator} 0
reverse = 0 ${operator} sample
plot(forward ? 1 : 0)
plot(reverse ? 1 : 0)`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics).toEqual([]);
          for (const name of ['forward', 'reverse']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
              kind: 'bool',
              qualifier: 'series',
            });
          }
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
          expect(result.errors).toEqual([]);
          expect(result.profile.swallowedErrors ?? []).toEqual([]);
          expect(result.plots.map((plot) => plot.values)).toEqual([forward, reverse]);
        },
      );
    }
  }
});
