import { afterEach, describe, expect, it, vi } from 'vitest';

import { TealscriptWorkerFactory, type WorkerError } from '../../src/worker/TealScriptWorker';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent<FromWorkerMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly messages: ToWorkerMessage[] = [];
  terminated = false;

  constructor(
    readonly url: string | URL,
    readonly options?: WorkerOptions,
  ) {
    MockWorker.instances.push(this);
  }

  postMessage(message: ToWorkerMessage): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: FromWorkerMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<FromWorkerMessage>);
  }
}

describe('TealscriptWorker semantic diagnostics', () => {
  const originalWorker = globalThis.Worker;

  afterEach(() => {
    globalThis.Worker = originalWorker;
    MockWorker.instances = [];
    vi.restoreAllMocks();
  });

  it('forwards structured semantic diagnostics to error callbacks', async () => {
    globalThis.Worker = MockWorker as unknown as typeof Worker;
    const errors: WorkerError[] = [];
    const worker = new TealscriptWorkerFactory('tealscript-worker.js').create({
      onError: (error) => errors.push(error),
    });
    const mock = MockWorker.instances[0]!;

    mock.emit({ type: 'ready' });
    await worker.init('study-1', 'indicator("Bad")\nplot(close, caption="Bad")\n', [], {});
    mock.emit({
      type: 'semanticError',
      scriptId: 'study-1',
      message: "line 2:13: Unknown argument 'caption' for plot()",
      line: 2,
      column: 13,
      metadata: { generation: 1, requestId: 1 },
      diagnostics: [
        {
          code: 'unknown-argument',
          message: "Unknown argument 'caption' for plot()",
          severity: 'error',
          line: 2,
          column: 13,
        },
      ],
    });

    expect(errors).toEqual([
      {
        type: 'semantic',
        message: "line 2:13: Unknown argument 'caption' for plot()",
        line: 2,
        column: 13,
        diagnostics: [
          {
            code: 'unknown-argument',
            message: "Unknown argument 'caption' for plot()",
            severity: 'error',
            line: 2,
            column: 13,
          },
        ],
      },
    ]);
  });

  it('ignores stale semantic diagnostics after a newer result settles', async () => {
    globalThis.Worker = MockWorker as unknown as typeof Worker;
    const onError = vi.fn();
    const onResult = vi.fn();
    const worker = new TealscriptWorkerFactory('tealscript-worker.js').create({
      onError,
      onResult,
    });
    const mock = MockWorker.instances[0]!;

    mock.emit({ type: 'ready' });
    await worker.init('study-1', 'indicator("OK")\nplot(close)\n', [], {});
    mock.emit({
      type: 'result',
      scriptId: 'study-1',
      plots: [],
      drawings: [],
      alerts: [],
      logs: [],
      inputs: [],
      output: {
        plots: [],
        drawings: [],
        alerts: [],
        logs: [],
        inputs: [],
        metadata: { generation: 1, requestId: 1 },
      },
    });
    mock.emit({
      type: 'semanticError',
      scriptId: 'study-1',
      message: "line 2:13: Unknown argument 'caption' for plot()",
      line: 2,
      column: 13,
      metadata: { generation: 1, requestId: 1 },
      diagnostics: [
        {
          code: 'unknown-argument',
          message: "Unknown argument 'caption' for plot()",
          severity: 'error',
          line: 2,
          column: 13,
        },
      ],
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores stale realtime updateBar results after a newer tick is requested', async () => {
    globalThis.Worker = MockWorker as unknown as typeof Worker;
    const onResult = vi.fn();
    const worker = new TealscriptWorkerFactory('tealscript-worker.js').create({ onResult });
    const mock = MockWorker.instances[0]!;
    const bar = {
      time: Date.UTC(2024, 0, 1),
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      volume: 1000,
    };

    mock.emit({ type: 'ready' });
    await worker.init('study-1', 'indicator("Realtime")\nplot(close)\n', [bar], {});
    worker.updateBar({ ...bar, close: 101 });
    worker.updateBar({ ...bar, close: 102 });

    expect(mock.messages.map((message) => message.type)).toEqual(['init', 'updateBar', 'updateBar']);
    expect(mock.messages.map((message) => 'metadata' in message ? message.metadata : undefined)).toEqual([
      { generation: 1, requestId: 1 },
      { generation: 1, requestId: 2 },
      { generation: 1, requestId: 3 },
    ]);

    mock.emit({
      type: 'result',
      scriptId: 'study-1',
      plots: [],
      drawings: [],
      alerts: [],
      logs: [],
      inputs: [],
      output: {
        plots: [
          {
            id: 'plot_close',
            type: 'plot',
            title: 'Close',
            values: [101],
            color: '#2196F3',
          },
        ],
        drawings: [],
        alerts: [],
        logs: [],
        inputs: [],
        metadata: { generation: 1, requestId: 2 },
      },
    });
    mock.emit({
      type: 'result',
      scriptId: 'study-1',
      plots: [],
      drawings: [],
      alerts: [],
      logs: [],
      inputs: [],
      output: {
        plots: [
          {
            id: 'plot_close',
            type: 'plot',
            title: 'Close',
            values: [102],
            color: '#2196F3',
          },
        ],
        drawings: [],
        alerts: [],
        logs: [],
        inputs: [],
        metadata: { generation: 1, requestId: 3 },
      },
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      plots: [
        expect.objectContaining({
          title: 'Close',
          values: [102],
        }),
      ],
    }));
  });
});
