import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

// Ledger1266–1268; reuse barstate-history-type-reference-contracts for series bool.
// https://www.tradingview.com/pine-script-docs/concepts/bar-states/
it('keeps a confirmed realtime bar nonhistorical until historical reload', async () => {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const worker = {
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(message),
  };
  const bar = (index: number, close: number): Bar => ({
    time: (index + 1) * 60_000,
    open: 1,
    high: close,
    low: 1,
    close,
    volume: 10,
  });
  vi.stubGlobal('self', worker);
  try {
    await import('../../src/worker/worker');
    const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
    send({
      type: 'init',
      scriptId: 'ishistory-closing',
      inputs: {},
      bars: [bar(0, 2), bar(1, 4)],
      script: `//@version=6
indicator("History phases")
plot(barstate.ishistory ? 1 : 0, "history")
plot(barstate.isrealtime ? 1 : 0, "realtime")
plot(barstate.isconfirmed ? 1 : 0, "confirmed")
plot(barstate.ishistory and barstate.isrealtime ? 1 : 0, "overlap")`,
    });
    send({ type: 'updateBar', bar: bar(2, 8) });
    send({ type: 'updateBar', bar: bar(2, 12) });
    send({ type: 'updateBar', bar: bar(3, 20) });
    send({ type: 'updateBars', bars: [bar(0, 2), bar(1, 4), bar(2, 12), bar(3, 20)] });
    expect(messages.filter((message) => ['error', 'semanticError', 'parseError'].includes(message.type))).toEqual([]);
    const values = (title: string) =>
      messages.flatMap((message) =>
        message.type === 'result' ? [getResultOutput(message).plots.find((plot) => plot.title === title)!.values] : [],
      );
    expect(values('history')).toEqual([
      [1, 1],
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 0, 0],
      [1, 1, 1, 1],
    ]);
    expect(values('realtime')).toEqual([
      [0, 0],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
    ]);
    expect(values('confirmed')).toEqual([
      [1, 1],
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 1, 0],
      [1, 1, 1, 1],
    ]);
    expect(values('overlap')).toEqual([
      [0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});
