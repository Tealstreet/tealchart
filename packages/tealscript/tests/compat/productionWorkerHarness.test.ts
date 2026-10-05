import { expect, it } from 'vitest';

import { measureProductionWorkerSessions, measureRealtimeReentryParity } from './productionWorkerHarness';

const bars = [1, 2].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const testCase = {
  scriptId: 'retained-tick-logs',
  source: `//@version=6
indicator("Retained tick logs")
if barstate.isrealtime
    log.info(str.tostring(close))
plot(close)`,
  bars,
  liveUpdateBars: [3, 4, 4].map(close => ({ ...bars[1], high: close, close })),
};

it('compares complete retained logs after replaying every prior tick in a fresh worker', async () => {
  const session = await measureProductionWorkerSessions([testCase], { includeLiveUpdates: true, includeOutputs: true });
  expect(session.updateMeasurements.map(update => update.output?.logs)).toEqual([
    [{ level: 'info', message: '3', barIndex: 1, time: 120_000 }],
    [{ level: 'info', message: '3', barIndex: 1, time: 120_000 }, { level: 'info', message: '4', barIndex: 1, time: 120_000 }],
    [{ level: 'info', message: '3', barIndex: 1, time: 120_000 }, { level: 'info', message: '4', barIndex: 1, time: 120_000 }, { level: 'info', message: '4', barIndex: 1, time: 120_000 }],
  ]);
  expect(await measureRealtimeReentryParity([testCase])).toEqual({
    backend: 'worker', totalUpdates: 3, workerMatched: 3, workerMismatches: [],
  });
}, 20_000);
