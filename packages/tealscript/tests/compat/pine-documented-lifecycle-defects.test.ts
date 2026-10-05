import { describe, expect, it, vi } from 'vitest';

import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';
import { getPlot, runCompatScript } from './fixtures';

// Authority: archived Pine v6 reference. Historical resizing is an ordinary witness.
// Worker varip remains expected-red, inverse-proven with isolated state restoration.
// Remove its .fails when the original worker prerequisite is integrated.
const historicalBar: Bar = { time: Date.UTC(2026, 0, 1), open: 10, high: 13, low: 8, close: 11, volume: 100 };

describe('documented historical and realtime lifecycle defects', () => {
  // Later historical references trigger resizing below the documented 5000 cap.
  // Nonmonotonic values reject substituting last/max/zero for lost history.
  // Depth stays below documented 5000; realtime growth is excluded.
  it('historical-buffer-no-adaptive-restart [max_bars_back]', () => {
    const data = Array.from({ length: 700 }, (_, i) => ({
      ...historicalBar, time: historicalBar.time + i * 60_000, close: [11, 19, 7, 15][i % 4],
    }));
    const result = runCompatScript(`//@version=6
indicator("Adaptive historical buffer")
plot(bar_index > 0 ? close[bar_index - 1] : na, "old")`, { bars: data });
    expect.soft(result.errors).toEqual([]);
    expect.soft(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect.soft(getPlot(result, 'old').values).toEqual([null, ...Array<number>(699).fill(19)]);
  });

  // Public worker updates must preserve varip within a bar and reset on a new bar.
  // Three updates distinguish persistence from the broken fresh-replay path.
  // Regular var must roll back independently.
  it('worker-varip-tick-state [varip]', async () => {
    vi.resetModules();
    const messages: FromWorkerMessage[] = [];
    const worker = {
      postMessage: (message: FromWorkerMessage) => messages.push(message),
      onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    };
    vi.stubGlobal('self', worker);
    try {
      await import('../../src/worker/worker');
      const send = (message: ToWorkerMessage) => {
        expect(worker.onmessage).toBeTypeOf('function');
        worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
      };
      send({ type: 'init', scriptId: 'documented-varip', script: `//@version=6
indicator("Intrabar counter")
varip int ticks = 0
var int rolled = 0
varip int total = 0
varip array<int> totals = array.new<int>(1, 0)
count() =>
    varip int calls = 0
    calls += 1
    calls
nested() =>
    count()
int scopedCount = 0
if true
    varip int scoped = 0
    scoped += 1
    scopedCount := scoped
if barstate.isnew
    ticks := 0
ticks += 1
rolled += 1
total += 1
array.set(totals, 0, array.get(totals, 0) + 1)
float conditionalValue = na
if barstate.isrealtime and (close == 9 or barstate.isnew)
    var float initialized = close
    conditionalValue := initialized
plot(conditionalValue, "conditionalValue")
plot(high, "high")
plot(low, "low")
plot(close, "close")
plot(total, "total")
plot(array.get(totals, 0), "arrayTotal")
plot(count(), "calls")
plot(nested(), "nestedCalls")
plot(scopedCount, "scopedCount")
plot(ticks, "ticks")
plot(rolled, "rolled")`, bars: [historicalBar], inputs: {} });
      const live = { ...historicalBar, time: historicalBar.time + 60_000, high: 14, low: 7 };
      send({ type: 'updateBar', bar: live });
      send({ type: 'updateBar', bar: { ...live, close: 9, high: 15, low: 6 } });
      send({ type: 'updateBar', bar: { ...live, close: 12, high: 17, low: 5 } });
      send({ type: 'updateBar', bar: { ...live, time: live.time + 60_000, open: 7, close: 7, high: 9, low: 4 } });
      expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
      const outputs = messages.filter((message) => message.type === 'result').map((message) => getResultOutput(message));
      expect(outputs).toHaveLength(5);
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'ticks')?.values.at(-1))).toEqual([1, 1, 2, 3, 1]);
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'rolled')?.values.at(-1))).toEqual([1, 2, 2, 2, 3]);
      // kw_var rolls unconfirmed initialization back; var_high/var_low follow
      // the current realtime bar (ledger gaps ranks 84, 100, 103).
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'conditionalValue')?.values.at(-1))).toEqual([null, 11, 9, null, 7]);
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'high')?.values.at(-1))).toEqual([13, 14, 15, 17, 9]);
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'low')?.values.at(-1))).toEqual([8, 7, 6, 5, 4]);
      // var_close tracks the latest update; same-bar outputs replace prior ticks.
      expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === 'close')?.values)).toEqual([[11], [11, 11], [11, 9], [11, 12], [11, 12, 7]]);
      for (const title of ['total', 'arrayTotal', 'calls', 'nestedCalls', 'scopedCount']) {
        expect.soft(outputs.map((output) => output.plots.find((plot) => plot.title === title)?.values.at(-1)), title).toEqual([1, 2, 3, 4, 5]);
      }
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
