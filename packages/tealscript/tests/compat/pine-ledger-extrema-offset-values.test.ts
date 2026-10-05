import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [5, 4, 8, 3, 7].map((close, index) => ({ time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));

describe('documented extrema offset migration and missing sources', () => {
  for (const name of ['highestbars', 'lowestbars']) {
    for (const version of [4, 5, 6]) {
      it(`uses ${version === 4 ? 'global' : 'ta'} ${name} in v${version}`, () => {
        const source = `//@version=${version}
${version === 4 ? 'study' : 'indicator'}("offset migration")
plot(${version === 4 ? '' : 'ta.'}${name}(3))
`;
        expect(checkProgram(parse(source)).diagnostics).toEqual([]);
        const result = executeScript(parse(source), bars);
        expect(result.errors).toEqual([]);
        expect(result.plots[0]?.values).toHaveLength(5);
        expect(result.plots[0]?.values[4]).toBe(name === 'highestbars' ? -2 : -1);
      });
    }
    for (const version of [5, 6]) {
      it(`refuses migrated global ${name} in v${version}`, () => {
        const result = checkProgram(parse(`//@version=${version}
indicator("old offset")
plot(${name}(3))
`));
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining(`Use ta.${name}()`) }));
      });
    }
  }
  it('ignores an unavailable source when locating a preceding minimum', () => {
    const result = executeScript(parse(`//@version=6
indicator("lowest offset missing")
source = bar_index == 2 ? float(na) : close
plot(ta.lowestbars(source, 3))
`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toHaveLength(5);
    expect(result.plots[0]?.values[4]).toBe(-1);
  });
});
