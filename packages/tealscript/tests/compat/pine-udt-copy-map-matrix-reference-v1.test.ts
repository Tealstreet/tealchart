import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
describe('UDT copies share collection referents with independent fields', () => {
  for (const family of ['map', 'matrix']) {
    for (const method of [false, true]) {
      it(`${family}, method=${method}`, () => {
        const map = family === 'map';
        const create = map ? 'data = map.new<string, int>()\ndata.put("key", 3)' : 'data = matrix.new<int>(1, 2, 3)';
        const set = (receiver: string, value: number) => map ? `${receiver}.put("key", ${value})` : `${receiver}.set(0, 0, ${value})`;
        const get = (receiver: string) => map ? `${receiver}.get("key")` : `${receiver}.get(0, 0)`;
        const replacement = map ? 'replacement = map.new<string, int>()\nreplacement.put("key", 88)' : 'replacement = matrix.new<int>(1, 2, 88)';
        const result = runCompatScript(`//@version=6
indicator("Copied collection field")
type Holder
    int value
    ${map ? 'map<string, int>' : 'matrix<int>'} data
${create}
original = Holder.new(17, data)
copied = ${method ? 'original.copy()' : 'Holder.copy(original)'}
${set('copied.data', 71)}
plot(${get('original.data')}, "OriginalShared")
plot(${get('data')}, "ExternalShared")
copied.value := 29
plot(original.value, "OriginalScalar")
plot(copied.value, "CopiedScalar")
${replacement}
copied.data := replacement
${set('original.data', 99)}
plot(${get('original.data')}, "OriginalRetained")
plot(${get('data')}, "ExternalRetained")
plot(${get('copied.data')}, "CopiedReplacement")
original.data := ${map ? 'map.new<string, int>()' : 'matrix.new<int>(1, 2, -7)'}
${map ? 'original.data.put("key", -7)' : ''}
plot(${get('original.data')}, "OriginalReplacement")
plot(${get('copied.data')}, "CopyRetained")
plot(${get('data')}, "ExternalUnaffected")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        const expected = { OriginalShared: 71, ExternalShared: 71, OriginalScalar: 17, CopiedScalar: 29, OriginalRetained: 99, ExternalRetained: 99, CopiedReplacement: 88, OriginalReplacement: -7, CopyRetained: 88, ExternalUnaffected: 99 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
