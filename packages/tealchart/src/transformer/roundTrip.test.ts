import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';

import { describe, expect, it } from 'vitest';

import { fromTvFormat } from './fromTvFormat';
import { toTvFormat } from './toTvFormat';

/**
 * Helper to create test settings
 */
function createSettings(overrides: Partial<ChartSettings> = {}): ChartSettings {
  return {
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: 1,
    ...overrides,
  };
}

describe('Transformer round-trip (toTvFormat → fromTvFormat)', () => {
  it('preserves symbol', () => {
    const settings = createSettings({ symbol: 'ETHUSDT' });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);
    expect(result.data.symbol).toBe('ETHUSDT');
  });

  it('preserves interval', () => {
    const settings = createSettings({ interval: '15' as ResolutionString });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);
    expect(result.data.interval).toBe('15');
  });

  it('preserves showVolume', () => {
    const settings = createSettings({ showVolume: true });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);
    expect(result.data.showVolume).toBe(true);

    const settings2 = createSettings({ showVolume: false });
    const tv2 = toTvFormat(settings2, 'Test');
    const result2 = fromTvFormat(tv2);
    expect(result2.data.showVolume).toBe(false);
  });

  it('preserves volumeHeight', () => {
    const settings = createSettings({ volumeHeight: 0.35 });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);
    expect(result.data.volumeHeight).toBe(0.35);
  });

  it('preserves chartType', () => {
    for (const chartType of ['candle', 'line', 'area'] as const) {
      const settings = createSettings({ chartType });
      const tv = toTvFormat(settings, 'Test');
      const result = fromTvFormat(tv);
      expect(result.data.chartType).toBe(chartType);
    }
  });

  it('preserves autoScale', () => {
    const settings = createSettings({ autoScale: false });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);
    expect(result.data.autoScale).toBe(false);
  });

  it('preserves mapped indicators with inputs', () => {
    const sma: IndicatorInstance = {
      id: 'sma_123',
      name: 'SMA',
      builtinId: 'sma',
      inputs: { length: 20 },
      isVisible: true,
      createdAt: 1000,
    };
    const settings = createSettings({ indicators: [sma] });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);

    const restored = result.data.indicators.find((i) => i.builtinId === 'sma');
    expect(restored).toBeDefined();
    expect(restored!.inputs.length).toBe(20);
  });

  it('preserves unmapped indicators via metadata', () => {
    const custom: IndicatorInstance = {
      id: 'custom_456',
      name: 'My Custom',
      builtinId: 'totally-unknown',
      inputs: { period: 14 },
      isVisible: true,
      createdAt: 2000,
    };
    const settings = createSettings({ indicators: [custom] });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);

    const restored = result.data.indicators.find((i) => i.builtinId === 'totally-unknown');
    expect(restored).toBeDefined();
    expect(restored!.name).toBe('My Custom');
    expect(restored!.inputs).toEqual({ period: 14 });
  });

  it('preserves indicator visibility', () => {
    const sma: IndicatorInstance = {
      id: 'sma_789',
      name: 'SMA',
      builtinId: 'sma',
      inputs: { length: 50 },
      isVisible: false,
      createdAt: 3000,
    };
    const settings = createSettings({ indicators: [sma] });
    const tv = toTvFormat(settings, 'Test');
    const result = fromTvFormat(tv);

    const restored = result.data.indicators.find((i) => i.builtinId === 'sma');
    expect(restored).toBeDefined();
    expect(restored!.isVisible).toBe(false);
  });

  it('round-trip produces no warnings for Tealstreet-origin content', () => {
    const settings = createSettings({
      symbol: 'SOLUSDT',
      interval: '240' as ResolutionString,
      showVolume: false,
      chartType: 'area',
    });
    const tv = toTvFormat(settings, 'Test Layout');
    const result = fromTvFormat(tv);
    expect(result.warnings).toHaveLength(0);
  });
});
