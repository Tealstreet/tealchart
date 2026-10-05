import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: request.footprint.
// Official other-timeframes-and-data, requesting-footprints-on-other-datasets:
// footprint-dependent request.security expressions calculate on the requested dataset.
describe('ledger828: nested footprint provider', () => {
  it('routes a nested-only footprint to the requested symbol and timeframe', () => {
    const bars = [7, 8].map((close, index) => ({
      time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
    }));
    const datafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST:OTHER', timeframe: '1', bars }]);
    const provider = vi.spyOn(datafeed, 'getFootprint').mockImplementation((query) => ({
      time: query.time, totalVolume: query.time / 60_000 + 40,
    }));
    const ast = parse(`//@version=6
indicator("Nested footprint")
value = request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2)))
plot(value)`);
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars, undefined, {
      requestDatafeed: datafeed,
      runtime: { syminfo: { tickerid: 'TEST:CHART' }, timeframe: { period: '1' } },
    });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([41, 42]);
    expect(provider.mock.calls.map(([query]) => query)).toEqual(bars.map((bar) => ({
      symbol: 'TEST:OTHER', timeframe: '1', ticksPerRow: 2,
      valueAreaPercent: 70, imbalancePercent: 300, time: bar.time,
    })));
  });
});
