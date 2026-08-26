import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { TvChartContent, TvSource } from './types';

import { describe, expect, it } from 'vitest';

import { fromTvFormat } from './fromTvFormat';
import { toTvFormat } from './toTvFormat';
import { TV_CHART_STYLES } from './types';

function createSettings(overrides: Partial<ChartSettings> = {}): ChartSettings {
  return {
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    showVolume: false,
    showIndicatorOutputAxisLabels: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: 1,
    ...overrides,
  };
}

function createTvContent(studies: TvSource[]): TvChartContent {
  return {
    mainSourceId: 'main',
    sources: [
      {
        id: 'main',
        type: 'MainSeries',
        state: {
          symbol: 'BTCUSDT',
          interval: '60',
          style: TV_CHART_STYLES.CANDLES,
        },
      },
      ...studies,
    ],
    panes: [
      {
        sources: ['main', ...studies.filter((study) => study.id !== 'rsi_1').map((study) => study.id)],
        mainSeriesPane: true,
        height: 0.8,
      },
      {
        sources: studies.filter((study) => study.id === 'rsi_1').map((study) => study.id),
        height: 0.2,
      },
    ],
    version: 1,
  };
}

function getSource(content: TvChartContent, id: string): TvSource {
  const source = content.sources.find((candidate) => candidate.id === id);
  if (!source) throw new Error(`Missing source ${id}`);
  return source;
}

describe('indicator engine interop preservation', () => {
  it('maps real TradingView Study sources while preserving raw source fields', () => {
    const tvStudy: TvSource = {
      id: 'sma_1',
      type: 'Study',
      metaInfo: {
        fullId: 'STD;SMA',
        id: 'STD;SMA',
        shortId: 'SMA',
        description: 'Moving Average',
      },
      state: {
        inputs: { Length: 55, customTvInput: 'preserved' },
        visible: true,
        plots: [{ id: 'plot_0', type: 'line', color: '#ffaa00', linewidth: 3, trackPrice: true }],
        styles: { plot_0: { plottype: 0 } },
      },
      ownerSource: 'main',
    };

    const imported = fromTvFormat(JSON.stringify(createTvContent([tvStudy])));
    expect(imported.warnings).toEqual([]);
    expect(imported.data.indicators).toHaveLength(1);
    expect(imported.data.indicators[0]).toMatchObject({
      id: 'sma_1',
      builtinId: 'sma',
      inputs: { length: 55 },
      tradingViewStudy: {
        studyId: 'STD;SMA',
      },
    });
    expect(imported.data.preservedTradingViewStudies?.[0]).toMatchObject({
      id: 'sma_1',
      mappedIndicatorId: 'sma_1',
      mappingStatus: 'mapped',
      pane: { index: 0, mainSeriesPane: true },
    });

    const exported = toTvFormat(imported.data, 'TV round trip');
    const exportedContent = JSON.parse(exported.content) as TvChartContent;
    const exportedStudy = getSource(exportedContent, 'sma_1');

    expect(exportedStudy.type).toBe('Study');
    expect(exportedStudy.metaInfo?.fullId).toBe('STD;SMA');
    expect(exportedStudy.state.inputs).toEqual({ Length: 55, customTvInput: 'preserved' });
    expect(exportedStudy.state.plots?.[0]).toMatchObject({ id: 'plot_0', trackPrice: true });
    expect(exportedStudy.state.styles).toEqual({ plot_0: { plottype: 0 } });
    expect(exportedStudy.ownerSource).toBe('main');
  });

  it('preserves unsupported TradingView studies through Tealchart saves', () => {
    const unsupportedStudy: TvSource = {
      id: 'pine_1',
      type: 'Study',
      metaInfo: {
        fullId: 'USER;PrivatePine@custom-1',
        id: 'USER;PrivatePine@custom-1',
        shortId: 'PrivatePine',
      },
      state: {
        inputs: { source: 'close', length: 21 },
        visible: false,
        customPayload: { ownedByTradingView: true },
      },
    };

    const imported = fromTvFormat(JSON.stringify(createTvContent([unsupportedStudy])));
    expect(imported.data.indicators).toEqual([]);
    expect(imported.warnings).toContain('Indicator "USER;PrivatePine@custom-1" is not supported in custom chart');
    expect(imported.data.preservedTradingViewStudies).toHaveLength(1);

    const exported = toTvFormat(imported.data, 'Preserved');
    const exportedContent = JSON.parse(exported.content) as TvChartContent;
    const exportedStudy = getSource(exportedContent, 'pine_1');

    expect(exportedStudy).toEqual(unsupportedStudy);
    expect(exportedContent.panes.some((pane) => pane.sources.includes('pine_1'))).toBe(true);
  });

  it('preserves Tealchart-only indicators in metadata when saving for TradingView', () => {
    const customIndicator: IndicatorInstance = {
      id: 'custom_teal_1',
      name: 'Private Tealscript',
      builtinId: 'private-tealscript',
      sourceKind: 'custom_tealchart_study',
      sourceId: 'study-row-1',
      sourceHash: 'hash-v1',
      inputs: { length: 13 },
      isVisible: true,
      createdAt: 100,
    };

    const tv = toTvFormat(createSettings({ indicators: [customIndicator] }), 'Tealchart custom');
    const exportedContent = JSON.parse(tv.content) as TvChartContent;
    expect(exportedContent.sources.some((source) => source.id === 'custom_teal_1')).toBe(false);
    expect(exportedContent._tealstreetOriginalIndicators).toEqual([customIndicator]);

    const imported = fromTvFormat(tv);
    expect(imported.data.indicators).toEqual([customIndicator]);
  });

  it('restores exact Tealchart indicator variants after lossy TV projection', () => {
    const variantIndicator: IndicatorInstance = {
      id: 'bb_filled_1',
      name: 'Bollinger Bands (Filled)',
      builtinId: 'bb-filled',
      inputs: { length: 20, mult: 2 },
      isVisible: true,
      createdAt: 100,
    };

    const tv = toTvFormat(createSettings({ indicators: [variantIndicator] }), 'Variant');
    const exportedContent = JSON.parse(tv.content) as TvChartContent;
    expect(getSource(exportedContent, 'bb_filled_1').metaInfo?.fullId).toBe('STD;Bollinger_Bands');

    const imported = fromTvFormat(tv);
    expect(imported.data.indicators[0]).toMatchObject(variantIndicator);
    expect(imported.data.indicators[0]?.tradingViewStudy?.studyId).toBe('STD;Bollinger_Bands');
  });

  it('keeps TradingView edits when loading a Tealchart-origin mapped indicator', () => {
    const smaIndicator: IndicatorInstance = {
      id: 'sma_1',
      name: 'SMA',
      builtinId: 'sma',
      inputs: { length: 20 },
      isVisible: true,
      createdAt: 100,
    };

    const tv = toTvFormat(createSettings({ indicators: [smaIndicator] }), 'SMA');
    const editedContent = JSON.parse(tv.content) as TvChartContent;
    getSource(editedContent, 'sma_1').state.inputs = { Length: 55 };

    const imported = fromTvFormat({ ...tv, content: JSON.stringify(editedContent) });
    expect(imported.data.indicators[0]).toMatchObject({
      id: 'sma_1',
      builtinId: 'sma',
      inputs: { length: 55 },
    });
  });

  it('does not resurrect a deleted mapped TradingView study', () => {
    const tvStudy: TvSource = {
      id: 'sma_1',
      type: 'Study',
      metaInfo: {
        fullId: 'STD;SMA',
        id: 'STD;SMA',
      },
      state: {
        inputs: { Length: 20 },
        visible: true,
      },
    };

    const imported = fromTvFormat(JSON.stringify(createTvContent([tvStudy])));
    const exported = toTvFormat({ ...imported.data, indicators: [] }, 'Deleted mapped study');
    const exportedContent = JSON.parse(exported.content) as TvChartContent;

    expect(exportedContent.sources.some((source) => source.id === 'sma_1')).toBe(false);
  });

  it('imports duplicate TradingView study IDs as canonical TV-backed indicators', () => {
    const tvStudy: TvSource = {
      id: 'bb_tv_1',
      type: 'Study',
      metaInfo: {
        fullId: 'STD;Bollinger_Bands',
        id: 'STD;Bollinger_Bands',
      },
      state: {
        inputs: { Length: 20, StdDev: 2 },
        visible: true,
      },
    };

    const imported = fromTvFormat(JSON.stringify(createTvContent([tvStudy])));
    expect(imported.data.indicators[0]?.builtinId).toBe('bollinger-bands');
  });

  it('preserves shared TradingView study pane grouping', () => {
    const rsiStudy: TvSource = {
      id: 'rsi_1',
      type: 'Study',
      metaInfo: {
        fullId: 'STD;RSI',
        id: 'STD;RSI',
      },
      state: {
        inputs: { 'RSI Length': 14 },
        visible: true,
      },
    };
    const unsupportedStudy: TvSource = {
      id: 'tv_only_same_pane',
      type: 'Study',
      metaInfo: {
        fullId: 'USER;SamePane@custom-1',
        id: 'USER;SamePane@custom-1',
      },
      state: {
        inputs: {},
        visible: true,
      },
    };
    const content = createTvContent([rsiStudy, unsupportedStudy]);
    content.panes = [
      { sources: ['main'], mainSeriesPane: true, height: 0.65 },
      { sources: ['rsi_1', 'tv_only_same_pane'], height: 0.35 },
    ];

    const imported = fromTvFormat(JSON.stringify(content));
    const exported = toTvFormat(imported.data, 'Shared pane');
    const exportedContent = JSON.parse(exported.content) as TvChartContent;

    expect(exportedContent.panes.some((pane) => pane.sources.join('|') === 'rsi_1|tv_only_same_pane')).toBe(true);
    expect(exportedContent.panes.every((pane) => pane.sources.length > 0)).toBe(true);
  });
});
