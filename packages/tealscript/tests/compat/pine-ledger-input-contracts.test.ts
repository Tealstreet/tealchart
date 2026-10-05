import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

// Inputs manual and v5 migration guide: ledger ranks 55 and 69.
const bars: Bar[] = [{ time: 1_700_000_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 }];

describe('documented integer input overloads', () => {
  for (const [name, argumentsSource, bounds] of [
    ['options', '[1, 3, 5]', { options: [1, 3, 5] }],
    ['range', '1, 5, 2', { minval: 1, maxval: 5, step: 2 }],
  ] as const) {
    it(`binds every positional ${name} metadata slot`, () => {
      const program = parse(`//@version=6\nindicator("Positional input")\nlength = input.int(3, "Length", ${argumentsSource}, "Help", "row", "Group", true, display.data_window, false)\nplot(length)`);
      expect(checkProgram(program).diagnostics).toEqual([]);
      const result = executeScript(program, bars);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toEqual([expect.objectContaining({
        type: 'int', title: 'Length', defval: 3, tooltip: 'Help', inline: 'row', group: 'Group', confirm: true, display: 2, active: false, ...bounds,
      })]);
      expect(result.plots[0]?.values).toEqual([3]);
    });
  }
  for (const parameter of ['minval', 'maxval', 'step']) {
    it(`refuses options combined with ${parameter}`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("Mixed overload")\nlength = input.int(3, options=[1, 3, 5], ${parameter}=1)`));
      expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'invalid-overload', message: expect.stringContaining(parameter) })]);
    });
  }
});
