import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger rank 69: v5 migration guide; v6 input.int range slots are const int.
function check(version: number, call: string) {
  return checkProgram(parse(`//@version=${version}\nindicator("Integer input range")\nlength = ${call}`));
}

describe('documented integer input range arguments', () => {
  for (const version of [5, 6]) {
    for (const parameter of ['minval', 'maxval', 'step']) {
      const defval = parameter === 'minval' ? 3 : 1;
      for (const binding of ['named', 'positional']) {
        for (const [value, accepts] of [['1', true], ['1.5', false]] as const) {
          it(`v${version} ${binding} ${parameter} ${accepts ? 'accepts const int' : 'refuses const float'}`, () => {
            const tail = parameter === 'minval' ? value : parameter === 'maxval' ? `0, ${value}` : `0, 3, ${value}`;
            const call = binding === 'named' ? `input.int(${defval}, ${parameter}=${value})` : `input.int(${defval}, "Bound", ${tail})`;
            const result = check(version, call);
            if (accepts) expect(result.diagnostics).toEqual([]);
            else expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(`${parameter} must be an integer`) })]);
          });
        }
      }
      for (const [qualifier, value] of [['input', 'input.int(1)'], ['simple', 'syminfo.minmove'], ['series', 'bar_index']]) {
        it(`v${version} ${parameter} refuses ${qualifier} int`, () => {
          const result = check(version, `input.int(${defval}, ${parameter}=${value})`);
          expect(result.diagnostics).toEqual([expect.objectContaining({
            code: 'qualifier-mismatch', message: expect.stringContaining(`Cannot pass ${qualifier} value to const parameter '${parameter}'`),
          })]);
        });
      }
    }
  }
});
