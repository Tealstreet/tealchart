import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/';

describe(`Ledger gap542: ${reference} variables[127]`, () => {
  it('identifies dataset index zero on new and updated realtime bars', () => {
    for (const isNew of [true, false]) {
      const first = runCompatScript(`//@version=6
indicator("Realtime dataset first")
plot(barstate.isfirst ? 1 : 0, title="First")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
`, { bars: compatibilityBars.slice(0, 1), engineOptions: { realtimeLastBar: { isNew } } });
      expect(first.errors).toEqual([]);
      expect(getPlot(first, 'First').values).toEqual([1]);
      expect(getPlot(first, 'Realtime').values).toEqual([1]);
      const later = runCompatScript(`//@version=6
indicator("Realtime later bar")
plot(barstate.isfirst ? 1 : 0, title="First")
`, { bars: compatibilityBars.slice(0, 2), engineOptions: { realtimeLastBar: { isNew } } });
      expect(later.errors).toEqual([]);
      expect(getPlot(later, 'First').values).toEqual([1, 0]);
    }
  });
});

describe(`Ledger gap553: ${reference} constants[177] remarks[0]`, () => {
  it('preserves data-window plus status-line and all-minus-data-window display masks', () => {
    const result = runCompatScript(`//@version=6
indicator("Display combinations")
plot(close, title="Data", display=display.data_window)
plot(close, title="Status", display=display.status_line)
plot(close, title="All", display=display.all)
plot(close, title="Combined", display=display.data_window + display.status_line)
plot(close, title="Excluded", display=display.all - display.data_window)
`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    const data = getPlot(result, 'Data').display!;
    const status = getPlot(result, 'Status').display!;
    const all = getPlot(result, 'All').display!;
    expect(data).not.toBe(0);
    expect(data).not.toBe(status);
    expect(getPlot(result, 'Combined').display).toBe(data + status);
    expect(getPlot(result, 'Excluded').display).toBe(all - data);
    expect(getPlot(result, 'Combined').values).toEqual([102]);
    expect(getPlot(result, 'Excluded').values).toEqual([102]);
  });
});
