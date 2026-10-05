import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: request.footprint remarks.
// Other-timeframes-and-data requesting-footprints-on-other-datasets: multiple
// distinct footprint requests used by outputs raise a runtime error. Identical duplicates remain native-held.
describe('ledger827: footprint output-dependent limit', () => {
  it('footprint-output-unique-call-limit rejects two distinct output-dependent requests', () => {
    const ast = parse(`//@version=6
indicator("Distinct footprint limit")
first = request.footprint(2)
second = request.footprint(3)
plot(footprint.total_volume(first))
plot(footprint.total_volume(second))`);
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const datafeed = new InMemoryRequestDatafeed([]);
    datafeed.getFootprint = (query) => ({ time: query.time, totalVolume: query.ticksPerRow });
    const result = executeScript(ast, [{ time: 60_000, open: 7, high: 8, low: 6, close: 7, volume: 1 }], undefined, {
      requestDatafeed: datafeed,
      runtime: { syminfo: { tickerid: 'TEST:CHART' }, timeframe: { period: '1' } },
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'runtime.error', message: expect.stringMatching(/footprint/i) }),
    ]));
  });
});
