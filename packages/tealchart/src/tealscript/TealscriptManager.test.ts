import { describe, expect, it } from 'vitest';

import {
  createResultMessage,
  type Bar,
  type DrawingOutput,
  type PlotOutput,
  type Program,
  type RuntimeProfile,
  type WorkerError,
} from '@tealstreet/tealscript';

import { TealscriptManager } from './TealscriptManager';
import type { TealscriptExecutionTelemetry } from '../types';

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
  runtime?: unknown;
  libraries?: unknown;
  metadata?: {
    generation?: number;
    requestId?: number;
    requestKind?: 'full' | 'incremental';
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

function runtimeProfile(overrides: Partial<RuntimeProfile> = {}): RuntimeProfile {
  return {
    executionMode: 'compiled',
    selectedBackend: 'compiled',
    backendSelectionSource: 'default',
    elapsedMs: 12,
    bars: 2,
    statements: 3,
    expressions: 4,
    builtinCalls: 5,
    requestContexts: 0,
    maxBarsBack: 0,
    errors: 0,
    ...overrides,
  };
}

function flushWorkerInit(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

const NON_ERROR_DIAGNOSTIC_FORBIDDEN_SUBSTRINGS = [
  'script is invalid',
  'script failed',
  'failed to run',
  'compile failed',
  'broken script',
];

function expectNonErrorDiagnosticMessage(message: string): void {
  const normalized = message.toLowerCase();
  for (const forbidden of NON_ERROR_DIAGNOSTIC_FORBIDDEN_SUBSTRINGS) {
    expect(normalized).not.toContain(forbidden);
  }
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

  it('accepts full init results when a live update is already pending', async () => {
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
    expect(initMessage?.metadata).toEqual({ generation: 1, requestId: 1, requestKind: 'full' });
    expect(updateBarMessage?.metadata).toEqual({ generation: 1, requestId: 2, requestKind: 'incremental' });

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
    }));
    expect(plotUpdates).toEqual([[{ ...plot, scriptId: 'study-1' }]]);

    worker.emit({
      type: 'error',
      scriptId: 'study-1',
      message: 'init error',
      metadata: initMessage?.metadata,
    });

    expect(plotUpdates).toHaveLength(1);
    expect(errors).toHaveLength(0);

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

  it('does not clear current plots from an empty incremental update result', async () => {
    const worker = new FakeWorker();
    const plotUpdates: PlotOutput[][] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
    }));

    manager.updateBar(bar);
    const updateBarMessage = worker.messages[1] as PostedWorkerMessage;
    expect(updateBarMessage?.metadata).toEqual({ generation: 1, requestId: 2, requestKind: 'incremental' });

    worker.emit(createResultMessage('study-1', {
      plots: [],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: updateBarMessage?.metadata,
    }));

    expect(plotUpdates).toHaveLength(2);
    expect(plotUpdates[1]).toEqual([{ ...plot, scriptId: 'study-1' }]);
  });

  it('emits compact execution telemetry for accepted worker results', async () => {
    const worker = new FakeWorker();
    const telemetry: TealscriptExecutionTelemetry[] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onExecution: (summary) => telemetry.push(summary),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
      profile: runtimeProfile({
        executionMode: 'closure',
        selectedBackend: 'closure',
        backendSelectionSource: 'flag',
        elapsedMs: 8,
        bars: 2,
      }),
    }));

    expect(telemetry).toEqual([
      {
        scriptId: 'study-1',
        status: 'ok',
        outputKind: 'visual',
        executionMode: 'closure',
        selectedBackend: 'closure',
        backendSelectionSource: 'flag',
        fallbackKind: 'none',
        elapsedMs: 8,
        bars: 2,
        requestKind: 'full',
        generation: 1,
        plots: 1,
        drawings: 0,
        alerts: 0,
        logs: 0,
        runtimeErrors: 0,
      },
    ]);
  });

  it('classifies successful executions with no retained output', async () => {
    const worker = new FakeWorker();
    const telemetry: TealscriptExecutionTelemetry[] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onExecution: (summary) => telemetry.push(summary),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [],
      drawings: [],
      alerts: [],
      logs: [],
      inputs: [],
      metadata: initMessage?.metadata,
      profile: runtimeProfile(),
    }));

    expect(telemetry[0]).toMatchObject({
      scriptId: 'study-1',
      status: 'empty-output',
      outputKind: 'empty',
      executionMode: 'compiled',
      selectedBackend: 'compiled',
      plots: 0,
      drawings: 0,
      alerts: 0,
      logs: 0,
    });
  });

  it('attributes runtime-error telemetry to the backend profile carried by the worker error', async () => {
    const worker = new FakeWorker();
    const telemetry: TealscriptExecutionTelemetry[] = [];
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
      onExecution: (summary) => telemetry.push(summary),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")\nruntime.error("halt")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit({
      type: 'error',
      scriptId: 'study-1',
      message: 'halt',
      code: 'runtime.error',
      runtimeError: {
        code: 'runtime.error',
        message: 'halt',
        line: 2,
        column: 1,
      },
      profile: runtimeProfile({
        executionMode: 'closure',
        selectedBackend: 'closure',
        backendSelectionSource: 'explicit',
        elapsedMs: 3,
        bars: 1,
        errors: 1,
      }),
      metadata: initMessage?.metadata,
    });

    expect(errors[0]).toMatchObject({
      scriptId: 'study-1',
      error: {
        type: 'runtime',
        severity: 'error',
        code: 'runtime.error',
        profile: {
          executionMode: 'closure',
          selectedBackend: 'closure',
        },
      },
    });
    expect(telemetry).toEqual([
      {
        scriptId: 'study-1',
        status: 'runtime-error',
        outputKind: 'empty',
        executionMode: 'closure',
        selectedBackend: 'closure',
        backendSelectionSource: 'explicit',
        fallbackKind: 'runtime-error',
        elapsedMs: 3,
        bars: 1,
        plots: 0,
        drawings: 0,
        alerts: 0,
        logs: 0,
        runtimeErrors: 1,
      },
    ]);
  });

  it('surfaces realtime compiled fallbacks as actionable nonfatal diagnostics', async () => {
    const worker = new FakeWorker();
    const plotUpdates: PlotOutput[][] = [];
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      onError: (scriptId, error) => errors.push({ scriptId, error }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")\nvarip ticks = 0');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
      profile: {
        executionMode: 'interpreter',
        fallbackReason: 'compiled-worker-stateless-intrabar-reentry: varip-declaration',
        fallbackDiagnostics: [
          {
            reason: 'varip-declaration',
            construct: 'varip declaration ticks',
            message: 'varip declaration ticks keeps intrabar state between realtime ticks.',
            line: 2,
            column: 1,
          },
        ],
        elapsedMs: 1,
        bars: 2,
        statements: 0,
        expressions: 0,
        builtinCalls: 0,
        requestContexts: 0,
        maxBarsBack: 0,
        errors: 0,
      },
    }));
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
      profile: {
        executionMode: 'interpreter',
        fallbackReason: 'compiled-worker-stateless-intrabar-reentry: varip-declaration',
        fallbackDiagnostics: [
          {
            reason: 'varip-declaration',
            construct: 'varip declaration ticks',
            message: 'varip declaration ticks keeps intrabar state between realtime ticks.',
            line: 2,
            column: 1,
          },
        ],
        elapsedMs: 1,
        bars: 2,
        statements: 0,
        expressions: 0,
        builtinCalls: 0,
        requestContexts: 0,
        maxBarsBack: 0,
        errors: 0,
      },
    }));

    expect(plotUpdates).toEqual([
      [{ ...plot, scriptId: 'study-1' }],
      [{ ...plot, scriptId: 'study-1' }],
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      scriptId: 'study-1',
      error: {
        type: 'runtime',
        severity: 'warning',
        code: 'realtime-compiled-fallback',
        line: 2,
        column: 1,
      },
    });
    expect(errors[0]!.error.message).toContain("output stays correct");
    expect(errors[0]!.error.message).toContain("live ticks can be slower");
    expect(errors[0]!.error.message).toContain("Trigger: varip declaration ticks at line 2, column 1");
    expect(errors[0]!.error.message).toContain("remove or rewrite that stateful intrabar construct");
    expectNonErrorDiagnosticMessage(errors[0]!.error.message);
    expect(manager.getAllPlots()).toEqual([{ ...plot, scriptId: 'study-1' }]);
  });

  it('surfaces unsettled init errors when a live update is already pending', async () => {
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

    const [initMessage] = worker.messages as PostedWorkerMessage[];

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
          severity: 'error',
          message: 'init error',
          line: undefined,
          column: undefined,
        },
      },
    ]);
  });

  it('keeps full-history plot series when a live-bar update races worker init', async () => {
    const worker = new FakeWorker();
    const plotUpdates: PlotOutput[][] = [];
    const fullMacdPlot: PlotOutput = {
      ...plot,
      id: 'plot_macd',
      title: 'MACD',
      values: [null, 0.25, 0.5, 0.75],
    };
    const truncatedLivePlot: PlotOutput = {
      ...fullMacdPlot,
      values: [0.75],
    };

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
    });

    manager.setBars([
      bar,
      { ...bar, time: 2, close: 101 },
      { ...bar, time: 3, close: 102 },
      { ...bar, time: 4, close: 103 },
    ]);
    const addScript = manager.addScript('macd', 'indicator("MACD")');
    worker.emit({ type: 'ready' });
    await addScript;
    manager.updateBar({ ...bar, time: 4, close: 104 });

    const [initMessage, updateBarMessage] = worker.messages as PostedWorkerMessage[];

    worker.emit(createResultMessage('macd', {
      plots: [fullMacdPlot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
    }));

    expect(plotUpdates.at(-1)).toEqual([{ ...fullMacdPlot, scriptId: 'macd' }]);

    worker.emit(createResultMessage('macd', {
      plots: [truncatedLivePlot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: updateBarMessage?.metadata,
    }));

    expect(plotUpdates.at(-1)).toEqual([{ ...fullMacdPlot, scriptId: 'macd' }]);
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

  it('surfaces runtime worker error payloads as runtime errors', async () => {
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
      type: 'error',
      scriptId: 'study-1',
      message: 'bad bar',
      code: 'runtime.error',
      runtimeError: {
        code: 'runtime.error',
        message: 'bad bar',
        line: 4,
        column: 5,
      },
      line: 4,
      column: 5,
      metadata: initMessage?.metadata,
    });

    expect(errors).toEqual([
      {
        scriptId: 'study-1',
        error: {
          type: 'runtime',
          severity: 'error',
          message: 'bad bar',
          code: 'runtime.error',
          line: 4,
          column: 5,
          runtimeError: {
            code: 'runtime.error',
            message: 'bad bar',
            line: 4,
            column: 5,
          },
        },
      },
    ]);
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
          severity: 'error',
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

  it('passes runtime chart metadata into worker init messages', async () => {
    const worker = new FakeWorker();
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      getRuntimeOptions: () => ({
        syminfo: {
          ticker: 'NASDAQ:AAPL',
          timezone: 'America/New_York',
        },
        timeframe: {
          period: '1D',
          multiplier: 1,
          isminutes: false,
          isdaily: true,
          isweekly: false,
          ismonthly: false,
          isintraday: false,
          isseconds: false,
          isticks: false,
        },
      }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    expect(initMessage.type).toBe('init');
    expect(initMessage.runtime).toEqual({
      syminfo: {
        ticker: 'NASDAQ:AAPL',
        timezone: 'America/New_York',
      },
      timeframe: {
        period: '1D',
        multiplier: 1,
        isminutes: false,
        isdaily: true,
        isweekly: false,
        ismonthly: false,
        isintraday: false,
        isseconds: false,
        isticks: false,
      },
    });
  });

  it('passes host library registries into worker init messages', async () => {
    const worker = new FakeWorker();
    const libraries = new Map<string, Program>();
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      getLibraries: () => libraries,
    });

    const addScript = manager.addScript('study-1', 'import sig from "sig"\nindicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    expect(initMessage.type).toBe('init');
    expect(initMessage.libraries).toBe(libraries);
  });

  it('resolves worker request data through the host adapter', async () => {
    const worker = new FakeWorker();
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      resolveRequestData: async (request) => {
        expect(request.kind).toBe('currency_rate');
        return { ok: true, value: 1.25 };
      },
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit({
      type: 'requestData',
      scriptId: 'study-1',
      requestId: 101,
      generation: 1,
      kind: 'currency_rate',
      query: {
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        time: 1,
      },
    });
    await flushWorkerInit();

    expect(worker.messages.at(-1)).toEqual({
      type: 'requestDataResult',
      scriptId: 'study-1',
      requestId: 101,
      generation: 1,
      kind: 'currency_rate',
      ok: true,
      value: 1.25,
    });
  });

  it('returns a typed request data miss when no host adapter is configured', async () => {
    const worker = new FakeWorker();
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit({
      type: 'requestData',
      scriptId: 'study-1',
      requestId: 102,
      generation: 1,
      kind: 'currency_rate',
      query: {
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        time: 1,
      },
    });
    await flushWorkerInit();

    expect(worker.messages.at(-1)).toEqual({
      type: 'requestDataResult',
      scriptId: 'study-1',
      requestId: 102,
      generation: 1,
      kind: 'currency_rate',
      ok: false,
      error: {
        code: 'missing-provider',
        message: 'No Tealscript request data resolver configured',
      },
    });
    expect(errors).toEqual([
      {
        scriptId: 'study-1',
        error: {
          type: 'runtime',
          severity: 'warning',
          code: 'request-data-unavailable',
          message: expect.stringContaining('request.currency_rate USD/EUR'),
        },
      },
    ]);
    expect(errors[0]!.error.message).toContain('not supported');
    expect(errors[0]!.error.message).toContain('The script is valid');
    expectNonErrorDiagnosticMessage(errors[0]!.error.message);
  });

  it('surfaces request data not-seeded misses without clearing rendered output', async () => {
    const worker = new FakeWorker();
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];
    const plotUpdates: PlotOutput[][] = [];
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      resolveRequestData: async () => ({
        ok: false,
        error: {
          code: 'not-found',
          message: 'No seeded bars for EXT D',
        },
      }),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    const [initMessage] = worker.messages as PostedWorkerMessage[];
    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [],
      alerts: [],
      inputs: [],
      metadata: initMessage?.metadata,
    }));

    worker.emit({
      type: 'requestData',
      scriptId: 'study-1',
      requestId: 103,
      generation: 1,
      kind: 'bars',
      query: {
        symbol: 'EXT',
        timeframe: 'D',
      },
    });
    await flushWorkerInit();

    expect(worker.messages.at(-1)).toEqual({
      type: 'requestDataResult',
      scriptId: 'study-1',
      requestId: 103,
      generation: 1,
      kind: 'bars',
      ok: false,
      error: {
        code: 'not-found',
        message: 'No seeded bars for EXT D',
      },
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.error).toMatchObject({
      type: 'runtime',
      severity: 'warning',
      code: 'request-data-unavailable',
    });
    expect(errors[0]!.error.message).toContain('request.security symbol EXT timeframe D');
    expect(errors[0]!.error.message).toContain('not seeded');
    expect(errors[0]!.error.message).toContain('Provider detail: No seeded bars for EXT D');
    expectNonErrorDiagnosticMessage(errors[0]!.error.message);
    expect(plotUpdates).toEqual([[{ ...plot, scriptId: 'study-1' }]]);
    expect(manager.getAllPlots()).toEqual([{ ...plot, scriptId: 'study-1' }]);
  });

  it('distinguishes request data provider failures from not-seeded misses', async () => {
    const worker = new FakeWorker();
    const errors: Array<{ scriptId: string; error: WorkerError }> = [];
    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onError: (scriptId, error) => errors.push({ scriptId, error }),
      resolveRequestData: async () => {
        throw new Error('upstream footprint cache failed');
      },
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit({
      type: 'requestData',
      scriptId: 'study-1',
      requestId: 104,
      generation: 1,
      kind: 'footprint',
      query: {
        symbol: 'BTCUSDT',
        timeframe: '1',
        ticksPerRow: 10,
        valueAreaPercent: 70,
        imbalancePercent: 300,
        time: 1,
      },
    });
    await flushWorkerInit();

    expect(worker.messages.at(-1)).toEqual({
      type: 'requestDataResult',
      scriptId: 'study-1',
      requestId: 104,
      generation: 1,
      kind: 'footprint',
      ok: false,
      error: {
        code: 'provider-error',
        message: 'upstream footprint cache failed',
      },
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.error.message).toContain('request.footprint BTCUSDT timeframe 1');
    expect(errors[0]!.error.message).toContain('provider failed');
    expect(errors[0]!.error.message).toContain('upstream footprint cache failed');
  });
});
