import { describe, expect, it } from 'vitest';

import { createResultMessage, type Bar, type DrawingOutput, type PlotOutput, type WorkerError } from '@tealstreet/tealscript';

import { TealscriptManager } from './TealscriptManager';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

interface PostedWorkerMessage {
  type: string;
  metadata?: {
    generation?: number;
    requestId?: number;
  };
}

const plot: PlotOutput = {
  id: 'plot_close',
  type: 'plot',
  title: 'Close',
  values: [100, 101],
  color: '#ffffff',
};

const bar: Bar = {
  time: 1,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 10,
};

describe('TealscriptManager', () => {
  it('consumes bundled worker results through legacy update callbacks', async () => {
    const worker = new FakeWorker();
    const drawing: DrawingOutput = {
      id: 'label_1',
      type: 'label',
      barIndex: 1,
      x: 1,
      y: 101,
      text: 'L',
      xloc: 'bar_index',
      yloc: 'price',
      style: 'label.style_label_down',
      color: '#000000',
      textColor: '#ffffff',
      size: 'normal',
    };
    const plotUpdates: PlotOutput[][] = [];
    const drawingUpdates: DrawingOutput[][] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      onDrawingsUpdated: (drawings) => drawingUpdates.push(drawings),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [drawing],
      alerts: [],
      inputs: [],
      metadata: {
        generation: 1,
        requestId: 1,
      },
    }));

    expect(plotUpdates).toHaveLength(1);
    expect(drawingUpdates).toHaveLength(1);
    expect(plotUpdates[0]).toEqual([{ ...plot, scriptId: 'study-1' }]);
    expect(drawingUpdates[0]).toEqual([{ ...drawing, scriptId: 'study-1' }]);
  });

  it('ignores stale bundled worker results without hiding unsettled init errors', async () => {
    const worker = new FakeWorker();
    const plotUpdates: PlotOutput[][] = [];
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      onError: (scriptId, error) => errors.push({ scriptId, error }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;
    manager.setBars([bar]);

    const [initMessage, updateBarsMessage] = worker.messages as PostedWorkerMessage[];
    expect(initMessage?.metadata).toEqual({ generation: 1, requestId: 1 });
    expect(updateBarsMessage?.metadata).toEqual({ generation: 2, requestId: 2 });

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
    }));
    expect(plotUpdates).toHaveLength(0);

    worker.emit({
      type: 'error',
      scriptId: 'study-1',
      message: 'init error',
      metadata: initMessage?.metadata,
    });

    expect(plotUpdates).toEqual([[]]);
    expect(errors).toEqual([
      {
        scriptId: 'study-1',
        error: {
          type: 'runtime',
          message: 'init error',
          line: undefined,
          column: undefined,
        },
      },
    ]);

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: updateBarsMessage?.metadata,
    }));

    expect(plotUpdates).toHaveLength(2);
    expect(plotUpdates[1]).toEqual([{ ...plot, scriptId: 'study-1' }]);
  });

  it('ignores errors from requests older than a settled newer result', async () => {
    const worker = new FakeWorker();
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;
    manager.setBars([bar]);

    const [initMessage, updateBarsMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: updateBarsMessage?.metadata,
    }));
    worker.emit({
      type: 'error',
      scriptId: 'study-1',
      message: 'old error',
      metadata: initMessage?.metadata,
    });

    expect(errors).toHaveLength(0);
  });
});
