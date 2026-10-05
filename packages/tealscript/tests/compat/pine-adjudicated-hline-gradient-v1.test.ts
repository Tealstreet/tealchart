import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Native CF011: oracle-probes/v2/captures/v2/conflicts-batch-8-v1.csv proves admission.
// evidence/conflicts-batch-8-v1-attempt1-visual.png proves the vertical gradient.
// Explicit color literals isolate lowering from the separately owned CF009 palette.
describe('native-adjudicated hline gradient fill', () => {
  for (const [binding, call] of [
    ['positional', 'fill(upper, lower, 100, 0, #F23645, #2962FF, "Levels", display.all, false, false)'],
    [
      'named',
      'fill(hline1=upper, hline2=lower, top_value=100, bottom_value=0, top_color=#F23645, bottom_color=#2962FF, title="Levels", display=display.all, fillgaps=false, editable=false)',
    ],
  ]) {
    it(`lowers ${binding} hline handles to the agreed gradient payload`, () => {
      const source = `//@version=6\nindicator("Native hline gradient")\nupper = hline(100)\nlower = hline(0)\n${call}`;
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
        [],
      );
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const [upper, lower] = result.plots.filter((plot) => plot.type === 'hline');
      const fill = getPlot(result, 'Levels');
      expect(fill).toMatchObject({
        type: 'fill',
        plot1Id: upper.id,
        plot2Id: lower.id,
        editable: false,
        display: 31,
        fillgaps: false,
        color: [],
        values: compatibilityBars.map(() => 1),
        gradient: {
          topValues: compatibilityBars.map(() => 100),
          bottomValues: compatibilityBars.map(() => 0),
          topColors: compatibilityBars.map(() => '#F23645'),
          bottomColors: compatibilityBars.map(() => '#2962FF'),
        },
      });
    });
  }

  it('replays every historical CF011 native CSV row and emits hline gradient stops', () => {
    const probe = 'conflicts-batch-8-v1.pine';
    const root = new URL('../../oracle-probes/v2/', import.meta.url);
    const source = readFileSync(new URL(`outcome-only/${probe}`, root), 'utf8');
    const csv = readFileSync(new URL('captures/v2/conflicts-batch-8-v1.csv', root), 'utf8');
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
      'CF011_hline_gradient_accepted',
    ]) {
      const column = columns.indexOf(title);
      expect(column, title).toBeGreaterThanOrEqual(0);
      expect(getPlot(result, title).values, title).toEqual(rows.map((row) => row[column]));
    }
    const [upper, lower] = result.plots.filter((plot) => plot.type === 'hline');
    const fill = result.plots.find((plot) => plot.type === 'fill');
    expect(fill).toMatchObject({ plot1Id: upper.id, plot2Id: lower.id, color: [], values: rows.map(() => 1) });
    expect(fill?.gradient?.topValues).toEqual(rows.map(() => 100));
    expect(fill?.gradient?.bottomValues).toEqual(rows.map(() => 0));
    expect(fill?.gradient?.topColors).toHaveLength(rows.length);
    expect(fill?.gradient?.bottomColors).toHaveLength(rows.length);
  }, 20_000);
});
