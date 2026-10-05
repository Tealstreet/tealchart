import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { checkProgram } from '../../src/semantic/checker';

const bars = [1, 2].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function run(body: string) {
  const ast = parse(`//@version=6\nindicator("Ledger827 documented budget")\n${body}`);
  expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const datafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST:OTHER', timeframe: '1', bars }]);
  datafeed.getFootprint = (query) => ({ time: query.time, totalVolume: query.ticksPerRow });
  return executeScript(ast, bars, undefined, {
    requestDatafeed: datafeed,
    runtime: { syminfo: { tickerid: 'TEST:CHART' }, timeframe: { period: '1' } },
  });
}

// Documented budget only; the synthetic provider does not certify native footprint values.
it('rejects two output-dependent footprint parameter sets', () => {
  const result = run(
    'plot(footprint.total_volume(request.footprint(2)))\nplot(footprint.total_volume(request.footprint(3)))',
  );
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'runtime.error', message: expect.stringContaining('maximum is 1 per script') }),
    ]),
  );
});

it('shares the footprint budget with a requested dataset', () => {
  const result = run(
    'plot(footprint.total_volume(request.footprint(2)))\nplot(request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2))))',
  );
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'runtime.error', message: expect.stringContaining('maximum is 1 per script') }),
    ]),
  );
});

it('does not charge a footprint unused by any output', () => {
  const result = run('unused = request.footprint(3)\nplot(footprint.total_volume(request.footprint(2)))');
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual([2, 2]);
});
