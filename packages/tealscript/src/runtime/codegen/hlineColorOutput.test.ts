import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

it('keeps an explicit na hline color hidden and defaults only omitted color', () => {
  const result = executeScript(parse(`//@version=6
indicator("Levels")
hline(110, "Hidden", color=na)
hline(100, "Default")`), [{ time: 1000, open: 105, high: 112, low: 100, close: 110, volume: 1 }]);
  expect(result.plots[0].color).toEqual([]);
  expect(result.plots[1].color).toBe('#787B86');
});
