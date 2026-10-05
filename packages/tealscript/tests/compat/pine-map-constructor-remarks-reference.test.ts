import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('map.new return and replacement remarks', () => {
  // Ledger ranks757–759; https://www.tradingview.com/pine-script-docs/language/maps/
  it.each([
    ['string', 'float'],
    ['int', 'bool'],
    ['bool', 'string'],
  ])('infers map<%s, %s> without an explicit annotation', (key, value) => {
    const result = checkProgram(parse(`//@version=6\nindicator("Typed map")\nm = map.new<${key}, ${value}>()\n`));
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'm')?.type).toMatchObject({
      kind: 'map',
      qualifier: 'series',
      keyType: { kind: key },
      valueType: { kind: value },
    });
  });

  it('replaces an existing key without changing size or insertion order', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Map replacement")
m = map.new<string, int>()
map.put(m, "Zulu", 17)
m.put("Alpha", -8)
map.put(m, "Middle", 43)
previous = m.put("Alpha", 29)
keys = map.keys(m)
values = m.values()
plot(previous, title="Previous")
plot(map.size(m), title="Size")
plot(m.get("Alpha"), title="Replacement")
plot(array.get(keys, 0) == "Zulu" and array.get(keys, 1) == "Alpha" and array.get(keys, 2) == "Middle" ? 1 : 0, title="Order")
plot(array.get(values, 0), title="First")
plot(array.get(values, 1), title="Second")
plot(array.get(values, 2), title="Third")
`,
      { bars: [{ time: 60_000, open: 10, high: 12, low: 8, close: 11, volume: 100 }] },
    );
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['Previous', -8],
      ['Size', 3],
      ['Replacement', 29],
      ['Order', 1],
      ['First', 17],
      ['Second', 29],
      ['Third', 43],
    ] as const) {
      expect(getPlot(result, title).values).toEqual([value]);
    }
  });
});
