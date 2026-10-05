import { describe, expect, it, vi } from 'vitest';

import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';

// Ledger1727–1731,1733–1735,1739: execution-model rollback/commit and reload rules.
// https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
const bar = (index: number, close: number): Bar => ({ time: (index + 1) * 60_000, open: 1, high: Math.max(close, 1), low: 1, close, volume: 10 });

async function withWorker(body: string, check: (send: (message: ToWorkerMessage) => void, values: (title: string) => Array<Array<number | null>>) => void) {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const worker = { onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined, postMessage: (message: FromWorkerMessage) => messages.push(message) };
  vi.stubGlobal('self', worker);
  try {
    await import('../../src/worker/worker');
    const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
    send({ type: 'init', scriptId: 'ledger-rollback', inputs: {}, bars: [bar(0, 2), bar(1, 4)], script: `//@version=6\nindicator("Ledger rollback")\n${body}` });
    const values = (title: string) => {
      expect(messages.filter((message) => ['error', 'semanticError', 'parseError'].includes(message.type))).toEqual([]);
      return messages.flatMap((message) => message.type === 'result' ? [getResultOutput(message).plots.find((plot) => plot.title === title)!.values] : []);
    };
    check(send, values);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}

const liveSequence = (send: (message: ToWorkerMessage) => void) => {
  for (const close of [8, 12]) send({ type: 'updateBar', bar: bar(2, close) });
  send({ type: 'updateBar', bar: bar(3, 20) });
};

describe('public worker realtime rollback and reload', () => {
  it('rolls back newly created drawings on a repeated realtime timestamp', async () => {
    await withWorker('label.new(bar_index, close)\nplot(array.size(label.all), "labels")', (send, values) => {
      liveSequence(send);
      expect(values('labels')).toEqual([[1, 2], [1, 2, 3], [1, 2, 3], [1, 2, 3, 4]]);
    });
  });

  it('rolls back mutations of an existing drawing before repeated realtime execution', async () => {
    await withWorker('var label marker = label.new(0, close)\nlabel.set_x(marker, label.get_x(marker) + 1)\nplot(label.get_x(marker), "position")', (send, values) => {
      liveSequence(send);
      expect(values('position')).toEqual([[1, 2], [1, 2, 3], [1, 2, 3], [1, 2, 3, 4]]);
    });
  });

  it('reinitializes an ordinary declaration on every tick', async () => {
    await withWorker('count = 0\ncount += 1\nplot(count, "count")', (send, values) => {
      liveSequence(send);
      expect(values('count')).toEqual([[1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1, 1]]);
    });
  });

  it('recomputes TA state from the committed preceding bar', async () => {
    await withWorker('plot(ta.sma(close, 2), "average")', (send, values) => {
      liveSequence(send);
      expect(values('average')).toEqual([[null, 3], [null, 3, 6], [null, 3, 8], [null, 3, 8, 16]]);
    });
  });

  it('discards superseded expression history and commits the closing sample', async () => {
    await withWorker('plot((close * 2)[1], "previous")', (send, values) => {
      liveSequence(send);
      expect(values('previous')).toEqual([[null, 4], [null, 4, 8], [null, 4, 8], [null, 4, 8, 24]]);
    });
  });

  it('reloads final OHLC and reclassifies elapsed realtime bars as historical', async () => {
    await withWorker('plot(close, "close")\nplot(barstate.isrealtime ? 1 : 0, "realtime")\nplot(barstate.isconfirmed ? 1 : 0, "confirmed")', (send, values) => {
      liveSequence(send);
      send({ type: 'updateBars', bars: [bar(0, 2), bar(1, 4), bar(2, 12), bar(3, 20)] });
      expect(values('close')).toEqual([[2, 4], [2, 4, 8], [2, 4, 12], [2, 4, 12, 20], [2, 4, 12, 20]]);
      expect(values('realtime')).toEqual([[0, 0], [0, 0, 1], [0, 0, 1], [0, 0, 1, 1], [0, 0, 0, 0]]);
      expect(values('confirmed')).toEqual([[1, 1], [1, 1, 0], [1, 1, 0], [1, 1, 1, 0], [1, 1, 1, 1]]);
    });
  });
});
