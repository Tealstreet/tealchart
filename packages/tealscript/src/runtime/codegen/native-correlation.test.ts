import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Correlation } from './ta-classes';

const capture = new URL('../../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url);
const [header, ...records] = readFileSync(capture, 'utf8').trim().split('\n');
const columns = header.split(',');
const rows = records.map((record) => record.split(','));
const value = (bar: number, column: string) => Number(rows[bar][columns.indexOf(column)]);
const expectNative = (actual: number, bar: number) => {
  const expected = value(bar, 'correlation_close_open_len14_hole40_41');
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(expected)));
};

describe('native correlation independent source windows', () => {
  it.each(['clean', 'hole40_41', 'lead0_4'])('matches every captured %s raw-moment result exactly', (source) => {
    const correlation = new Correlation(14);
    for (let bar = 0; bar < rows.length - 1; bar++) {
      const missing = source === 'hole40_41' && (bar === 40 || bar === 41) || source === 'lead0_4' && bar < 5;
      const actual = correlation.compute(missing ? NaN : value(bar, 'close'), value(bar, 'open'));
      const cell = rows[bar][columns.indexOf(`correlation_close_open_len14_${source}`)];
      expect(actual).toBe(cell === '' ? NaN : Number(cell));
    }
  });

  it('matches the captured independent-window transition at bars 40..51', () => {
    const correlation = new Correlation(14);
    for (let bar = 0; bar <= 51; bar++) {
      const actual = correlation.compute(bar === 40 || bar === 41 ? NaN : value(bar, 'close'), value(bar, 'open'));
      if (bar >= 40) expectNative(actual, bar);
    }
  });

  it('restores the independently advancing right window on realtime re-entry at bar 40', () => {
    const correlation = new Correlation(14);
    for (let bar = 0; bar < 40; bar++) correlation.compute(value(bar, 'close'), value(bar, 'open'));
    correlation.compute(NaN, value(40, 'open') + 1000);
    expectNative(correlation.recompute(NaN, value(40, 'open')), 40);
  });
});
