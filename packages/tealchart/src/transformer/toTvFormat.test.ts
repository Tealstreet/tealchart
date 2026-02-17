import { describe, it, expect } from 'vitest';
import { toTvFormat, generateSourceId } from './toTvFormat';
import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { TvChartContent } from './types';
import { TV_CHART_STYLES } from './types';

describe('toTvFormat', () => {
  const createTestSettings = (overrides: Partial<ChartSettings> = {}): ChartSettings => ({
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: 1,
    ...overrides,
  });

  describe('basic transformation', () => {
    it('transforms settings to TV format with correct metadata', () => {
      const settings = createTestSettings();
      const result = toTvFormat(settings, 'My Chart');

      expect(result.name).toBe('My Chart');
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.resolution).toBe('60');
      expect(result.content).toBeDefined();
    });

    it('produces valid JSON content', () => {
      const settings = createTestSettings();
      const result = toTvFormat(settings, 'Test');

      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('includes main series source', () => {
      const settings = createTestSettings({ symbol: 'ETHUSDT', interval: '15' as ResolutionString });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainSource = content.sources.find((s) => s.id === content.mainSourceId);
      expect(mainSource).toBeDefined();
      expect(mainSource?.type).toBe('MainSeries');
      expect(mainSource?.state?.symbol).toBe('ETHUSDT');
      expect(mainSource?.state?.interval).toBe('15');
    });
  });

  describe('chart type mapping', () => {
    it('maps candle chart type to TV style', () => {
      const settings = createTestSettings({ chartType: 'candle' });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainSource = content.sources.find((s) => s.type === 'MainSeries');
      expect(mainSource?.state?.style).toBe(TV_CHART_STYLES.CANDLES);
    });

    it('maps line chart type to TV style', () => {
      const settings = createTestSettings({ chartType: 'line' });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainSource = content.sources.find((s) => s.type === 'MainSeries');
      expect(mainSource?.state?.style).toBe(TV_CHART_STYLES.LINE);
    });

    it('maps area chart type to TV style', () => {
      const settings = createTestSettings({ chartType: 'area' });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainSource = content.sources.find((s) => s.type === 'MainSeries');
      expect(mainSource?.state?.style).toBe(TV_CHART_STYLES.AREA);
    });
  });

  describe('volume handling', () => {
    it('includes volume source when showVolume is true', () => {
      const settings = createTestSettings({ showVolume: true });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const volumeSource = content.sources.find((s) => s.type === 'Volume');
      expect(volumeSource).toBeDefined();
    });

    it('excludes volume source when showVolume is false', () => {
      const settings = createTestSettings({ showVolume: false });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const volumeSource = content.sources.find((s) => s.type === 'Volume');
      expect(volumeSource).toBeUndefined();
    });

    it('uses correct volume height in pane', () => {
      const settings = createTestSettings({ showVolume: true, volumeHeight: 0.25 });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const volumePane = content.panes.find((p) => p.sources.includes('volume'));
      expect(volumePane?.height).toBe(0.25);
    });
  });

  describe('pane layout', () => {
    it('creates main pane with correct height when volume is shown', () => {
      const settings = createTestSettings({ showVolume: true });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainPane = content.panes.find((p) => p.mainSeriesPane);
      expect(mainPane).toBeDefined();
      expect(mainPane?.height).toBe(0.7);
    });

    it('creates main pane with larger height when volume is hidden', () => {
      const settings = createTestSettings({ showVolume: false });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainPane = content.panes.find((p) => p.mainSeriesPane);
      expect(mainPane?.height).toBe(0.85);
    });
  });

  describe('Tealstreet metadata', () => {
    it('includes Tealstreet marker for round-trip detection', () => {
      const settings = createTestSettings();
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      expect(content._tealstreetTealchart).toBe(true);
      expect(content._tealstreetVersion).toBeDefined();
    });

    it('preserves original settings for round-trip', () => {
      const settings = createTestSettings({
        showVolume: true,
        volumeHeight: 0.3,
        chartType: 'area',
        autoScale: false,
      });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      expect(content._tealstreetOriginalSettings?.showVolume).toBe(true);
      expect(content._tealstreetOriginalSettings?.volumeHeight).toBe(0.3);
      expect(content._tealstreetOriginalSettings?.chartType).toBe('area');
      expect(content._tealstreetOriginalSettings?.autoScale).toBe(false);
    });
  });

  describe('indicator transformation', () => {
    it('adds overlay indicators to main pane', () => {
      const smaIndicator: IndicatorInstance = {
        id: 'sma_123',
        name: 'SMA',
        builtinId: 'sma',
        inputs: { length: 20 },
        isVisible: true,
        createdAt: Date.now(),
      };
      const settings = createTestSettings({ indicators: [smaIndicator] });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      const mainPane = content.panes.find((p) => p.mainSeriesPane);
      // SMA is an overlay, should be in main pane
      expect(mainPane?.sources.length).toBeGreaterThan(1);
    });

    it('preserves unmapped indicators in metadata', () => {
      const customIndicator: IndicatorInstance = {
        id: 'custom_999',
        name: 'My Custom Indicator',
        builtinId: 'totally-unknown-indicator',
        inputs: { foo: 'bar' },
        isVisible: true,
        createdAt: Date.now(),
      };
      const settings = createTestSettings({ indicators: [customIndicator] });
      const result = toTvFormat(settings, 'Test');
      const content: TvChartContent = JSON.parse(result.content);

      // Unmapped indicators should be preserved
      expect(content._tealstreetOriginalIndicators).toBeDefined();
      expect(content._tealstreetOriginalIndicators?.length).toBe(1);
      expect(content._tealstreetOriginalIndicators?.[0].builtinId).toBe(
        'totally-unknown-indicator'
      );
    });
  });
});

describe('generateSourceId', () => {
  it('generates ID with indicator prefix', () => {
    const id = generateSourceId('sma');
    expect(id).toMatch(/^sma_\d+$/);
  });

  it('includes timestamp in generated ID', () => {
    const before = Date.now();
    const id = generateSourceId('rsi');
    const after = Date.now();

    const timestamp = parseInt(id.split('_')[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
