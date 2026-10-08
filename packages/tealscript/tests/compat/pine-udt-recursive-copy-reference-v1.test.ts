import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/type-system/#user-defined-types
// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
describe('Same-type UDT links retain shallow copy references', () => {
  for (const method of [false, true]) {
    it(`bounded recursive field, method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Same type links")
type Node
    int value = 7
    Node next
head = Node.new(11)
tail = Node.new(23)
plot(na(head.next) ? 1 : 0, "HeadDefaultMissing")
plot(na(tail.next) ? 1 : 0, "TailDefaultMissing")
head.next := tail
copied = ${method ? 'head.copy()' : 'Node.copy(head)'}
copied.value := 31
copied.next.value := 41
plot(head.value, "OriginalValue")
plot(copied.value, "CopiedValue")
plot(head.next.value, "SharedOriginalLink")
plot(tail.value, "SharedExternalTail")
copied.next := Node.new(53)
tail.value := 61
plot(head.next.value, "OriginalRetainedLink")
plot(copied.next.value, "CopiedReplacement")
head.next := na
plot(na(head.next) ? 1 : 0, "OriginalMissingAgain")
plot(copied.next.value, "CopiedUnaffected")
plot(na(copied.next.next) ? 1 : 0, "ReplacementDefaultMissing")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { HeadDefaultMissing: 1, TailDefaultMissing: 1, OriginalValue: 11, CopiedValue: 31, SharedOriginalLink: 41, SharedExternalTail: 41, OriginalRetainedLink: 61, CopiedReplacement: 53, OriginalMissingAgain: 1, CopiedUnaffected: 53, ReplacementDefaultMissing: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
