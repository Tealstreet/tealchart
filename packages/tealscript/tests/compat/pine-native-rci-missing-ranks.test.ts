import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url), 'utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 71).map((line) => line.split(','));
const bars: Bar[] = rows.map((row) => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: 10 }));

// Native coverage-ta-2-v1.csv: leading NA and the complete hole/recovery interval.
describe('native RCI missing rank slots', () => {
  it.each([
    ['later holes', 'bar_index == 40 or bar_index == 41', 'rci_len14_hole40_41'],
    ['leading seed', 'bar_index < 5', 'rci_len14_lead0_4'],
  ])('matches captured %s values and the clean control', (_label, missing, column) => {
    const result = executeScript(parse(`//@version=6
indicator("Native RCI missing ranks")
source = ${missing} ? na : close
plot(ta.rci(source, 14))
plot(ta.rci(close, 14))`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(2);
    [column, 'rci_len14_clean'].forEach((name, plotIndex) => {
      expect(result.plots[plotIndex].values).toHaveLength(rows.length);
      result.plots[plotIndex].values.forEach((value, index) => {
        const native = rows[index][headers.indexOf(name)];
        if (native === '') expect(value, `${name} bar ${index}`).toBeNull();
        else {
          expect(value, `${name} bar ${index}`).not.toBeNull();
          expect(value, `${name} bar ${index}`).toBeCloseTo(Number(native), 8);
        }
      });
    });
  });
});
