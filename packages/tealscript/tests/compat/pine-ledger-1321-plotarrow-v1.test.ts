import { expect, it, vi } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getResultOutput, type FromWorkerMessage, type ToWorkerMessage } from '../../src/worker/protocol';

// Rank1358; https://www.tradingview.com/pine-script-reference/v6/, functions4.
// https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
it('replaces same-bar plotarrow direction and absence while retaining earlier bars', async () => {
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
    const historical: Bar = { time: 60_000, open: 10, high: 12, low: 8, close: 11, volume: 100 };
    send({ type: 'init', scriptId: 'arrow-ticks', inputs: {}, bars: [historical], script: `//@version=6
indicator("Arrow ticks", overlay=true)
plotarrow(close - open, title="Arrow", colorup=color.green, colordown=color.red)
` });
    const live = { ...historical, time: 120_000 };
    for (const close of [11, 9, 10, 12]) send({ type: 'updateBar', bar: { ...live, close } });
    send({ type: 'updateBar', bar: { ...live, time: 180_000, close: 9 } });
    expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
    const outputs = messages.flatMap((message) => message.type === 'result' ? [getResultOutput(message)] : []);
    expect(outputs).toHaveLength(6);
    const arrows = outputs.map((output) => {
      expect(output.plots).toHaveLength(1);
      return output.plots[0]!;
    });
    expect(arrows.every((plot) => plot.type === 'plotarrow' && plot.title === 'Arrow')).toBe(true);
    expect(arrows.map((plot) => plot.values)).toEqual([[1], [1, 1], [1, -1], [1, null], [1, 2], [1, 2, -1]]);
    expect(new Set(arrows.map((plot) => plot.id)).size).toBe(1);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}, 60_000);
