import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { StdDev, Variance } from './ta-classes';

const capture = new URL('../../../oracle-probes/v2/captures/v2/primitives-sma-stdev-v1-attempt2.csv', import.meta.url);
const [header, ...records] = readFileSync(capture, 'utf8').trim().split('\n');
const columns = header.split(',');
const rows = records.map((record) => record.split(','));
const value = (row: string[], column: string) => row[columns.indexOf(column)] === '' ? NaN : Number(row[columns.indexOf(column)]);

describe('native TradingView moment arithmetic', () => {
  it('matches the native length-two cancellation over chart bars 0..127', () => {
    const stdev = new StdDev(2);
    for (const row of rows.slice(0, 128)) {
      const actual = stdev.compute(value(row, 'close'));
      const expected = value(row, 'stdev_population_len2_close_clean');
      if (Number.isNaN(expected)) expect(actual).toBeNaN();
      else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(expected)));
    }
  });

  it('preserves native translation cancellation at chart bar 13', () => {
    const stdev = new StdDev(14);
    let actual = NaN;
    for (let bar = 0; bar <= 13; bar++) {
      const wave = 50 + bar % 11 * 0.25 + (bar % 3 === 0 ? 0.125 : -0.375);
      actual = stdev.compute(100000000 + wave);
    }
    expect(actual).toBe(value(rows[13], 'stdev_population_len14_shifted_wave_clean'));
  });

  it('restores both moment state and missing-source history before re-entry', () => {
    const stdev = new StdDev(2);
    const variance = new Variance(2);
    const first = value(rows[0], 'close');
    const second = value(rows[1], 'close');
    stdev.compute(first);
    variance.compute(first);
    stdev.compute(NaN);
    variance.compute(NaN);
    const expected = value(rows[1], 'stdev_population_len2_close_clean');
    expect(stdev.recompute(second)).toBeCloseTo(expected, 8);
    expect(variance.recompute(second)).toBeCloseTo(expected * expected, 5);
  });
});
