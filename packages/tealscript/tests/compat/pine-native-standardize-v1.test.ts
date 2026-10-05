import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Native coverage-collections-2-v1.csv bars 0..42 distinguish empty arrays
// from three missing standardized elements using the captured 2001 sentinel.
function replayStandardizeRows() {
  const root = new URL('../../oracle-probes/v2/', import.meta.url);
  const source = readFileSync(new URL('coverage-collections-2-v1.pine', root), 'utf8');
  const csv = readFileSync(new URL('captures/v2/coverage-collections-2-v1.csv', root), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(
    '0b7b9afb6c0b7073a86ebe747a686e783c83708ebb8936f4f1d0c2cb7bff5bb6',
  );
  expect(createHash('sha256').update(csv).digest('hex')).toBe(
    'bc1b3d1395730dab05bccffed34f0e23cac482df9d5e7f3c240f971900cee21d',
  );
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const rows = lines.slice(0, 43).map((line) => line.split(','));
  expect(rows).toHaveLength(43);
  const volumeColumn = columns.indexOf('input_volume');
  expect(volumeColumn).toBeGreaterThanOrEqual(0);
  const bars: Bar[] = rows.map(([time, open, high, low, close], i) => ({
    time: Number(time) * 1000,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(rows[i][volumeColumn]),
  }));
  const result = runCompatScript(source, {
    bars,
    engineOptions: {
      runtime: {
        syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', mintick: 0.01, timezone: 'Etc/UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    },
  });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'input_bar_index').values).toEqual(rows.map((_, i) => i));
  return { result, rows, columns };
}

describe('native all-missing array standardization', () => {
  for (const channel of ['array_standardize_hole97', 'array_standardize_warm0_7']) {
    it(`exports ${channel} exactly as native CSV bars 0..42`, () => {
      const { result, rows, columns } = replayStandardizeRows();
      const column = columns.indexOf(channel);
      expect(column).toBeGreaterThanOrEqual(0);
      const expected = rows.map((row) => (row[column] === '' ? null : Number(row[column])));
      expect(getPlot(result, channel).values).toEqual(expected);
    });
  }

  for (const call of ['array.standardize(source)', 'source.standardize()']) {
    it(`preserves three missing elements with ${call} and keeps empty arrays empty`, () => {
      const result = runCompatScript(`//@version=6
indicator("Missing standardize")
source = array.new<float>(3, na)
standardized = ${call}
empty = array.standardize(array.new<float>())
plot(array.size(standardized), "size")
plot(array.size(standardized) > 1 ? nz(array.get(standardized, 1), -999) : -1, "middle")
plot(array.size(empty), "empty")
array.push(standardized, 17.0)
plot(array.size(standardized), "pushed size")
plot(array.get(standardized, 3), "tail")
plot(array.size(source), "source size")
plot(na(array.get(source, 0)) ? 1 : 0, "source unavailable")
`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'size').values).toEqual(Array(12).fill(3));
      expect(getPlot(result, 'middle').values).toEqual(Array(12).fill(-999));
      expect(getPlot(result, 'empty').values).toEqual(Array(12).fill(0));
      expect(getPlot(result, 'pushed size').values).toEqual(Array(12).fill(4));
      expect(getPlot(result, 'tail').values).toEqual(Array(12).fill(17));
      expect(getPlot(result, 'source size').values).toEqual(Array(12).fill(3));
      expect(getPlot(result, 'source unavailable').values).toEqual(Array(12).fill(1));
    });
  }
});
