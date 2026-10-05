import type { Bar } from '../../src/runtime';
import type { ErrorMessage, FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

const bar = (index: number, close: number): Bar => ({
  time: (index + 1) * 60_000,
  open: 1,
  high: Math.max(close, 1),
  low: 1,
  close,
  volume: 10,
});

async function withWorker(
  script: string,
  check: (send: (message: ToWorkerMessage) => void, messages: FromWorkerMessage[]) => void,
) {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const worker = {
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)),
  };
  vi.stubGlobal('self', worker);
  try {
    await import('../../src/worker/worker');
    const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
    send({ type: 'init', scriptId: 'halt-reference', script, bars: [bar(0, 2), bar(1, 4)], inputs: {} });
    check(send, messages);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}

// Execution model / realtime exceptions: runtime faults stay halted until script reload.
const faults = [
  ['explicit', 'runtime.error("halt witness")'],
  ['HMA argument', 'ta.hma(close, 1)'],
] as const;

it.each(
  [5, 6].flatMap((version) =>
    faults.flatMap(([kind, fault]) =>
      [false, true].map((replaceLoaded) => ({
        version,
        kind,
        fault,
        replaceLoaded,
      })),
    ),
  ),
)(
  'v$version $kind stays halted across later ticks (loaded replacement=$replaceLoaded)',
  async ({ version, fault, replaceLoaded }) => {
    await withWorker(
      `//@version=${version}\nindicator("Halt reference")\nif barstate.isrealtime and close > 6\n    ${fault}\nplot(close)`,
      (send, messages) => {
        const index = replaceLoaded ? 1 : 2;
        expect(messages.filter((message) => message.type === 'result')).toHaveLength(1);
        send({ type: 'updateBar', bar: bar(index, 8), metadata: { generation: 1, requestId: 10 } });
        const failure = messages.at(-1) as ErrorMessage;
        expect(failure.type).toBe('error');
        expect(failure.runtimeError).toBeDefined();
        for (const [nextIndex, close, generation] of [
          [index, 3, 2],
          [index + 1, 4, 3],
        ] as const) {
          send({ type: 'updateBar', bar: bar(nextIndex, close), metadata: { generation, requestId: 10 + generation } });
          const output = messages.at(-1) as ErrorMessage;
          expect.soft(output.type).toBe('error');
          expect.soft(output.runtimeError).toEqual(failure.runtimeError);
          expect.soft(output.profile).toEqual(failure.profile);
          expect.soft(output.metadata).toEqual({ generation, requestId: 10 + generation });
        }
        expect(messages.filter((message) => message.type === 'result')).toHaveLength(1);
      },
    );
  },
);

it.each(['updateBars', 'setInputs', 'init'] as const)('%s reload clears the halted state', async (reload) => {
  const script =
    '//@version=6\nindicator("Halt reload")\nif barstate.isrealtime and close > 6\n    runtime.error("halt witness")\nplot(close)';
  await withWorker(script, (send, messages) => {
    send({ type: 'updateBar', bar: bar(2, 8) });
    expect(messages.at(-1)?.type).toBe('error');
    if (reload === 'updateBars') send({ type: 'updateBars', bars: [bar(0, 2), bar(1, 4), bar(2, 3)] });
    if (reload === 'setInputs') send({ type: 'setInputs', inputs: {} });
    if (reload === 'init')
      send({ type: 'init', scriptId: 'reloaded', script, bars: [bar(0, 2), bar(1, 4)], inputs: {} });
    expect(messages.at(-1)?.type).toBe('result');
    send({ type: 'updateBar', bar: bar(3, 3) });
    expect(messages.at(-1)?.type).toBe('result');
    send({ type: 'updateBar', bar: bar(3, 8) });
    expect(messages.at(-1)?.type).toBe('error');
    send({ type: 'updateBar', bar: bar(3, 3) });
    expect(messages.at(-1)?.type).toBe('error');
  });
});
