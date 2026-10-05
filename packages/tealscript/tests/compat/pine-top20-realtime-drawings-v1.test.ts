import { describe, expect, it, vi } from 'vitest';
import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';

describe('TOP20 job3 realtime drawing and ordinary-state rollback', () => {
  it('replaces three open-bar updates and commits ordinary fields once', async () => {
    vi.resetModules();
    const messages: FromWorkerMessage[] = [];
    const worker = { onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined, postMessage: (message: FromWorkerMessage) => messages.push(message) };
    vi.stubGlobal('self', worker);
    try {
      await import('../../src/worker/worker');
      const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
      const historical: Bar = { time: 60000, open: 10, high: 12, low: 8, close: 11, volume: 100 };
      send({ type: 'init', scriptId: 'top20-job3', inputs: {}, bars: [historical], script: `//@version=6
indicator("Rollback witness", overlay=true)
type Counter
    int value = 0
var Counter state = Counter.new()
var int ordinary = 0
ordinary += 1
state.value += 1
float liveInitialization = na
if barstate.isrealtime
    var float firstLiveHigh = high
    liveInitialization := firstLiveHigh
plot(liveInitialization, "initialization")
plot(ordinary, "ordinary")
plot(state.value, "field")
plotbar(open, high, low, close, title="ticks")
label.new(bar_index, high, str.tostring(state.value))
` });
      for (const [high, low, close] of [[25, 19, 22], [28, 17, 18], [33, 15, 27]]) {
        send({ type: 'updateBar', bar: { ...historical, time: 120000, open: 20, high, low, close } });
      }
      send({ type: 'updateBar', bar: { ...historical, time: 180000, open: 40, high: 45, low: 38, close: 42 } });
      expect(messages.filter(message => ['error', 'semanticError', 'parseError'].includes(message.type))).toEqual([]);
      const outputs = messages.flatMap(message => message.type === 'result' ? [getResultOutput(message)] : []);
      expect(outputs).toHaveLength(5);
      for (const title of ['ordinary', 'field']) {
        expect(outputs.map(output => output.plots.find(plot => plot.title === title)!.values)).toEqual([[1], [1, 2], [1, 2], [1, 2], [1, 2, 3]]);
      }
      expect(outputs.map(output => output.plots.find(plot => plot.title === 'initialization')!.values)).toEqual([[null], [null, 25], [null, 28], [null, 33], [null, 33, 33]]);
      const candles = outputs.map(output => output.plots.find(plot => plot.title === 'ticks')!);
      expect(candles.map(plot => plot.highValues)).toEqual([[12], [12, 25], [12, 28], [12, 33], [12, 33, 45]]);
      expect(candles.map(plot => plot.lowValues)).toEqual([[8], [8, 19], [8, 17], [8, 15], [8, 15, 38]]);
      expect(outputs.map(output => output.drawings.filter(drawing => drawing.type === 'label').map(drawing => [drawing.barIndex, drawing.y, drawing.text]))).toEqual([
        [[0, 12, '1']], [[0, 12, '1'], [1, 25, '2']], [[0, 12, '1'], [1, 28, '2']], [[0, 12, '1'], [1, 33, '2']], [[0, 12, '1'], [1, 33, '2'], [2, 45, '3']],
      ]);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
