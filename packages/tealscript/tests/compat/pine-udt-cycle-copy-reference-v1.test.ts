import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
describe('Shallow UDT copies preserve cyclic reference fields', () => {
  for (const method of [false,true]) {
    it(`self link method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Cyclic UDT shallow copy")
type Node
    int value
    Node next
original = Node.new(7)
original.next := original
copied = ${method ? 'original.copy()' : 'Node.copy(original)'}
copied.value := 13
plot(original.value,"OriginalScalar")
plot(copied.value,"CopiedScalar")
plot(copied.next.value,"OriginalViaCopiedLink")
copied.next.value := 17
plot(original.value,"SharedOriginal")
plot(original.next.value,"OriginalSelfLink")
plot(copied.value,"IndependentScalar")
copied.next := Node.new(23)
original.value := 29
plot(original.next.value,"RetainedSelfLink")
plot(copied.next.value,"DetachedLink")
plot(na(copied.next.next) ? 1 : 0,"DetachedMissingLink")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({OriginalScalar:7,CopiedScalar:13,OriginalViaCopiedLink:7,SharedOriginal:17,OriginalSelfLink:17,IndependentScalar:13,RetainedSelfLink:29,DetachedLink:23,DetachedMissingLink:1})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
