import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = [9, 12, 8].map((close, index) => ({
  time: Date.UTC(2026, 9, 3) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));
describe('actual UDF method contexts preserve per-call overloads', () => {
  for (const version of [5, 6])
    for (const family of ['receiver', 'argument']) {
      it(`v${version} ${family} keeps independent supplied body calls`, () => {
        const methods =
          family === 'receiver'
            ? 'method score(array<int> value) => 11\nmethod score(array<float> value) => -13'
            : 'method score(array<int> value, int offset) => 17\nmethod score(array<int> value, float offset) => -19';
        const source = `//@version=${version}
indicator("Actual method contexts")
${methods}
${family === 'receiver' ? 'choose(value) => value.score()' : 'choose(value, offset) => value.score(offset)'}
integers=array.new_int(2,1)
floats=array.new_float(2,1.25)
plot(${family === 'receiver' ? 'choose(integers)' : 'choose(integers, 2)'},"Int")
plot(${family === 'receiver' ? 'choose(floats)' : 'choose(integers, 2.5)'},"Float")`;
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars);
        expect(result).toBeDefined();
        expect(result!.errors).toEqual([]);
        expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(result!.plots.find((p) => p.title === 'Int')?.values).toEqual(
          family === 'receiver' ? [11, 11, 11] : [17, 17, 17],
        );
        expect(result!.plots.find((p) => p.title === 'Float')?.values).toEqual(
          family === 'receiver' ? [-13, -13, -13] : [-19, -19, -19],
        );
      });
    }
});
