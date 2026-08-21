import type { ChartPane, ResolutionString, TealchartWidgetOptions } from './types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIndicatorById } from './indicators/builtinIndicators';
import { clearChartStoreCache } from './state/chartState';
import { TealchartWidget } from './TealchartWidget';

const addIndicatorOptions: { onAddIndicator?: (indicator: unknown) => void } = {};
const addedScripts: Array<{ studyId: string; code: string }> = [];

// The widget calls a wide surface on its UI; this test cares about none of it,
// so every method is a no-op and only onAddIndicator is captured.
vi.mock('./ui/TealchartWidgetUI', () => ({
  TealchartWidgetUI: class {
    constructor(options: { onAddIndicator?: (indicator: unknown) => void }) {
      addIndicatorOptions.onAddIndicator = options.onAddIndicator;
      return new Proxy(this, {
        get: (target, prop) => (prop in target ? Reflect.get(target, prop) : () => undefined),
      });
    }
  },
}));

// The real manager awaits a worker "ready" message that a stub Worker never
// sends, so createStudy would never resolve and the assertion would be vacuous.
vi.mock('./tealscript/TealscriptManager', () => ({
  TealscriptManager: class {
    async addScript(studyId: string, code: string) {
      addedScripts.push({ studyId, code });
    }
    removeScript() {}
    setBars() {}
    updateBar() {}
    setInputs() {}
    dispose() {}
    getPlots() {
      return [];
    }
    getDrawings() {
      return [];
    }
  },
}));

vi.mock('./GapDetectionManager', () => ({
  GapDetectionManager: class {
    start() {}
    stop() {}
    dispose() {}
    onBars() {}
  },
}));

interface WidgetInternals {
  _paneManager: { getIndicatorPanes: () => ChartPane[] };
}

function createWidget(overrides: Partial<TealchartWidgetOptions> = {}): TealchartWidget {
  const container = document.createElement('div');
  return new TealchartWidget(container, {
    container,
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    datafeed: {
      onReady: (cb: (configuration: unknown) => void) => setTimeout(() => cb({}), 0),
      resolveSymbol: () => {},
      getBars: () => {},
      subscribeBars: () => {},
      unsubscribeBars: () => {},
searchSymbols: () => {},
    } as unknown as TealchartWidgetOptions['datafeed'],
    gapDetection: { enabled: false },
    disableDebugOverlay: true,
    disable_default_layout_persistence: true,
    createTealscriptWorker: () =>
      ({
        postMessage() {},
        addEventListener() {},
        removeEventListener() {},
        terminate() {},
      }) as unknown as Worker,
    ...overrides,
  });
}

describe('TealchartWidget indicator panes', () => {
  beforeEach(() => {
    clearChartStoreCache();
    addIndicatorOptions.onAddIndicator = undefined;
    addedScripts.length = 0;
  });

  // Both the study-create callback and the createStudy().then() used to register
  // a pane, so every non-overlay indicator arrived as two identical panes and
  // had to be removed twice. Native never did this — it registers once.
  it('gives a non-overlay indicator exactly one pane', async () => {
    const widget = createWidget();
    const macd = getIndicatorById('macd');
    expect(macd).toBeDefined();
    expect(macd?.overlay).toBe(false);

    expect(addIndicatorOptions.onAddIndicator).toBeInstanceOf(Function);
    addIndicatorOptions.onAddIndicator?.(macd);

    await vi.waitFor(() => {
      const panes = (widget as unknown as WidgetInternals)._paneManager.getIndicatorPanes();
      expect(panes).toHaveLength(1);
    });

    const panes = (widget as unknown as WidgetInternals)._paneManager.getIndicatorPanes();
    expect(panes[0].indicatorIds).toHaveLength(1);

    widget.remove();
  });

  // This call site handed `request.name` straight to the compiler, so a built-in
  // id arrived as literal Tealscript: the study was created, nothing plotted.
  // Native has always resolved the id through the registry.
  it('compiles a built-in id as its registry code, not as literal source', async () => {
    const widget = createWidget();
    const macd = getIndicatorById('macd');
    expect(macd?.code).toBeTruthy();

    await widget.activeChart().createStudy('macd', false, false);

    await vi.waitFor(() => expect(addedScripts).toHaveLength(1));
    expect(addedScripts[0].code).toBe(macd?.code);
    expect(addedScripts[0].code).not.toBe('macd');

    widget.remove();
  });

  it('still treats raw Tealscript source as the code it is', async () => {
    const widget = createWidget();
    const source = '//@version=1\nplot(close)';

    await widget.activeChart().createStudy(source, true, false);

    await vi.waitFor(() => expect(addedScripts).toHaveLength(1));
    expect(addedScripts[0].code).toBe(source);

    widget.remove();
  });
});
