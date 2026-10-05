import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('documented round_to_mintick migration', () => {
  for (const version of [4, 5, 6]) {
    for (const named of [false, true]) {
      it(`binds ${named ? (version === 4 ? 'x' : 'number') : 'positional'} in v${version}`, () => {
        const source = `//@version=${version}
${version === 4 ? 'study' : 'indicator'}("mintick migration")
plot(${version === 4 ? '' : 'math.'}round_to_mintick(${named ? (version === 4 ? 'x=' : 'number=') : ''}1.37))
`;
        expect(checkProgram(parse(source)).diagnostics).toEqual([]);
        const result = executeScript(parse(source), bars, undefined, { runtime: { syminfo: { mintick: 0.25 } } });
        expect(result.errors).toEqual([]);
        expect(result.plots[0]?.values).toEqual([1.25]);
      });
    }
  }
  for (const version of [5, 6]) {
    it(`refuses migrated global round_to_mintick in v${version}`, () => {
      const checked = checkProgram(parse(`//@version=${version}
indicator("legacy mintick")
plot(round_to_mintick(1.37))
`));
      expect(checked.diagnostics).toContainEqual(expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('Use math.round_to_mintick()') }));
    });
    it(`refuses legacy x slot on modern round_to_mintick in v${version}`, () => {
      const checked = checkProgram(parse(`//@version=${version}
indicator("legacy mintick slot")
plot(math.round_to_mintick(x=1.37))
`));
      expect(checked.diagnostics).toContainEqual(expect.objectContaining({ code: 'unknown-argument', message: expect.stringContaining("Unknown argument 'x'") }));
    });
  }
});
