import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
// UDT.copy shares drawing references; it does not call drawing.copy.
describe('Shallow UDT line and box fields retain references', () => {
  for (const kind of ['line', 'box']) {
    for (const method of [false, true]) {
      it(`${kind}, method=${method}`, () => {
        const create = (value: number) => kind === 'line' ? `line.new(0, ${value}, 1, ${value})` : `box.new(0, ${value}, 1, 0)`;
        const read = (reference: string) => `${kind}.${kind === 'line' ? 'get_y1' : 'get_top'}(${reference})`;
        const set = (reference: string, value: number) => `${kind}.${kind === 'line' ? 'set_y1' : 'set_top'}(${reference}, ${value})`;
        const result = runCompatScript(`//@version=6
indicator("Copied drawing fields")
type Holder
    ${kind} drawing
    int count
external = ${create(7)}
original = Holder.new(external, 4)
copied = ${method ? 'original.copy()' : 'Holder.copy(original)'}
copied.count := 9
${set('copied.drawing', 11)}
plot(original.count, "OriginalCount")
plot(copied.count, "CopiedCount")
plot(${read('original.drawing')}, "SharedOriginal")
plot(${read('external')}, "SharedExternal")
copied.drawing := ${create(17)}
${set('original.drawing', 23)}
plot(${read('original.drawing')}, "OriginalAfterReplacement")
plot(${read('copied.drawing')}, "CopiedAfterReplacement")
original.drawing := ${create(29)}
${set('external', 31)}
plot(${read('original.drawing')}, "OriginalNewDrawing")
plot(${read('copied.drawing')}, "CopiedUnaffected")
plot(${read('external')}, "OldDrawing")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { OriginalCount: 4, CopiedCount: 9, SharedOriginal: 11, SharedExternal: 11, OriginalAfterReplacement: 23, CopiedAfterReplacement: 17, OriginalNewDrawing: 29, CopiedUnaffected: 17, OldDrawing: 31 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
