import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

const bar = (index: number, close: number): Bar => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 10,
});

async function withWorker(check: (send: (message: ToWorkerMessage) => void, messages: FromWorkerMessage[]) => void) {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const worker = {
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)),
  };
  vi.stubGlobal('self', worker);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await import('../../src/worker/worker');
    check((message) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>), messages);
  } finally {
    warning.mockRestore();
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}

const invalidBody = (kind: string) => (kind === 'parse' ? 'plot(' : 'plot(close, caption="Bad")');

it.each(
  [5, 6].flatMap((version) =>
    ['parse', 'semantic'].flatMap((kind) => [false, true].map((sameId) => ({ version, kind, sameId }))),
  ),
)(
  'v$version failed $kind initialization retires previous execution (sameId=$sameId)',
  async ({ version, kind, sameId }) =>
    withWorker((send, messages) => {
      send({
        type: 'init',
        scriptId: 'previous',
        script: `//@version=${version}\nindicator("Previous")\nplot(close * 2)`,
        bars: [bar(0, 2), bar(1, 4)],
        inputs: {},
      });
      const previous = messages.at(-1) as ResultMessage;
      expect(getResultOutput(previous).plots[0].values).toEqual([4, 8]);
      const scriptId = sameId ? 'previous' : 'replacement';
      const metadata = { generation: 2, requestId: 2, requestKind: 'full' as const };
      send({
        type: 'init',
        scriptId,
        script: `//@version=${version}\nindicator("Invalid")\n${invalidBody(kind)}`,
        bars: [bar(0, 3)],
        inputs: {},
        metadata,
      });
      expect(messages.at(-1)).toMatchObject({
        type: kind === 'parse' ? 'parseError' : 'semanticError',
        scriptId,
        metadata,
      });
      const afterFailure = messages.length;
      send({
        type: 'updateBar',
        bar: bar(1, 12),
        metadata: { generation: 2, requestId: 3, requestKind: 'incremental' },
      });
      send({
        type: 'updateBar',
        bar: bar(2, 20),
        metadata: { generation: 2, requestId: 4, requestKind: 'incremental' },
      });
      send({ type: 'updateBars', bars: [bar(0, 30)], metadata: { generation: 2, requestId: 5, requestKind: 'full' } });
      send({ type: 'setInputs', inputs: {}, metadata: { generation: 2, requestId: 6, requestKind: 'full' } });
      expect(messages.slice(afterFailure).filter((message) => message.type === 'result')).toEqual([]);
      const recoveredMetadata = { generation: 3, requestId: 7, requestKind: 'full' as const };
      send({
        type: 'init',
        scriptId,
        script: `//@version=${version}\nindicator("Recovered")\nplot(close * 10)`,
        bars: [bar(0, 3), bar(1, 7)],
        inputs: {},
        metadata: recoveredMetadata,
      });
      expect(messages.at(-1)?.type).toBe('result');
      expect(messages.at(-1)).toMatchObject({ scriptId });
      const recovered = getResultOutput(messages.at(-1) as ResultMessage);
      expect(recovered.plots[0].values).toEqual([30, 70]);
      expect(recovered.declaration?.title).toBe('Recovered');
      expect(recovered.metadata).toEqual(recoveredMetadata);
    }),
);

it.each(['parse', 'semantic'])(
  'failed %s initialization retires pending requests from the previous source',
  async (kind) =>
    withWorker((send, messages) => {
      send({
        type: 'init',
        scriptId: 'pending',
        script: '//@version=6\nindicator("Pending")\nplot(request.security("TEST", "D", close))',
        bars: [bar(0, 2), bar(1, 4)],
        inputs: {},
      });
      const request = messages.find((message) => message.type === 'requestData');
      expect(request?.type).toBe('requestData');
      if (!request || request.type !== 'requestData') throw new Error('Missing request-data witness');
      expect(messages.some((message) => message.type === 'result')).toBe(false);
      send({
        type: 'init',
        scriptId: 'pending',
        script: `//@version=6\nindicator("Invalid")\n${invalidBody(kind)}`,
        bars: [bar(0, 3)],
        inputs: {},
      });
      expect(messages.at(-1)?.type).toBe(kind === 'parse' ? 'parseError' : 'semanticError');
      const afterFailure = messages.length;
      send({
        type: 'requestDataResult',
        scriptId: request.scriptId,
        requestId: request.requestId,
        generation: request.generation,
        kind: 'bars',
        ok: true,
        value: { symbol: 'TEST', timeframe: 'D', bars: [bar(0, 30), bar(1, 70)] },
      });
      expect(messages.slice(afterFailure)).toEqual([]);
    }),
);

it('successful replacement and dataset/input reloads use the replacement source', async () =>
  withWorker((send, messages) => {
    send({
      type: 'init',
      scriptId: 'previous',
      script: '//@version=6\nindicator("Previous")\nplot(close)',
      bars: [bar(0, 2), bar(1, 4)],
      inputs: {},
    });
    send({
      type: 'init',
      scriptId: 'replacement',
      script: '//@version=6\nindicator("Replacement")\nfactor=input.int(10,"Factor")\nplot(close * factor)',
      bars: [bar(0, 3), bar(1, 7)],
      inputs: {},
    });
    const output = () => getResultOutput(messages.at(-1) as ResultMessage);
    expect(output().plots[0].values).toEqual([30, 70]);
    send({ type: 'updateBars', bars: [bar(0, 5)] });
    expect(output().plots[0].values).toEqual([50]);
    const factor = output().inputs.find((input) => input.title === 'Factor');
    expect(factor).toBeDefined();
    send({ type: 'setInputs', inputs: { [factor!.id]: 20 } });
    expect(output().plots[0].values).toEqual([100]);
    expect(messages.at(-1)).toMatchObject({ scriptId: 'replacement' });
  }));
