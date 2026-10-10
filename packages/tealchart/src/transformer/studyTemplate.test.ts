import type { IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { StudyTemplateSourceSettings, TvStudyTemplate } from './studyTemplate';

import { describe, expect, it } from 'vitest';

import { buildTvStudyTemplate, readTvStudyTemplate, STUDY_TEMPLATE_META_KEY } from './studyTemplate';

const sma: IndicatorInstance = {
  id: 'sma_1',
  name: 'SMA',
  builtinId: 'sma',
  inputs: { length: 50 },
  isVisible: true,
  createdAt: 1,
};
const rsi: IndicatorInstance = {
  id: 'rsi_1',
  name: 'RSI',
  builtinId: 'rsi',
  inputs: { length: 21 },
  isVisible: false,
  createdAt: 2,
};
const customStudy: IndicatorInstance = {
  id: 'custom_1',
  name: 'My Bands',
  builtinId: 'custom-tealchart-study:study-1',
  sourceKind: 'custom_tealchart_study',
  sourceId: 'study-1',
  sourceHash: '2026-10-01T00:00:00Z',
  inputs: { width: 3 },
  isVisible: true,
  createdAt: 3,
};

const customStudies = [
  {
    id: 'custom-tealchart-study:study-1',
    name: 'My Bands v2',
    sourceId: 'study-1',
    sourceHash: '2026-10-05T00:00:00Z',
  },
];

function settings(indicators: IndicatorInstance[], extra: Partial<StudyTemplateSourceSettings> = {}) {
  return {
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    chartType: 'candle' as const,
    indicators,
    ...extra,
  };
}

/** A template in the shape TradingView's `createStudyTemplate` produces. */
const tradingViewWrittenTemplate = {
  panes: [
    {
      sources: [
        { type: 'MainSeries', id: '_seriesId', zorder: 0, state: { style: 1, symbol: 'BINANCE:BTCUSDT' } },
        {
          type: 'Study',
          id: 'Ab12Cd',
          zorder: 1,
          ownerSource: '_seriesId',
          metaInfo: { id: 'Script@tv-scripting-101', fullId: 'PUB;abc123', description: 'Community Squeeze' },
          state: { inputs: { in_0: 20 } },
        },
        { type: 'LineToolTrendLine', id: 'drawing1', zorder: 2, state: {}, points: [] },
      ],
      mainSourceId: '_seriesId',
      stretchFactor: 2000,
      leftAxisesState: [],
      rightAxisesState: [],
      overlayPriceScales: {},
      priceScaleRatio: null,
      isCollapsed: false,
      isMaximized: false,
      mode: 0,
    },
    {
      sources: [
        {
          type: 'Study',
          id: 'Rs99',
          zorder: 3,
          metaInfo: { id: 'STD;RSI', fullId: 'STD;RSI', description: 'Relative Strength Index' },
          state: { inputs: { 'RSI Length': 9 }, visible: true },
        },
      ],
      mainSourceId: 'Rs99',
      stretchFactor: 1000,
    },
  ],
  version: 3,
};

describe('buildTvStudyTemplate (Tealchart → TradingView format)', () => {
  const template = buildTvStudyTemplate(settings([sma, rsi, customStudy]));

  it('writes the shape TradingView applies: a price series first, studies, scales and z-order', () => {
    expect(template.version).toBe(3);
    const [mainPane, rsiPane] = template.panes;
    expect(mainPane.mainSourceId).toBe('_seriesId');
    expect(mainPane.sources[0]).toEqual({ type: 'MainSeries', id: '_seriesId', zorder: 0, state: {} });
    expect(mainPane.sources[1]).toMatchObject({ type: 'Study', id: 'sma_1', metaInfo: { id: 'STD;SMA' } });
    expect(mainPane.sources[1].state.inputs).toEqual({ Length: 50 });
    expect(rsiPane.mainSourceId).toBe('rsi_1');
    expect(rsiPane.sources).toHaveLength(1);
    expect(rsiPane.sources[0]).toMatchObject({ id: 'rsi_1', metaInfo: { id: 'STD;RSI' }, state: { visible: false } });

    // Verified against the TradingView bundle: applying requires a MainSeries
    // source, and its pane must carry left/right axis-state arrays.
    expect(template.panes.filter((pane) => pane.sources.some((source) => source.type === 'MainSeries'))).toHaveLength(
      1,
    );
    for (const pane of template.panes) {
      expect(Array.isArray(pane.leftAxisesState)).toBe(true);
      expect(Array.isArray(pane.rightAxisesState)).toBe(true);
      for (const source of pane.sources) expect(typeof source.zorder).toBe('number');
      // TradingView's PriceScale.restoreState throws without these two.
      expect(pane.rightAxisesState[0].state.m_priceRange).toBeNull();
      expect(typeof pane.rightAxisesState[0].state.m_isAutoScale).toBe('boolean');
      expect(pane.rightAxisesState[0].sources).toEqual(pane.sources.map((source) => source.id));
      expect(pane.stretchFactor).toBeGreaterThan(0);
    }
    // The overlay shares the price series' scale.
    expect(mainPane.rightAxisesState[0].sources).toEqual(['_seriesId', 'sma_1']);
  });

  it('leaves volume, drawings, symbol and interval out unless asked', () => {
    const json = JSON.stringify(template);
    expect(json).not.toContain('"Volume"');
    expect(json).not.toContain('userDrawingState');
    expect(template).not.toHaveProperty('symbol');
    expect(template).not.toHaveProperty('interval');

    const withBoth = buildTvStudyTemplate(settings([sma]), { saveSymbol: true, saveInterval: true });
    expect(withBoth.symbol).toBe('BTCUSDT');
    expect(withBoth.interval).toBe('60');
  });

  it('keeps TealScript studies out of the TradingView part and names them in the envelope', () => {
    expect(JSON.stringify(template.panes)).not.toContain('custom_1');
    expect(template.tealstreet).toEqual({
      version: 1,
      engine: 'tealchart',
      tealscriptStudies: [{ sourceId: 'study-1', sourceHash: '2026-10-01T00:00:00Z', name: 'My Bands' }],
      pineJsStudies: [],
      tealchartIndicators: [
        { id: 'sma_1', name: 'SMA', builtinId: 'sma', inputs: { length: 50 }, isVisible: true, createdAt: 1 },
        { id: 'rsi_1', name: 'RSI', builtinId: 'rsi', inputs: { length: 21 }, isVisible: false, createdAt: 2 },
        // By index into tealscriptStudies, so rewriting that list remaps every instance.
        { id: 'custom_1', name: 'My Bands', tealscriptStudy: 0, inputs: { width: 3 }, isVisible: true, createdAt: 3 },
      ],
    });
  });

  it('never carries inline TealScript source', () => {
    const inline = { ...customStudy, sourceId: undefined, inlineTealscript: { code: 'secret()', overlay: true } };
    const json = JSON.stringify(buildTvStudyTemplate(settings([inline])));
    expect(json).not.toContain('secret()');
  });
});

describe('readTvStudyTemplate (stored template → Tealchart indicators)', () => {
  it('round-trips a Tealchart template, resolving TealScript studies by source id', () => {
    const template = buildTvStudyTemplate(settings([sma, rsi, customStudy]));
    const result = readTvStudyTemplate(JSON.stringify(template), customStudies)!;

    expect(result.indicators.map((indicator) => indicator.id)).toEqual(['sma_1', 'rsi_1', 'custom_1']);
    expect(result.indicators[0]).toMatchObject({ builtinId: 'sma', inputs: { length: 50 }, isVisible: true });
    expect(result.indicators[1]).toMatchObject({ builtinId: 'rsi', inputs: { length: 21 }, isVisible: false });
    expect(result.indicators[1].tradingViewStudy?.studyId).toBe('STD;RSI');
    expect(result.indicators[2]).toEqual({
      id: 'custom_1',
      name: 'My Bands v2',
      builtinId: 'custom-tealchart-study:study-1',
      sourceKind: 'custom_tealchart_study',
      sourceId: 'study-1',
      sourceHash: '2026-10-05T00:00:00Z',
      inputs: { width: 3 },
      isVisible: true,
      createdAt: 3,
    });
    expect(result.missingTealscriptStudies).toEqual([]);
    expect(result.unsupportedStudies).toEqual([]);
  });

  it('skips a TealScript study this user does not have and reports it', () => {
    const template = buildTvStudyTemplate(settings([sma, customStudy, { ...customStudy, id: 'custom_2' }]));
    const result = readTvStudyTemplate(template, [])!;

    expect(result.indicators.map((indicator) => indicator.id)).toEqual(['sma_1']);
    expect(result.missingTealscriptStudies).toEqual([
      { sourceId: 'study-1', sourceHash: '2026-10-01T00:00:00Z', name: 'My Bands' },
    ]);
  });

  it('follows a rewritten tealscriptStudies list (an install mapping ids to the installer’s copies)', () => {
    const template = buildTvStudyTemplate(settings([customStudy]));
    template.tealstreet!.tealscriptStudies[0].sourceId = 'installed-copy';
    const result = readTvStudyTemplate(template, [
      { id: 'custom-tealchart-study:installed-copy', name: 'Copy', sourceId: 'installed-copy' },
    ])!;
    expect(result.indicators).toHaveLength(1);
    expect(result.indicators[0]).toMatchObject({
      sourceId: 'installed-copy',
      builtinId: 'custom-tealchart-study:installed-copy',
    });
  });

  it('maps supported TradingView studies and preserves unsupported ones, dropping drawings', () => {
    const result = readTvStudyTemplate(tradingViewWrittenTemplate)!;

    expect(result.indicators).toHaveLength(1);
    expect(result.indicators[0]).toMatchObject({ id: 'Rs99', builtinId: 'rsi', inputs: { length: 9 } });
    expect(result.unsupportedStudies).toEqual(['Community Squeeze']);
    expect(result.preservedTradingViewStudies.map((study) => [study.id, study.mappingStatus])).toEqual([
      ['Ab12Cd', 'preserved'],
      ['Rs99', 'mapped'],
    ]);
    expect(JSON.stringify(result)).not.toContain('drawing1');
  });

  it('applying then re-saving a TradingView template keeps the studies Tealchart cannot render', () => {
    const read = readTvStudyTemplate(JSON.stringify(tradingViewWrittenTemplate))!;
    const resaved = buildTvStudyTemplate(
      settings(read.indicators, { preservedTradingViewStudies: read.preservedTradingViewStudies }),
    );
    const sources = resaved.panes.flatMap((pane) => pane.sources);
    const preserved = sources.find((source) => source.id === 'Ab12Cd');
    expect(preserved).toMatchObject({ metaInfo: { fullId: 'PUB;abc123' }, state: { inputs: { in_0: 20 } } });
    expect(resaved.panes[0].sources.map((source) => source.id)).toContain('Ab12Cd');
    expect(sources.find((source) => source.id === 'Rs99')).toMatchObject({ metaInfo: { fullId: 'STD;RSI' } });

    // And the re-saved template reads back to the same picture.
    const again = readTvStudyTemplate(resaved)!;
    expect(again.unsupportedStudies).toEqual(['Community Squeeze']);
    expect(again.indicators.map((indicator) => indicator.builtinId)).toEqual(['rsi']);
  });

  it('gives a default instance to TealScript studies a TradingView-side envelope names', () => {
    const template = {
      ...tradingViewWrittenTemplate,
      [STUDY_TEMPLATE_META_KEY]: {
        version: 1,
        engine: 'tradingview',
        tealscriptStudies: [{ sourceId: 'study-1', name: 'My Bands' }],
        pineJsStudies: [],
      },
    };
    const result = readTvStudyTemplate(template, customStudies)!;
    expect(result.indicators.map((indicator) => indicator.builtinId)).toEqual([
      'rsi',
      'custom-tealchart-study:study-1',
    ]);
    expect(result.indicators[1]).toMatchObject({ inputs: {}, isVisible: true, sourceId: 'study-1' });
  });

  it('keeps TradingView Volume for re-save without calling it unsupported', () => {
    const volume = {
      type: 'Study',
      id: 'Vol1',
      zorder: 4,
      metaInfo: { id: 'Volume@tv-basicstudies-1', description: 'Volume' },
      state: {},
    };
    const [mainPane, rsiPane] = tradingViewWrittenTemplate.panes;
    const template = {
      ...tradingViewWrittenTemplate,
      panes: [{ ...mainPane, sources: [...mainPane.sources, volume] }, rsiPane],
    };
    const result = readTvStudyTemplate(template)!;
    expect(result.unsupportedStudies).toEqual(['Community Squeeze']);
    expect(result.preservedTradingViewStudies.map((study) => study.id)).toContain('Vol1');
  });

  it('reads symbol and interval when the template carries them', () => {
    const result = readTvStudyTemplate({ ...tradingViewWrittenTemplate, symbol: 'ETHUSDT', interval: '15' })!;
    expect(result.symbol).toBe('ETHUSDT');
    expect(result.interval).toBe('15');
  });

  it('rejects content that is not a study template', () => {
    expect(readTvStudyTemplate('not json')).toBeNull();
    expect(readTvStudyTemplate({ sources: [] })).toBeNull();
    expect(readTvStudyTemplate(null)).toBeNull();
  });

  it('accepts a template that came back as a parsed object', () => {
    const template: TvStudyTemplate = buildTvStudyTemplate(settings([sma]));
    expect(readTvStudyTemplate(template)?.indicators.map((indicator) => indicator.id)).toEqual(['sma_1']);
  });
});
