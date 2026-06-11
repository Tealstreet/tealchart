import { describe, it, expect } from 'vitest';
import { fromTvFormat } from './fromTvFormat';
import type { TvChartData, TvChartContent, TvSource } from './types';
import { TV_CHART_STYLES, TRANSFORMER_VERSION } from './types';
import type { IndicatorInstance } from '../state/chartState';

describe('fromTvFormat', () => {
  const createBasicTvContent = (overrides: Partial<TvChartContent> = {}): TvChartContent => ({
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
    ],
    panes: [
      {
        sources: ['main'],
        mainSeriesPane: true,
        height: 0.8,
      },
    ],
    version: 1,
    ...overrides,
  });

  const createTvChartData = (content: TvChartContent, overrides: Partial<TvChartData> = {}): TvChartData => ({
    name: 'Test Layout',
    symbol: 'BTCUSDT',
    resolution: '60',
    content: JSON.stringify(content),
    ...overrides,
  });

  describe('basic parsing', () => {
    it('parses TvChartData object', () => {
      const content = createBasicTvContent();
      const chartData = createTvChartData(content);
      const result = fromTvFormat(chartData);

      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe('BTCUSDT');
      expect(result.data.interval).toBe('60');
    });

    it('parses raw JSON string content', () => {
      const content = createBasicTvContent();
      const result = fromTvFormat(JSON.stringify(content));

      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe('BTCUSDT');
    });

    it('returns default settings on invalid JSON', () => {
      const result = fromTvFormat('not valid json');

      expect(result.data).toBeDefined();
      expect(result.warnings).toContain('Failed to parse chart content as JSON');
    });
  });

  describe('symbol and interval extraction', () => {
    it('extracts symbol from main source when chartData has no symbol', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.symbol = 'ETHUSDT';
      // Parse just the content string (no chartData wrapper)
      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.symbol).toBe('ETHUSDT');
    });

    it('prefers chartData symbol over source symbol', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.symbol = 'ETHUSDT';
      const chartData = createTvChartData(content, { symbol: 'SOLUSDT' });

      const result = fromTvFormat(chartData);
      expect(result.data.symbol).toBe('SOLUSDT');
    });

    it('extracts interval from main source', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.interval = '240';
      const chartData = createTvChartData(content, { resolution: '240' });

      const result = fromTvFormat(chartData);
      expect(result.data.interval).toBe('240');
    });

    it('defaults to BTCUSDT and 60 when not found', () => {
      const content: TvChartContent = {
        mainSourceId: 'main',
        sources: [],
        panes: [],
        version: 1,
      };
      const result = fromTvFormat(JSON.stringify(content));

      expect(result.data.symbol).toBe('BTCUSDT');
      expect(result.data.interval).toBe('60');
    });
  });

  describe('chart type detection', () => {
    it('detects candle chart type', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.style = TV_CHART_STYLES.CANDLES;

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.chartType).toBe('candle');
    });

    it('detects line chart type', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.style = TV_CHART_STYLES.LINE;

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.chartType).toBe('line');
    });

    it('detects area chart type', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.style = TV_CHART_STYLES.AREA;

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.chartType).toBe('area');
    });

    it('defaults to candle for unknown styles', () => {
      const content = createBasicTvContent();
      content.sources[0].state!.style = 99;

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.chartType).toBe('candle');
    });
  });

  describe('volume detection', () => {
    it('detects volume when volume source exists', () => {
      const content = createBasicTvContent();
      content.sources.push({
        id: 'volume',
        type: 'Volume',
        state: { visible: true },
      });
      content.panes.push({
        sources: ['volume'],
        height: 0.2,
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.showVolume).toBe(true);
    });

    it('extracts volume pane height', () => {
      const content = createBasicTvContent();
      content.sources.push({
        id: 'volume',
        type: 'Volume',
        state: { visible: true },
      });
      content.panes.push({
        sources: ['volume'],
        height: 0.25,
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.volumeHeight).toBe(0.25);
    });

    it('defaults showVolume to false when no volume source', () => {
      const content = createBasicTvContent();
      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.showVolume).toBe(false);
    });
  });

  describe('Tealstreet round-trip preservation', () => {
    it('detects Tealstreet-origin content', () => {
      const content = createBasicTvContent({
        _tealstreetTealchart: true,
        _tealstreetVersion: TRANSFORMER_VERSION,
      });

      const result = fromTvFormat(JSON.stringify(content));
      // Round-trip detected, shouldn't generate extra warnings
      expect(result.warnings.length).toBe(0);
    });

    it('restores original settings from Tealstreet metadata', () => {
      const content = createBasicTvContent({
        _tealstreetTealchart: true,
        _tealstreetVersion: TRANSFORMER_VERSION,
        _tealstreetOriginalSettings: {
          showVolume: true,
          volumeHeight: 0.3,
          chartType: 'area',
          autoScale: false,
        },
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.showVolume).toBe(true);
      expect(result.data.volumeHeight).toBe(0.3);
      expect(result.data.chartType).toBe('area');
      expect(result.data.autoScale).toBe(false);
    });

    it('restores user drawings from Tealstreet metadata', () => {
      const content = createBasicTvContent({
        _tealstreetTealchart: true,
        _tealstreetVersion: TRANSFORMER_VERSION,
        _tealstreetOriginalSettings: {
          userDrawingState: {
            version: 1,
            drawings: [
              {
                id: 'vline_1',
                kind: 'verticalLine',
                paneId: 'main',
                visible: true,
                locked: false,
                createdAt: 100,
                updatedAt: 100,
                style: {
                  lineColor: '#f5c542',
                  lineWidth: 1,
                  lineStyle: 'solid',
                },
                time: 123456789,
              },
            ],
            activeTool: 'ray',
            selection: { drawingId: 'vline_1' },
            draft: null,
            textEdit: null,
          },
        },
      });

      const result = fromTvFormat(JSON.stringify(content));

      expect(result.data.userDrawingState?.drawings).toHaveLength(1);
      expect(result.data.userDrawingState?.drawings[0]?.id).toBe('vline_1');
      expect(result.data.userDrawingState?.activeTool).toBe('select');
      expect(result.data.userDrawingState?.selection).toBeNull();
    });

    it('restores unmapped indicators from Tealstreet metadata', () => {
      const customIndicator: IndicatorInstance = {
        id: 'custom_123',
        name: 'My Custom',
        builtinId: 'custom-unknown',
        inputs: { foo: 'bar' },
        isVisible: true,
        createdAt: 12345,
      };
      const content = createBasicTvContent({
        _tealstreetTealchart: true,
        _tealstreetVersion: TRANSFORMER_VERSION,
        _tealstreetOriginalIndicators: [customIndicator],
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.indicators).toContainEqual(
        expect.objectContaining({
          builtinId: 'custom-unknown',
          name: 'My Custom',
        })
      );
    });
  });

  describe('indicator transformation', () => {
    it('excludes MainSeries and Volume from indicators', () => {
      const content = createBasicTvContent();
      content.sources.push(
        {
          id: 'volume',
          type: 'Volume',
          state: { visible: true },
        },
      );

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.indicators).toHaveLength(0);
    });

    it('generates warning for unmapped indicators', () => {
      const content = createBasicTvContent();
      content.sources.push({
        id: 'unknown_1',
        type: 'STD;Unknown_Indicator',
        state: { inputs: {} },
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.warnings.some((w) => w.includes('not supported'))).toBe(true);
    });

    it('preserves unmapped indicators in unmappedData', () => {
      const content = createBasicTvContent();
      content.sources.push({
        id: 'unknown_1',
        type: 'STD;Unknown_Indicator',
        state: { inputs: {} },
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.unmappedData?.indicators).toBeDefined();
    });

    it('sorts indicators by createdAt', () => {
      // This is tested implicitly - indicators maintain insertion order
      // which corresponds to their position in the original layout
      const content = createBasicTvContent({
        _tealstreetTealchart: true,
        _tealstreetOriginalIndicators: [
          { id: 'a', name: 'A', builtinId: 'x', inputs: {}, isVisible: true, createdAt: 300 },
          { id: 'b', name: 'B', builtinId: 'y', inputs: {}, isVisible: true, createdAt: 100 },
          { id: 'c', name: 'C', builtinId: 'z', inputs: {}, isVisible: true, createdAt: 200 },
        ],
      });

      const result = fromTvFormat(JSON.stringify(content));
      expect(result.data.indicators.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    });
  });

  describe('nested TradingView format handling', () => {
    it('handles double-wrapped content from TradingView', () => {
      const innerContent: TvChartContent = createBasicTvContent();
      const outerWrapper = {
        symbol: 'BTCUSDT',
        resolution: '15',
        content: JSON.stringify(innerContent),
      };

      const result = fromTvFormat(JSON.stringify(outerWrapper));
      expect(result.data).toBeDefined();
      // Should extract resolution from outer wrapper
      expect(result.data.interval).toBe('15');
    });

    it('handles multi-chart layouts with charts array', () => {
      const multiChartContent = {
        charts: [
          {
            panes: [
              {
                sources: [
                  {
                    id: 'main',
                    type: 'MainSeries',
                    state: { symbol: 'XRPUSDT', interval: '5' },
                  },
                ],
              },
            ],
            mainSourceId: 'main',
          },
        ],
      };

      const result = fromTvFormat(JSON.stringify(multiChartContent));
      expect(result.data.symbol).toBe('XRPUSDT');
    });
  });
});
