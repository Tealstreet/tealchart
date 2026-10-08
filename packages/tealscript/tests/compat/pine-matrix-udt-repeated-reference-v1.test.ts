import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/
describe('matrix permutations preserve repeated UDT references', () => {
  for (const reverse of [false, true]) for (const receiver of [false, true]) {
    it(`${reverse ? 'reverse' : 'reshape'} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = reverse ? (receiver ? 'm.reverse()' : 'matrix.reverse(m)') :
        (receiver ? 'm.reshape(1, 4)' : 'matrix.reshape(m, 1, 4)');
      const columns = reverse ? 2 : 4;
      const order = reverse ? [13, 7, 11, 7] : [7, 11, 7, 13];
      const sharedSlots = reverse ? [1, 3] : [0, 2];
      const at = (slot: number) => `m.get(${Math.floor(slot / columns)}, ${slot % columns})`;
      const result = runCompatScript(`//@version=6
indicator("Repeated matrix references")
type Cell
    int value
shared = Cell.new(7)
m = matrix.new<Cell>(2, 2)
m.set(0, 0, shared)
m.set(0, 1, Cell.new(11))
m.set(1, 0, shared)
m.set(1, 1, Cell.new(13))
${call}
${order.map((_, i) => `plot(${at(i)}.value, "Slot${i}")`).join('\n')}
shared.value := 17
plot(${at(sharedSlots[0])}.value, "SharedA")
plot(${at(sharedSlots[1])}.value, "SharedB")
m.set(${Math.floor(sharedSlots[0] / columns)}, ${sharedSlots[0] % columns}, Cell.new(100))
plot(${at(sharedSlots[0])}.value, "Replacement")
plot(${at(sharedSlots[1])}.value, "Retained")
plot(shared.value, "External")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      order.forEach((value, i) => expect(getPlot(result, `Slot${i}`).values).toEqual([value]));
      for (const [title, value] of Object.entries({ SharedA: 17, SharedB: 17, Replacement: 100,
        Retained: 17, External: 17, Rows: reverse ? 2 : 1, Columns: columns })) {
        expect(getPlot(result, title).values, title).toEqual([value]);
      }
    });
  }
});
