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

function flushWorkerInit(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

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
    const declarations: unknown[] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      onDrawingsUpdated: (drawings) => drawingUpdates.push(drawings),
      onDeclarationDiscovered: (_scriptId, declaration) => declarations.push(declaration),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [drawing],
      alerts: [],
      inputs: [],
      declaration: {
        title: 'Declaration Title',
        shortTitle: 'Decl',
        overlay: true,
        precision: 4,
        dynamicRequests: false,
        drawingLimits: {
          label: 50,
          line: 50,
          box: 50,
          polyline: 50,
        },
      },
      metadata: {
        generation: 1,
        requestId: 1,
      },
    }));

    expect(plotUpdates).toHaveLength(1);
    expect(drawingUpdates).toHaveLength(1);
    expect(plotUpdates[0]).toEqual([{ ...plot, scriptId: 'study-1' }]);
    expect(drawingUpdates[0]).toEqual([{ ...drawing, scriptId: 'study-1' }]);
    expect(manager.getDeclaration('study-1')).toMatchObject({
      title: 'Declaration Title',
      overlay: true,
      precision: 4,
    });
    expect(declarations).toHaveLength(1);
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
    manager.updateBar(bar);

    const [initMessage, updateBarMessage] = worker.messages as PostedWorkerMessage[];
    expect(initMessage?.metadata).toEqual({ generation: 1, requestId: 1 });
    expect(updateBarMessage?.metadata).toEqual({ generation: 1, requestId: 2 });

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
      metadata: updateBarMessage?.metadata,
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
    manager.updateBar(bar);

    const [initMessage, updateBarMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: updateBarMessage?.metadata,
    }));
    worker.emit({
      type: 'error',
      scriptId: 'study-1',
      message: 'old error',
      metadata: initMessage?.metadata,
    });

    expect(errors).toHaveLength(0);
  });

  it('surfaces semantic worker diagnostics as semantic errors', async () => {
    const worker = new FakeWorker();
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit({
      type: 'semanticError',
      scriptId: 'study-1',
      message: 'Unknown identifier: missing',
      diagnostics: [
        {
          code: 'unknown-identifier',
          message: 'Unknown identifier: missing',
          severity: 'error',
          line: 3,
          column: 7,
        },
      ],
      line: 3,
      column: 7,
      metadata: initMessage?.metadata,
    });

    expect(errors).toEqual([
      {
        scriptId: 'study-1',
        error: {
          type: 'semantic',
          message: 'Unknown identifier: missing',
          line: 3,
          column: 7,
          diagnostics: [
            {
              code: 'unknown-identifier',
              message: 'Unknown identifier: missing',
              severity: 'error',
              line: 3,
              column: 7,
            },
          ],
        },
      },
    ]);
  });

  it('restarts workers on full bar replacements and ignores stale callbacks', async () => {
    const workers: FakeWorker[] = [];
    const plotUpdates: PlotOutput[][] = [];
    const createWorker = (): Worker => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    };

    const manager = new TealscriptManager({
      createWorker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    workers[0].emit({ type: 'ready' });
    await addScript;

    manager.setBars([bar]);
    expect(workers).toHaveLength(2);
    expect(workers[0].terminated).toBe(true);

    workers[0].emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: { generation: 1, requestId: 1 },
    }));
    expect(plotUpdates).toHaveLength(0);

    workers[1].emit({ type: 'ready' });
    await flushWorkerInit();

    const restartInit = workers[1].messages[0] as PostedWorkerMessage & { bars?: Bar[] };
    expect(restartInit.type).toBe('init');
    expect(restartInit.bars).toEqual([bar]);

    workers[1].emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: restartInit.metadata,
    }));

    expect(plotUpdates).toEqual([[{ ...plot, scriptId: 'study-1' }]]);
  });

  it('uses fresh bars when updates arrive before restarted workers are ready', async () => {
    const workers: FakeWorker[] = [];
    const createWorker = (): Worker => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    };
    const latestBar: Bar = { ...bar, time: 2, close: 104 };

    const manager = new TealscriptManager({ createWorker });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    workers[0].emit({ type: 'ready' });
    await addScript;

    manager.setBars([bar]);
    manager.setBars([latestBar]);
    expect(workers).toHaveLength(2);

    workers[1].emit({ type: 'ready' });
    await flushWorkerInit();

    const restartInit = workers[1].messages[0] as PostedWorkerMessage & { bars?: Bar[] };
    expect(restartInit.type).toBe('init');
    expect(restartInit.bars).toEqual([latestBar]);
  });

  it('ignores stale callbacks after removing and re-adding the same script id', async () => {
    const workers: FakeWorker[] = [];
    const plotUpdates: PlotOutput[][] = [];
    const createWorker = (): Worker => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    };

    const manager = new TealscriptManager({
      createWorker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
    });

    const firstAdd = manager.addScript('study-1', 'indicator("Old")');
    workers[0].emit({ type: 'ready' });
    await firstAdd;
    manager.removeScript('study-1');

    const secondAdd = manager.addScript('study-1', 'indicator("New")');
    workers[1].emit({ type: 'ready' });
    await secondAdd;
    plotUpdates.length = 0;

    workers[0].emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: { generation: 1, requestId: 1 },
    }));
    expect(plotUpdates).toHaveLength(0);

    const newInit = workers[1].messages[0] as PostedWorkerMessage;
    workers[1].emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: newInit.metadata,
    }));
    expect(plotUpdates).toEqual([[{ ...plot, scriptId: 'study-1' }]]);
  });

  it('restarts workers on input changes with the latest values', async () => {
    const workers: FakeWorker[] = [];
    const createWorker = (): Worker => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    };

    const manager = new TealscriptManager({ createWorker });

    const addScript = manager.addScript('study-1', 'indicator("T")', { length: 14 });
    workers[0].emit({ type: 'ready' });
    await addScript;

    manager.setInputs('study-1', { length: 21 });
    manager.setInputs('study-1', { length: 34 });
    expect(workers).toHaveLength(2);
    expect(workers[0].terminated).toBe(true);

    workers[1].emit({ type: 'ready' });
    await flushWorkerInit();

    const restartInit = workers[1].messages[0] as PostedWorkerMessage & { inputs?: Record<string, unknown> };
    expect(restartInit.type).toBe('init');
    expect(restartInit.inputs).toEqual({ length: 34 });
  });
});
