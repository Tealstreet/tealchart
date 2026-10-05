import type { Bar } from '../../src/runtime';
import type { ErrorMessage, FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

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

// https://www.tradingview.com/pine-script-docs/language/execution-model/#exceptions
const faults = [
  [
    'history bounds',
    'int depth = barstate.isrealtime and close > 6 ? 5001 : 1\nplot(close[depth])',
    /Historical offset 5001/,
  ],
  [
    'empty pop',
    'var values = array.new_float(0)\nif barstate.isrealtime and close > 6\n    array.pop(values)\nplot(close)',
    /Cannot use pop/,
  ],
] as const;

it.each([5, 6].flatMap((version) => faults.map(([kind, body, error]) => ({ version, kind, body, error }))))(
  'v$version $kind stays halted after the triggering condition clears',
  async ({ version, body, error }) => {
    const script = `//@version=${version}\nindicator("unstructured halt")\n${body}`;
    const execution = executeCompiledScript(parse(script), [bar(0, 2), bar(1, 4), bar(2, 8)], new Map(), {
      realtimeLastBar: { isNew: true },
    });
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors[0]?.message).toMatch(error);
    expect(execution.result.errors[0]?.runtimeError).toEqual({
      code: 'runtime.error',
      message: execution.result.errors[0]?.message,
      barIndex: 2,
    });
    await withWorker(script, (send, messages) => {
      expect(messages.at(-1)?.type).toBe('result');
      send({ type: 'updateBar', bar: bar(2, 8) });
      const failure = messages.at(-1)!;
      if (failure.type === 'result') {
        expect(failure.output.profile?.errors).toBeGreaterThan(0);
      }
      expect.soft(failure.type).toBe('error');
      send({ type: 'updateBar', bar: bar(2, 3) });
      const output = messages.at(-1) as ErrorMessage;
      expect.soft(output.type).toBe('error');
      if (failure.type === 'error') expect.soft(output.message).toBe(failure.message);
      send({ type: 'updateBar', bar: bar(3, 4) });
      expect(messages.at(-1)).toEqual(output);
      send({ type: 'updateBars', bars: [bar(0, 2), bar(1, 4), bar(2, 3)] });
      expect(messages.at(-1)?.type).toBe('result');
    });
  },
);
