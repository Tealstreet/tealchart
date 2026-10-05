import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Table reference: deleting an already deleted object does nothing.
describe('ledger944 table deletion idempotence', () => {
  it.each(['table.delete(drop)', 'drop.delete()'])(
    'preserves another table through repeated and missing-ID deletion: %s',
    (remove) => {
      const result = runCompatScript(`//@version=6
indicator("Repeated table deletion", overlay=true)
if barstate.islast
    keep = table.new(position.top_right, 1, 1)
    drop = table.new(position.bottom_left, 1, 1)
    table.cell(keep, 0, 0, "keep")
    ${remove}
    ${remove}
    table missing = na
    ${remove.replaceAll('drop', 'missing')}
plot(array.size(table.all), "remaining")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'remaining').values).toEqual(
        compatibilityBars.map((_, index) => (index === compatibilityBars.length - 1 ? 1 : 0)),
      );
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings[0]).toMatchObject({ type: 'table', position: 'top_right', cells: [{ text: 'keep' }] });
    },
  );
});
