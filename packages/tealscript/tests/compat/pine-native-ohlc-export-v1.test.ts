import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Native coverage-plot-1-v1.csv bars 0..10 export supplied fields independently.
// These are data/export witnesses; CSV cannot certify rendered normalization.
// The captured High header omits its closing parenthesis; preserve that spelling.
function replayFirstCasePeriod() {
  const root = new URL('../../oracle-probes/v2/', import.meta.url);
  const source = readFileSync(new URL('coverage-plot-1-v1.pine', root), 'utf8');
  const csv = readFileSync(new URL('captures/v2/coverage-plot-1-v1.csv', root), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(
    'ad144f7e00532bbc01cd761e92bc114eaba819dc52afd7e41fde09ea062e0e49',
  );
  expect(createHash('sha256').update(csv).digest('hex')).toBe(
    '848660dc5530fa1b6df1a2156b687ed8ca9e0e028573b1da2debca5dfcfd8f19',
  );
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const rows = lines.slice(0, 11).map((line) => line.split(','));
  expect(rows).toHaveLength(11);
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

describe('native custom OHLC field exports', () => {
  for (const family of ['plotbar', 'plotcandle'] as const) {
    for (const mode of ['constant', 'dynamic'] as const) {
      const channels = mode === 'constant' ? (['high', 'low'] as const) : (['open', 'high', 'low', 'close'] as const);
      for (const channel of channels) {
        it(`exports ${family} ${mode} ${channel} exactly as native CSV bars 0..10`, () => {
          const { result, rows, columns } = replayFirstCasePeriod();
          const title = `${family}_${mode}_actual`;
          const suffix = { open: ' (Open)', high: ' (High', low: ' (Low)', close: ' (Close)' }[channel];
          const column = columns.indexOf(title + suffix);
          expect(column).toBeGreaterThanOrEqual(0);
          const expected = rows.map((row) => (row[column] === '' ? null : Number(row[column])));
          const field = { open: 'openValues', high: 'highValues', low: 'lowValues', close: 'closeValues' } as const;
          expect(getPlot(result, title)[field[channel]]).toEqual(expected);
        });
      }
    }
  }
});
