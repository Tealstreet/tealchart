import type { Bar } from '../../src/runtime/context';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';
import type { TealscriptWorker, WorkerError, WorkerResult } from '../../src/worker/TealScriptWorker';

import { expect, vi } from 'vitest';

export const lifecycleBars = (closes: number[]): Bar[] =>
  closes.map((close, index) => ({
    time: (index + 1) * 60_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 10,
  }));

export async function withLifecycleWorker(
  check: (
    worker: TealscriptWorker,
    results: WorkerResult[],
    messages: FromWorkerMessage[],
    replay: (message: FromWorkerMessage) => void,
  ) => Promise<void>,
) {
  vi.resetModules();
  const messages: FromWorkerMessage[] = [];
  const results: WorkerResult[] = [];
  const errors: WorkerError[] = [];
  const instances: LoopbackWorker[] = [];
  const endpoint = {
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => {
      const cloned = structuredClone(message);
      messages.push(cloned);
      instances[0]?.emit(cloned);
    },
  };
  class LoopbackWorker {
    onmessage: ((event: MessageEvent<FromWorkerMessage>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    constructor() {
      instances.push(this);
      queueMicrotask(() => this.emit(messages[0]!));
    }
    postMessage(message: ToWorkerMessage) {
      endpoint.onmessage!({ data: structuredClone(message) } as MessageEvent<ToWorkerMessage>);
    }
    emit(message: FromWorkerMessage) {
      this.onmessage?.({ data: structuredClone(message) } as MessageEvent<FromWorkerMessage>);
    }
    terminate() {}
  }
  vi.stubGlobal('self', endpoint);
  vi.stubGlobal('Worker', LoopbackWorker);
  let worker: TealscriptWorker | undefined;
  try {
    await import('../../src/worker/worker');
    expect(messages).toEqual([{ type: 'ready' }]);
    const { TealscriptWorkerFactory } = await import('../../src/worker/TealScriptWorker');
    worker = new TealscriptWorkerFactory('synthetic-worker.js').create({
      onResult: (result) => results.push(result),
      onError: (error) => errors.push(error),
    });
    await check(worker, results, messages, (message) => instances[0]!.emit(message));
    expect(errors).toEqual([]);
  } finally {
    worker?.dispose();
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}
