import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native CSV: oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv, bars0..14.
// The first native RCI value is published at bar14, one bar after a full window.
const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url), 'utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 65).map((line) => line.split(','));
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
  low: Number(row[3]), close: Number(row[4]), volume: 10,
}));

describe('native RCI startup availability', () => {
  it('keeps bar13 missing and publishes the native fourteen-slot rank at bar14', () => {
    const result = executeScript(parse('//@version=6\nindicator("Native RCI startup")\nplot(ta.rci(close, 14))'), bars.slice(0, 15));
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    for (let index = 0; index < 15; index += 1) {
      const expected = rows[index][headers.indexOf('rci_len14_clean')];
      if (expected === '') expect(result.plots[0].values[index], `native bar ${index}`).toBeNull();
      else expect(result.plots[0].values[index], `native bar ${index}`).toBeCloseTo(Number(expected), 10);
    }
  });
});
