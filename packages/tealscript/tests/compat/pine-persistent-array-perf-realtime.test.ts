import type { Bar } from '../../src/runtime/context';

import { afterEach, expect, it, vi } from 'vitest';

import { measureProductionWorkerSessions, measureRealtimeReentryParity } from './productionWorkerHarness';

afterEach(() => vi.unstubAllGlobals());

it('keeps persistent numeric bins and nested drawing updates exact across replacement ticks', async () => {
  const bars: Bar[] = [10, 20, 30].map((close, index) => ({
    time: (index + 1) * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
  const source = `//@version=6
indicator("Persistent bins and slots", overlay=true)
type Slot
    array<float> bins
    line drawing
var array<Slot> pool = array.new<Slot>()
if barstate.isfirst
    array.push(pool, Slot.new(array.new_float(2, 0.0), na))
slot = array.get(pool, 0)
array.set(slot.bins, 0, close)
array.set(slot.bins, 1, nz(close[1]))
slot.drawing := line.new(bar_index - 1, close - 1, bar_index, close)
array.set(pool, 0, slot)
plot(array.sum(slot.bins), "Bins")
plot(line.get_y2(slot.drawing), "Handle")`;
  const liveUpdateBars = [35, 28, 41].map((close) => ({ ...bars[2]!, close, high: close + 1, low: close - 1 }));
  const testCase = { scriptId: 'persistent-bin-updates', source, bars, liveUpdateBars };
  const session = await measureProductionWorkerSessions([testCase], { includeLiveUpdates: true, includeOutputs: true });
  expect(session.loadMeasurements[0]?.error).toBeUndefined();
  for (const [index, update] of session.updateMeasurements.entries()) {
    expect(update.error).toBeUndefined();
    expect(update.executionMode).toBe('compiled');
    const output = update.output!;
    expect(output.plots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Bins', values: [10, 30, liveUpdateBars[index]!.close + 20] }),
        expect.objectContaining({ title: 'Handle', values: [10, 20, liveUpdateBars[index]!.close] }),
      ]),
    );
    expect(output.drawings).toEqual([
      expect.objectContaining({ type: 'line', y2: 10, persistent: true }),
      expect.objectContaining({ type: 'line', y2: 20, persistent: true }),
      expect.objectContaining({ type: 'line', y2: liveUpdateBars[index]!.close, persistent: true }),
    ]);
  }
  const parity = await measureRealtimeReentryParity([testCase]);
  expect(parity).toMatchObject({ totalUpdates: 3, workerMatched: 3, workerMismatches: [] });
  // Cold worker imports plus live/fresh replays share this test's budget.
}, 30_000);
