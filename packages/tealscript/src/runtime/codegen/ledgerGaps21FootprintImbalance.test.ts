import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[701] request.footprint imbalance_percent allows const/input/simple int and float.
describe('ledger824: footprint imbalance argument', () => {
  it.each([
    ['const int', 'const int imbalance = 250', 250],
    ['const float', 'const float imbalance = 250.5', 250.5],
    ['input int', 'imbalance = input.int(250)', 250],
    ['input float', 'imbalance = input.float(250.5)', 250.5],
    ['simple int', 'simple int imbalance = 250', 250],
    ['simple float', 'simple float imbalance = 250.5', 250.5],
  ] as const)('accepts and routes %s', (_kind, declaration, value) => {
    const ast = parse(`//@version=6\nindicator("Imbalance argument")\n${declaration}\nplot(footprint.total_volume(request.footprint(2, 70, imbalance)))`);
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const datafeed = new InMemoryRequestDatafeed([]);
    const provider = vi.spyOn(datafeed, 'getFootprint').mockImplementation((query) => ({
      time: query.time, totalVolume: query.imbalancePercent,
    }));
    const result = executeScript(ast, [{ time: 60_000, open: 7, high: 8, low: 6, close: 7, volume: 1 }], undefined, {
      requestDatafeed: datafeed,
      runtime: { syminfo: { tickerid: 'TEST:CHART' }, timeframe: { period: '1' } },
    });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([value]);
    expect(provider.mock.calls[0][0].imbalancePercent).toBe(value);
  });
});
