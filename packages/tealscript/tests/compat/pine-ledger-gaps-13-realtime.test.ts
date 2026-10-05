import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

const historical: Bar = { time: 1700000000000, open: 10, high: 13, low: 8, close: 11, volume: 1 };
it('rank508 replaces realtime barcolor on each same-bar update', async () => {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const worker = {
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)),
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
  };
  vi.stubGlobal('self', worker);
  try {
    await import('../../src/worker/worker');
    const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
    send({
      type: 'init',
      scriptId: 'ledger13',
      script:
        '//@version=6\nindicator("Rollback")\nbarcolor(close > open ? color.green : color.red)\nif barstate.isrealtime and close > open\n    alert("green", alert.freq_all)',
      bars: [historical],
      inputs: {},
    });
    const live = { ...historical, time: historical.time + 60000 };
    send({ type: 'updateBar', bar: live });
    send({ type: 'updateBar', bar: { ...live, close: 9 } });
    send({ type: 'updateBar', bar: { ...live, close: 12 } });
    expect(messages.filter((m) => ['error', 'semanticError', 'parseError'].includes(m.type))).toEqual([]);
    const outputs = messages.filter((m) => m.type === 'result').map((m) => getResultOutput(m));
    expect(outputs).toHaveLength(4);
    const colors = outputs.map((o) => o.plots.find((p) => p.type === 'barcolor')?.color);

    expect(colors).toEqual([['#4CAF50'], ['#4CAF50', '#4CAF50'], ['#4CAF50', '#F23645'], ['#4CAF50', '#4CAF50']]);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});
