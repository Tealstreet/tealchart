import type { ChartSettings } from './state/chartState';
import type { ISaveLoadAdapter } from './transformer/saveLoadIntegration';
import type { TvStudyTemplate } from './transformer/studyTemplate';
import type { ResolutionString, TealchartWidgetOptions } from './types';
import type { IndicatorTemplateCallbacks } from './ui/IndicatorTemplateSelector';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from './state/chartState';
import { TealchartWidget } from './TealchartWidget';

const uiOptions: { indicatorTemplateCallbacks?: IndicatorTemplateCallbacks } = {};
const addedScripts: Array<{ studyId: string; code: string }> = [];

vi.mock('./ui/TealchartWidgetUI', () => ({
  TealchartWidgetUI: class {
    constructor(options: { indicatorTemplateCallbacks?: IndicatorTemplateCallbacks }) {
      uiOptions.indicatorTemplateCallbacks = options.indicatorTemplateCallbacks;
      return new Proxy(this, {
        get: (target, prop) => (prop in target ? Reflect.get(target, prop) : () => undefined),
      });
    }
  },
}));

vi.mock('./tealscript/TealscriptManager', () => ({
  TealscriptManager: class {
    async addScript(studyId: string, code: string) {
      addedScripts.push({ studyId, code });
    }
    removeScript() {}
    setBars() {}
    updateBar() {}
    setInputs() {}
    setScriptVisibility() {}
    toggleScriptVisibility() {}
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
  _chartStore: { settings: { get: () => ChartSettings } };
  _ensureUI: () => void;
  _ui: unknown;
}

const CUSTOM_STUDY = {
  id: 'custom-tealchart-study:study-1',
  name: 'My Bands',
  sourceKind: 'custom_tealchart_study' as const,
  sourceId: 'study-1',
  sourceHash: 'v1',
  category: 'custom',
  description: '',
  overlay: true,
  code: '//@version=1\nplot(close)',
};

function createAdapter(templates: Record<string, string | Record<string, unknown>> = {}) {
  const store = new Map(Object.entries(templates));
  return {
    saveChart: vi.fn(async () => 'layout-1'),
    getChartContent: vi.fn(async () => ''),
    getAllCharts: vi.fn(async () => []),
    removeChart: vi.fn(async () => {}),
    getAllStudyTemplates: vi.fn(async () => Array.from(store.keys()).map((name) => ({ name }))),
    saveStudyTemplate: vi.fn(async ({ name, content }: { name: string; content: string }) => {
      store.set(name, content);
    }),
    removeStudyTemplate: vi.fn(async ({ name }: { name: string }) => {
      store.delete(name);
    }),
    getStudyTemplateContent: vi.fn(async ({ name }: { name: string }) => store.get(name)!),
  };
}

function createWidget(adapter?: ISaveLoadAdapter): TealchartWidget {
  const container = document.createElement('div');
  return new TealchartWidget(container, {
    container,
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    chartKey: 'study-template-test',
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
    ...(adapter ? { save_load_adapter: adapter } : { disable_default_layout_persistence: true }),
    customTealscriptIndicators: [CUSTOM_STUDY],
    createTealscriptWorker: () =>
      ({
        postMessage() {},
        addEventListener() {},
        removeEventListener() {},
        terminate() {},
      }) as unknown as Worker,
  });
}

function storedIndicators(widget: TealchartWidget) {
  return (widget as unknown as WidgetInternals)._chartStore.settings.get().indicators;
}

/** Template the chart starts from: two builtins and a TealScript study. */
function seedTemplate(): TvStudyTemplate {
  const seeder = createWidget();
  seeder.activeChart().applyStudyTemplate({
    panes: [{ sources: [{ type: 'MainSeries', id: '_seriesId', state: {} }], mainSourceId: '_seriesId' }],
    version: 3,
    tealstreet: {
      version: 1,
      engine: 'tealchart',
      tealscriptStudies: [{ sourceId: 'study-1', name: 'My Bands' }],
      pineJsStudies: [],
      tealchartIndicators: [
        { id: 'sma_1', name: 'SMA', builtinId: 'sma', inputs: { length: 50 }, isVisible: true, createdAt: 1 },
        { id: 'macd_1', name: 'MACD', builtinId: 'macd', inputs: {}, isVisible: true, createdAt: 2 },
        { id: 'custom_1', name: 'My Bands', tealscriptStudy: 0, inputs: {}, isVisible: true, createdAt: 3 },
      ],
    },
  });
  const template = seeder.activeChart().createStudyTemplate({}) as TvStudyTemplate;
  seeder.remove();
  clearChartStoreCache();
  return template;
}

const tradingViewRsiTemplate = {
  panes: [
    {
      sources: [
        { type: 'MainSeries', id: '_seriesId', zorder: 0, state: {} },
        {
          type: 'Study',
          id: 'Pine1',
          zorder: 1,
          metaInfo: { id: 'Script@tv-scripting-101', fullId: 'PUB;xyz', description: 'Some Pine' },
          state: {},
        },
      ],
      mainSourceId: '_seriesId',
    },
    {
      sources: [{ type: 'Study', id: 'Rsi1', zorder: 2, metaInfo: { id: 'STD;RSI' }, state: { inputs: {} } }],
      mainSourceId: 'Rsi1',
    },
  ],
  version: 3,
};

describe('TealchartWidget study templates', () => {
  beforeEach(() => {
    clearChartStoreCache();
    uiOptions.indicatorTemplateCallbacks = undefined;
    addedScripts.length = 0;
  });

  it('createStudyTemplate returns TradingView study-template JSON of the current indicators', () => {
    const template = seedTemplate();
    expect(template.version).toBe(3);
    expect(template.panes[0].sources[0]).toMatchObject({ type: 'MainSeries' });
    expect(template.panes.flatMap((pane) => pane.sources).map((source) => source.id)).toEqual([
      '_seriesId',
      'sma_1',
      'macd_1',
    ]);
    expect(template.tealstreet?.tealscriptStudies).toEqual([
      { sourceId: 'study-1', sourceHash: 'v1', name: 'My Bands' },
    ]);
  });

  it('applyStudyTemplate replaces every indicator and leaves drawings alone', async () => {
    const widget = createWidget();
    widget.activeChart().applyStudyTemplate(seedTemplate());
    await vi.waitFor(() => expect(widget.activeChart().getAllStudies()).toHaveLength(3));
    const drawingsBefore = (widget as unknown as WidgetInternals)._chartStore.settings.get().userDrawingState;

    widget.activeChart().applyStudyTemplate(tradingViewRsiTemplate);

    expect(storedIndicators(widget).map((indicator) => indicator.builtinId)).toEqual(['rsi']);
    expect(
      (widget as unknown as WidgetInternals)._chartStore.settings
        .get()
        .preservedTradingViewStudies?.map((study) => study.id),
    ).toEqual(['Pine1', 'Rsi1']);
    await vi.waitFor(() => expect(widget.activeChart().getAllStudies()).toHaveLength(1));
    expect((widget as unknown as WidgetInternals)._chartStore.settings.get().userDrawingState).toBe(drawingsBefore);

    // Re-saving keeps the Pine study Tealchart cannot draw.
    const resaved = widget.activeChart().createStudyTemplate({}) as TvStudyTemplate;
    expect(resaved.panes.flatMap((pane) => pane.sources).map((source) => source.id)).toContain('Pine1');
    widget.remove();
  });

  it('rejects content that is not a template', () => {
    const widget = createWidget();
    expect(() => widget.activeChart().applyStudyTemplate({ nope: true })).toThrow();
    widget.remove();
  });

  it('routes the toolbar menu through the host adapter’s four study-template methods', async () => {
    const adapter = createAdapter({ Momentum: JSON.stringify(tradingViewRsiTemplate) });
    const widget = createWidget(adapter);
    (widget as unknown as WidgetInternals)._ui = null;
    (widget as unknown as WidgetInternals)._ensureUI();
    const callbacks = uiOptions.indicatorTemplateCallbacks!;
    expect(callbacks).toBeDefined();

    await expect(callbacks.getAll()).resolves.toEqual(['Momentum']);

    await expect(callbacks.apply('Momentum')).resolves.toEqual({
      missingStudies: [],
      unsupportedStudies: ['Some Pine'],
    });
    expect(adapter.getStudyTemplateContent).toHaveBeenCalledWith({ name: 'Momentum' });
    expect(storedIndicators(widget).map((indicator) => indicator.builtinId)).toEqual(['rsi']);

    await callbacks.save('Mine');
    const saved = adapter.saveStudyTemplate.mock.calls[0][0];
    expect(saved.name).toBe('Mine');
    expect(JSON.parse(saved.content)).toMatchObject({ version: 3, tealstreet: { engine: 'tealchart' } });

    await callbacks.remove('Momentum');
    expect(adapter.removeStudyTemplate).toHaveBeenCalledWith({ name: 'Momentum' });
    await expect(callbacks.getAll()).resolves.toEqual(['Mine']);
    widget.remove();
  });

  it('applies a template whose TealScript study this user lacks, reporting it as skipped', async () => {
    const template = seedTemplate();
    template.tealstreet!.tealscriptStudies[0].sourceId = 'someone-elses-study';
    const adapter = createAdapter({ Shared: template as unknown as Record<string, unknown> });
    const widget = createWidget(adapter);
    (widget as unknown as WidgetInternals)._ui = null;
    (widget as unknown as WidgetInternals)._ensureUI();

    await expect(uiOptions.indicatorTemplateCallbacks!.apply('Shared')).resolves.toEqual({
      missingStudies: ['My Bands'],
      unsupportedStudies: [],
    });
    expect(storedIndicators(widget).map((indicator) => indicator.id)).toEqual(['sma_1', 'macd_1']);
    widget.remove();
  });

  it('offers no templates menu when the adapter lacks the study-template methods', () => {
    const { getAllStudyTemplates: _omitted, ...layoutsOnly } = createAdapter();
    const widget = createWidget(layoutsOnly);
    (widget as unknown as WidgetInternals)._ui = null;
    (widget as unknown as WidgetInternals)._ensureUI();
    expect(uiOptions.indicatorTemplateCallbacks).toBeUndefined();
    widget.remove();
  });
});
