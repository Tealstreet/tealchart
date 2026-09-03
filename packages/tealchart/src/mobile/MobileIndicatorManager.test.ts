import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type { Bar, TealscriptRequestDataMessage } from '../types';
import type { PlotOutput } from '@tealstreet/tealscript';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getIndicatorById } from '../indicators/builtinIndicators';
import { createResultMessage } from '@tealstreet/tealscript';
import { clearChartStoreCache } from '../state/chartState';
import { MobileIndicatorManager } from './MobileIndicatorManager';
import { MOBILE_TEALSCRIPT_CAPABILITY_BASELINE } from './mobileTealscriptCapabilityBaseline';

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 1000 + index,
  }));
}

function expectWebViewRequired(onError: ReturnType<typeof vi.fn>, scriptId: string): void {
  expect(onError).toHaveBeenCalledWith(
    scriptId,
    expect.objectContaining({
      type: 'runtime',
      severity: 'error',
      code: 'mobile-tealscript-webview-required',
      message: 'Mobile TealScript execution requires the compiled WebView host.',
    }),
  );
}

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

function flushWorkerInit(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('MobileIndicatorManager custom Tealscript indicators', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('fails loudly for built-in TealScript indicators until the WebView host lands', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(40));

    const momentum = getIndicatorById('momentum');
    const bollingerBands = getIndicatorById('bollinger-bands');
    expect(momentum).toBeDefined();
    expect(bollingerBands).toBeDefined();

    const momentumId = manager.addIndicator(momentum!);
    const bollingerBandsId = manager.addIndicator(bollingerBands!);

    expect(manager.getPlots()).toHaveLength(0);
    expectWebViewRequired(onError, momentumId);
    expectWebViewRequired(onError, bollingerBandsId);
  });

  it('adds caller-provided TealScript metadata while failing execution loudly', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(3));

    const instanceId = manager.addTealscriptIndicator({
      id: 'ai-wma',
      name: 'AI WMA',
      overlay: true,
      code: 'indicator("AI WMA", overlay=true, format=format.volume, precision=0, scale=scale.right)\nplot(close)',
    });

    expect(instanceId).toBe('ai-wma');
    expect(manager.getIndicator(instanceId)?.indicator.name).toBe('AI WMA');
    expect(manager.getIndicatorPaneInfo()[instanceId]).toMatchObject({
      name: 'AI WMA',
      overlay: true,
    });
    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getDrawings()).toHaveLength(0);
    expectWebViewRequired(onError, instanceId);
  });

  it('does not expose stale drawings when TealScript execution is unavailable', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'drawing-study',
      name: 'Drawing Study',
      overlay: true,
      code: 'indicator("Drawing Study", overlay=true)\nlabel.new(bar_index, close, text="mark")',
    });

    expect(manager.getDrawings()).toHaveLength(0);
    expectWebViewRequired(onError, instanceId);
  });

  it('removes custom TealScript pane metadata by instance ID', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'ai-close',
      code: 'indicator("AI Close")\nplot(close)',
    });

    expect(manager.getPlots()).toHaveLength(0);

    manager.removeIndicator(instanceId);

    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getDrawings()).toHaveLength(0);
    expect(manager.getIndicator(instanceId)).toBeUndefined();
    expect(manager.getIndicatorPaneInfo()[instanceId]).toBeUndefined();
  });

  it('toggles custom TealScript visibility without removing layout metadata', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'toggle-study',
      code: 'indicator("Toggle Study")\nplot(close)',
    });

    expect(manager.getPlots()).toHaveLength(0);

    manager.setIndicatorVisibility(instanceId, false);

    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getLayoutIndicators()[0]).toMatchObject({
      id: instanceId,
      isVisible: false,
    });

    manager.toggleIndicatorVisibility(instanceId);

    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getLayoutIndicators()[0]).toMatchObject({
      id: instanceId,
      isVisible: true,
    });
  });

  it('returns an instance ID and reports parse errors for invalid TealScript', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'broken-parse',
      code: 'indicator("Broken"\nplot(close)',
    });

    expect(instanceId).toBe('broken-parse');
    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'parse',
        severity: 'error',
        message: expect.any(String),
        line: expect.any(Number),
        column: expect.any(Number),
      }),
    );
  });

  it('reports parse errors from built-in indicators', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const indicator: BuiltinIndicator = {
      id: 'broken-builtin',
      name: 'Broken Builtin',
      category: 'other',
      overlay: false,
      code: 'indicator("Broken Builtin"\nplot(close)',
    };
    const instanceId = manager.addIndicator(indicator);

    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'parse',
        severity: 'error',
        message: expect.any(String),
      }),
    );
  });

  it('upserts caller-stable custom TealScript IDs without stale output', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const firstId = manager.addTealscriptIndicator({
      id: 'stable-study',
      name: 'First',
      code: 'indicator("First")\nplot(close)',
    });
    const secondId = manager.addTealscriptIndicator({
      id: 'stable-study',
      name: 'Second',
      code: 'indicator("Second")\nplot(open)',
    });

    expect(secondId).toBe(firstId);
    expect(manager.getIndicators()).toHaveLength(1);
    expect(manager.getIndicator(secondId)?.indicator.name).toBe('Second');
    expect(manager.getPlots()).toHaveLength(0);
  });

  it('keeps non-overlay indicator panes present even when execution is unavailable', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(3));

    const instanceId = manager.addTealscriptIndicator({
      id: 'pane-study',
      code: 'indicator("Pane Study")\nplot(close)',
      overlay: false,
    });

    const indicatorPane = manager
      .getUnifiedLayout()
      .panes.find((pane) => pane.type === 'indicator' && pane.indicatorIds?.includes(instanceId));

    expect(indicatorPane).toBeDefined();
  });

  it('exports built-in indicator metadata for layout persistence', () => {
    const manager = new MobileIndicatorManager();

    const instanceId = manager.addTealscriptIndicator({
      id: 'study_1',
      builtinId: 'sma',
      code: 'indicator("SMA", overlay=true)\nplot(close)',
      name: 'SMA',
      overlay: true,
      inputs: { length: 20 },
    });

    expect(manager.getLayoutIndicators()).toEqual([
      {
        id: instanceId,
        name: 'SMA',
        builtinId: 'sma',
        inputs: { length: 20 },
        styleOverrides: undefined,
        isVisible: true,
        createdAt: 0,
      },
    ]);
  });

  it('reports the WebView requirement once until the error changes', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'broken-runtime',
      code: 'indicator("Broken Runtime")\nplot(missingRuntime(close))',
    });

    manager.setBars(makeBars(3));

    expect(instanceId).toBe('broken-runtime');
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expectWebViewRequired(onError, instanceId);
  });

  it('fails loudly for request-backed scripts until the WebView host lands', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'mobile-request-provider',
      code: 'indicator("Mobile Request")\nplot(request.security("EXT", "D", close))',
    });

    expect(instanceId).toBe('mobile-request-provider');
    expectWebViewRequired(onError, instanceId);
  });

  it('executes TealScript through a supplied WebView worker factory', async () => {
    const worker = new FakeWorker();
    const manager = new MobileIndicatorManager({
      createWorker: () => worker as unknown as Worker,
    });
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'mobile-webview-study',
      code: 'indicator("Mobile WebView")\nplot(close)',
      inputs: { length: 2 },
    });

    worker.emit({ type: 'ready' });
    await flushWorkerInit();

    expect(worker.messages[0]).toMatchObject({
      type: 'init',
      scriptId: instanceId,
      inputs: { length: 2 },
      bars: makeBars(2),
      runtime: {
        backend: {},
      },
    });

    const plot: PlotOutput = {
      id: 'plot_close',
      type: 'plot',
      title: 'Close',
      values: [101, 102],
      color: '#ffffff',
    };
    worker.emit(createResultMessage(instanceId, {
      alerts: [],
      drawings: [],
      inputs: [],
      plots: [plot],
      profile: {
        executionMode: 'compiled',
        selectedBackend: 'compiled',
        backendSelectionSource: 'default',
        elapsedMs: 2,
        bars: 2,
        statements: 1,
        expressions: 1,
        builtinCalls: 1,
        requestContexts: 0,
        maxBarsBack: 0,
        errors: 0,
      },
    }));

    expect(manager.getPlots()).toEqual([{ ...plot, scriptId: instanceId }]);
  });

  it('adapts mobile request datafeeds to worker requestData messages', async () => {
    const worker = new FakeWorker();
    const manager = new MobileIndicatorManager({
      createWorker: () => worker as unknown as Worker,
      getRequestDatafeed: () => ({
        getBars: () => ({
          ok: true,
          context: {
            symbol: 'EXT',
            timeframe: 'D',
            bars: makeBars(2),
          },
        }),
      }),
    });
    manager.setBars(makeBars(2));
    const instanceId = manager.addTealscriptIndicator({
      id: 'mobile-request-provider',
      code: 'indicator("Mobile Request")\nplot(request.security("EXT", "D", close))',
    });

    worker.emit({ type: 'ready' });
    await flushWorkerInit();
    worker.emit({
      type: 'requestData',
      scriptId: instanceId,
      requestId: 7,
      generation: 1,
      kind: 'bars',
      query: { symbol: 'EXT', timeframe: 'D' },
    } satisfies TealscriptRequestDataMessage);
    await flushWorkerInit();

    expect(worker.messages.at(-1)).toMatchObject({
      type: 'requestDataResult',
      scriptId: instanceId,
      requestId: 7,
      generation: 1,
      kind: 'bars',
      ok: true,
      value: {
        symbol: 'EXT',
        timeframe: 'D',
        bars: makeBars(2),
      },
    });
  });

  it('pins the measured mobile TealScript capability gap against the web path', () => {
    expect(
      MOBILE_TEALSCRIPT_CAPABILITY_BASELINE.map(({ capability, mobileStatus, webStatus }) => ({
        capability,
        mobileStatus,
        webStatus,
      })),
    ).toEqual([
      {
        capability: 'custom-source save and plot handoff',
        mobileStatus: 'supported',
        webStatus: 'supported',
      },
      {
        capability: 'drawing render handoff',
        mobileStatus: 'supported',
        webStatus: 'supported',
      },
      {
        capability: 'parse and runtime diagnostics',
        mobileStatus: 'supported',
        webStatus: 'supported',
      },
      {
        capability: 'request-backed scripts',
        mobileStatus: 'supported',
        webStatus: 'supported',
      },
      {
        capability: 'imported Pine libraries',
        mobileStatus: 'supported',
        webStatus: 'supported',
      },
    ]);
  });

  it('fails loudly for imported-library scripts until the WebView host lands', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'mobile-imported-library',
      code: '\nimport TestUser/RangeTools/1 as rt\nindicator("Mobile Imported Library")\nplot(rt.adjusted(close))\n',
    });

    expect(instanceId).toBe('mobile-imported-library');
    expect(manager.getPlots()).toHaveLength(0);
    expectWebViewRequired(onError, instanceId);
  });
});

describe('MobileIndicatorManager recomputation cache', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  function addTwo(manager: MobileIndicatorManager) {
    const left = manager.addTealscriptIndicator({
      id: 'left',
      name: 'Left',
      code: 'indicator("Left")\nplot(close)',
    });
    const right = manager.addTealscriptIndicator({
      id: 'right',
      name: 'Right',
      code: 'indicator("Right")\nplot(open)',
    });
    return { left, right };
  }

  it('leaves indicators registered when one is hidden', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left, right } = addTwo(manager);

    manager.setIndicatorVisibility(right, false);

    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getIndicator(left)).toBeDefined();
    expect(manager.getIndicator(right)).toBeDefined();
    expect(manager.getLayoutIndicators().find((indicator) => indicator.id === right)).toMatchObject({
      isVisible: false,
    });
  });

  it('leaves existing indicators registered when another is added or removed', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);

    const added = manager.addTealscriptIndicator({ id: 'third', code: 'indicator("Third")\nplot(high)' });
    expect(manager.getIndicator(left)).toBeDefined();

    manager.removeIndicator(added);
    expect(manager.getIndicator(left)).toBeDefined();
    expect(manager.getIndicator(added)).toBeUndefined();
    expect(manager.getPlots()).toHaveLength(0);
  });

  it('updates metadata without producing stale plots when inputs change', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(6));
    const { left } = addTwo(manager);
    const tuned = manager.addTealscriptIndicator({
      id: 'tuned',
      code: 'indicator("Tuned")\nlength = input.int(2, "length")\nplot(ta.sma(close, length))',
    });

    manager.updateInputs(tuned, { input_length: 4 });

    expect(manager.getIndicator(left)).toBeDefined();
    expect(manager.getIndicator(tuned)?.inputs).toEqual({ input_length: 4 });
    expect(manager.getPlots()).toHaveLength(0);
  });

  it('keeps TealScript unavailable when bars advance', () => {
    const manager = new MobileIndicatorManager();
    const bars = makeBars(4);
    manager.setBars(bars);
    const { left } = addTwo(manager);

    bars.push({ time: 1_700_000_240_000, open: 104, high: 106, low: 103, close: 105, volume: 1004 });
    manager.setBars(bars);

    expect(manager.getIndicator(left)).toBeDefined();
    expect(manager.getPlots()).toHaveLength(0);
  });

  it('separates the plot revision from the indicator revision', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { right } = addTwo(manager);

    const indicatorsAfterAdd = manager.getIndicatorsRevision();
    const plotsAfterAdd = manager.getPlotsRevision();

    manager.setBars(makeBars(5));
    expect(manager.getIndicatorsRevision()).toBe(indicatorsAfterAdd);
    expect(manager.getPlotsRevision()).toBe(plotsAfterAdd);

    manager.setIndicatorVisibility(right, false);
    expect(manager.getIndicatorsRevision()).toBeGreaterThan(indicatorsAfterAdd);
  });

  it('advances the indicator revision for a style override', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);
    const before = manager.getIndicatorsRevision();

    manager.updateStyleOverrides(left, [{ plotIndex: 0, color: '#ff0000' }]);

    expect(manager.getIndicatorsRevision()).toBeGreaterThan(before);
  });

  it('keeps the plot arrays when bars go empty on an already empty chart', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars([]);
    const before = manager.getPlots();
    const revisionBefore = manager.getPlotsRevision();

    manager.setBars([]);

    expect(manager.getPlots()).toBe(before);
    expect(manager.getPlotsRevision()).toBe(revisionBefore);
  });

  it('keeps the plot array identity when a recompute changes nothing', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);
    const before = manager.getPlots();
    const revisionBefore = manager.getPlotsRevision();

    manager.updateInputs(left, {});

    expect(manager.getIndicator(left)).toBeDefined();
    expect(manager.getPlots()).toBe(before);
    expect(manager.getPlotsRevision()).toBe(revisionBefore);
  });
});
