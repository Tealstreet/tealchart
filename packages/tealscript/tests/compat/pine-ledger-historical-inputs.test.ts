import { afterEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { getResultOutput, type FromWorkerMessage, type ToWorkerMessage } from '../../src/worker/protocol';

// Ledger ranks 406/407: realtime-barstate-v1#22 and execution-model-v1#16.
// Historical market inputs refresh before evaluation; changed inputs rerun all bars.
const bars: Bar[] = [12, -4, 3].map((close, index) => ({
  time: (index + 1) * 60_000, open: close - 2, high: close + 7,
  low: close - 3, close, volume: 10 + index * 9,
}));

afterEach(() => vi.unstubAllGlobals());

describe('historical inputs and worker input changes', () => {
  it('refreshes market inputs before each historical script body [row 406]', () => {
    const result = executeScript(parse(`//@version=6
indicator("Historical inputs")
seen = close + 1
plot(seen)
plot(open)
plot(high)
plot(low)
plot(volume)
plot(time)
plot(bar_index)`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [13, -3, 4], [10, -6, 1], [19, 3, 10], [9, -7, 0],
      [10, 19, 28], [60_000, 120_000, 180_000], [0, 1, 2],
    ]);
  });

  it('re-evaluates every historical bar and resets var state when an input changes [row 407]', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => posted.push(message),
    };
    vi.resetModules();
    vi.stubGlobal('self', workerGlobal);
    await import('../../src/worker/worker');
    const send = (data: ToWorkerMessage) => workerGlobal.onmessage?.({ data } as MessageEvent<ToWorkerMessage>);
    const output = () => {
      expect(posted.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
      const result = posted.filter((message) => message.type === 'result').at(-1);
      expect(result?.type).toBe('result');
      if (!result || result.type !== 'result') throw new Error('Worker did not return a result');
      return getResultOutput(result);
    };
    send({ type: 'init', scriptId: 'history-inputs', bars, inputs: {}, script: `//@version=6
indicator("Input rerun")
step = input.int(2)
var int total = 0
total += step
plot(total)` });
    const initial = output();
    expect(initial.plots.map((plot) => plot.values)).toEqual([[2, 4, 6]]);
    expect(initial.inputs).toHaveLength(1);
    send({ type: 'setInputs', inputs: { [initial.inputs[0].id]: 3 } });
    expect(output().plots.map((plot) => plot.values)).toEqual([[3, 6, 9]]);
    send({ type: 'setInputs', inputs: { [initial.inputs[0].id]: -1 } });
    expect(output().plots.map((plot) => plot.values)).toEqual([[-1, -2, -3]]);
    expect(posted.filter((message) => message.type === 'result')).toHaveLength(3);
  });
});
