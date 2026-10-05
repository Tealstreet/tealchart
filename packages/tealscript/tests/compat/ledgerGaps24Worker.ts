import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

const historical: Bar = { time: Date.UTC(2026, 0, 1), open: 10, high: 13, low: 7, close: 11, volume: 100 };

export async function workerPlots(body: string) {
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
    send({
      type: 'init',
      scriptId: 'ledger-24-varip',
      script: `//@version=6\nindicator("Ledger 24 varip")\n${body}`,
      bars: [historical],
      inputs: {},
    });
    const live = { ...historical, time: historical.time + 60_000 };
    for (const close of [11, 9, 8, 12]) send({ type: 'updateBar', bar: { ...live, close } });
    send({ type: 'updateBar', bar: { ...live, time: live.time + 60_000, close: 7 } });
    expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
    const outputs = messages.filter((message) => message.type === 'result').map((message) => getResultOutput(message));
    expect(outputs).toHaveLength(6);
    return (title: string) => outputs.map((output) => output.plots.find((plot) => plot.title === title)?.values.at(-1));
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}
