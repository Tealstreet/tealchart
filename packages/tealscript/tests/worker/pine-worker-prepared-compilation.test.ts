import { afterEach, expect, it, vi } from 'vitest';

import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

afterEach(() => vi.unstubAllGlobals());

it.each([false, true])('prepares one compiled program for preload retries and realtime updates (libraries=%s)', async (withLibraries) => {
  vi.resetModules();
  const compiler = await import('../../src/runtime/codegen/compile');
  const compile = vi.spyOn(compiler, 'compile');
  const posted: FromWorkerMessage[] = [];
  const worker = { onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null, postMessage: (message: FromWorkerMessage) => posted.push(message) };
  vi.stubGlobal('self', worker);
  await import('../../src/worker/worker');
  const bar = { time: 0, open: 7, high: 7, low: 7, close: 7, volume: 1 };
  const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
  let cursor = 0;
  const resolveRequests = () => {
    while (cursor < posted.length) {
      const request = posted[cursor++];
      if (request?.type === 'requestData') {
        send({ type: 'requestDataResult', scriptId: request.scriptId, requestId: request.requestId, generation: request.generation, kind: 'bars', ok: true, value: { symbol: 'ALT', timeframe: '2', bars: [bar] } });
      }
    }
  };
  send({ type: 'init', scriptId: 'prepared', script: '//@version=6\nindicator("Prepared")\nplot(request.security("ALT", "2", close, lookahead=barmerge.lookahead_on))', bars: [bar, { ...bar, time: 60_000 }, { ...bar, time: 120_000 }], inputs: {}, libraries: withLibraries ? new Map() : undefined, runtime: { timeframe: { period: '1', multiplier: 1, isintraday: true } } });
  resolveRequests();
  send({ type: 'updateBar', bar: { ...bar, time: 120_000, close: 9 } });
  resolveRequests();
  send({ type: 'setInputs', inputs: {} });
  resolveRequests();
  expect(posted.filter(message => message.type === 'error')).toEqual([]);
  const results = posted.filter(message => message.type === 'result');
  expect(results).toHaveLength(3);
  expect(results.map(message => message.output.plots[0]?.values)).toEqual([[7, 7, 7], [7, 7, 7], [7, 7, 7]]);
  expect(compile).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
