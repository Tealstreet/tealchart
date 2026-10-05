import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Maps manual: putting/getting pairs preserves value object references and insertion order.
describe('ledger gaps 24 collection witnesses', () => {
  it.each(['map.put(values, "A", item)', 'values.put("A", item)'])(
    'shares the inserted UDT with its source: %s (931)',
    (put) => {
      const result = runCompatScript(`//@version=6
indicator("Shared map value")
type Payload
    float value
item = Payload.new(7)
values = map.new<string, Payload>()
${put}
item.value := 42
held = values.get("A")
plot(held.value, "shared")
held.value := -3
plot(item.value, "source")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'shared').values).toEqual(compatibilityBars.map(() => 42));
      expect(getPlot(result, 'source').values).toEqual(compatibilityBars.map(() => -3));
    },
  );

  it.each(['map.put(values, "B", 22)', 'values.put("B", 22)'])(
    'retains insertion order when replacing a key: %s (933/934)',
    (put) => {
      const result = runCompatScript(`//@version=6
indicator("Map replacement order")
values = map.new<string, int>()
values.put("A", 1)
values.put("B", 2)
values.put("C", 3)
previous = ${put}
keys = values.keys()
entries = values.values()
plot(previous, "previous")
plot(array.get(keys, 0) == "A" and array.get(keys, 1) == "B" and array.get(keys, 2) == "C" ? 1 : 0, "order")
plot(array.get(entries, 1), "replacement")
plot(values.size(), "size")`);
      expect(result.errors).toEqual([]);
      for (const [title, value] of [
        ['previous', 2],
        ['order', 1],
        ['replacement', 22],
        ['size', 3],
      ] as const) {
        expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => value));
      }
    },
  );

  it('array.abs returns absolute values from negative members (941)', () => {
    const result = runCompatScript(`//@version=6
indicator("Absolute array")
values = array.from(-3.5, 0.0, -2.25)
absolute = array.abs(values)
plot(array.get(absolute, 0), "first")
plot(array.get(absolute, 1), "zero")
plot(array.get(absolute, 2), "last")
plot(array.get(values, 0), "source")`);
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['first', 3.5],
      ['zero', 0],
      ['last', 2.25],
      ['source', -3.5],
    ] as const) {
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => value));
    }
  });
});
