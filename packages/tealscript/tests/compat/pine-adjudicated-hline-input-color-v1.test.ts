import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Native CF010 batch7 proves hline(input.color(...)) admission.
// Replays the unchanged source and all historical control/sentinel rows.
describe('native-adjudicated hline input color', () => {
  it('replays every historical CF010 native CSV row and admits input color', () => {
    const probe = 'conflicts-batch-7-v1.pine';
    const root = new URL('../../oracle-probes/v2/', import.meta.url);
    const source = readFileSync(new URL(`outcome-only/${probe}`, root), 'utf8');
    const csv = readFileSync(new URL('captures/v2/conflicts-batch-7-v1.csv', root), 'utf8');
    const manifest = JSON.parse(readFileSync(new URL('captures/v2/manifest-v2.json', root), 'utf8'));
    const capture = manifest.captures.find((entry: { probe: string }) => entry.probe === probe);
    expect(createHash('sha256').update(source).digest('hex')).toBe(capture.source_sha256);
    expect(createHash('sha256').update(csv).digest('hex')).toBe(capture.export_sha256);
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const columns = header.split(',');
    const allRows = lines.map((line) => line.split(',').map(Number));
    expect(allRows).toHaveLength(capture.row_count);
    const rows = allRows.filter((row) => row[0] < capture.historical_compare_before_unix_seconds);
    expect(rows).toHaveLength(capture.historical_rows);
    // Native export omits volume, and the immutable probe never reads it.
    const bars: Bar[] = rows.map(([time, open, high, low, close]) => ({
      time: time * 1000,
      open,
      high,
      low,
      close,
      volume: NaN,
    }));
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, {
      bars,
      engineOptions: {
        runtime: {
          syminfo: { ticker: 'BTCUSDT', tickerid: capture.tickerid, mintick: 0.01, timezone: capture.timezone },
          timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
        },
      },
    });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const title of [
      'CTRL_time',
      'CTRL_bar_index',
      'CTRL_close',
      'CTRL_mintick',
      'CTRL_BTCUSDT_2m',
      'CF010_input_color_accepted',
    ]) {
      const column = columns.indexOf(title);
      expect(column, title).toBeGreaterThanOrEqual(0);
      expect(getPlot(result, title).values, title).toEqual(rows.map((row) => row[column]));
    }
    const hline = result.plots.find((plot) => plot.type === 'hline');
    expect(hline).toMatchObject({ price: 20, color: '#F23645' });
    expect(result.inputs.find((input) => input.title === 'Hline input color')?.defval).toBe('#F23645');
  }, 20_000);
});
