import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.concat
describe('UDT array concat retains destination identity at empty boundaries', () => {
  for (const namespace of [false, true]) for (const emptyDestination of [false, true]) {
    it(`${namespace ? 'namespace' : 'receiver'} empty ${emptyDestination ? 'destination' : 'source'}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT empty concat")
type Cell
    int value
cell = Cell.new(7)
a = ${emptyDestination ? 'array.new<Cell>()' : 'array.from(cell)'}
b = ${emptyDestination ? 'array.from(cell)' : 'array.new<Cell>()'}
joined = ${namespace ? 'array.concat(id2=b, id1=a)' : 'a.concat(b)'}
shared = joined.get(0)
shared.value := 17
plot(a.size(), "DestinationSize")
plot(b.size(), "SourceSize")
plot(cell.value, "SharedField")
joined.set(0, Cell.new(100))
plot(a.get(0).value, "DestinationSlot")
plot(${emptyDestination ? 'b.get(0).value' : 'b.size()'}, "SourceAfterReplacement")
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, value] of Object.entries({
        DestinationSize: 1, SourceSize: emptyDestination ? 1 : 0, SharedField: 17,
        DestinationSlot: 100, SourceAfterReplacement: emptyDestination ? 17 : 0,
      })) expect(getPlot(result, title).values, title).toEqual([value, value, value]);
    });
  }
});
