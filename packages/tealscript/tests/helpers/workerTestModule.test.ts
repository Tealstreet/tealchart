import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { afterEach, expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';
import { createWorkerTestModule } from './workerTestModule';

afterEach(() => vi.unstubAllGlobals());

it('imports worker setup once while disposing state between distinct globals', async () => {
  const module = createWorkerTestModule();
  const bars = [{ time: 60000, open: 3, high: 3, low: 3, close: 3, volume: 1 }];
  for (const factor of [2, 5]) {
    const messages: FromWorkerMessage[] = [];
    const worker = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => messages.push(message),
    };
    await module.attach(worker);
    expect(messages).toEqual(factor === 2 ? [{ type: 'ready' }] : []);
    messages.length = 0;
    const send = (data: ToWorkerMessage) => worker.onmessage!({ data } as MessageEvent<ToWorkerMessage>);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    send({ type: 'updateBar', bar: bars[0] });
    expect(messages).toEqual([]);
    warning.mockRestore();
    send({
      type: 'init',
      scriptId: 'isolated',
      script: '//@version=6\nindicator("Isolated")\nvar n = 0\nn += ' + factor + '\nplot(n)',
      bars,
      inputs: {},
    });
    expect(getResultOutput(messages.at(-1) as ResultMessage).plots[0].values).toEqual([factor]);
  }
  expect(module.importCount).toBe(1);
});
