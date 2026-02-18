import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';

import { describe, expect, it } from 'vitest';

import { fromTvFormat } from './fromTvFormat';
import { toTvFormat } from './toTvFormat';

describe('transformer round-trip', () => {
  const createSettings = (overrides: Partial<ChartSettings> = {}): ChartSettings => ({
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

  it('preserves basic settings through round-trip', () => {
    const original = createSettings({
      symbol: 'ETHUSDT',
      interval: '15' as ResolutionString,
      showVolume: true,
      volumeHeight: 0.3,
      chartType: 'area',
      autoScale: false,
    });

    const tvData = toTvFormat(original, 'Test Layout');
    const result = fromTvFormat(tvData);

    expect(result.data.symbol).toBe('ETHUSDT');
    expect(result.data.interval).toBe('15');
    expect(result.data.showVolume).toBe(true);
    expect(result.data.volumeHeight).toBe(0.3);
    expect(result.data.chartType).toBe('area');
    expect(result.data.autoScale).toBe(false);
  });

  it('preserves settings when volume is hidden', () => {
    const original = createSettings({ showVolume: false });
    const tvData = toTvFormat(original, 'Test');
    const result = fromTvFormat(tvData);

    expect(result.data.showVolume).toBe(false);
  });

  it('preserves chart type through round-trip', () => {
    for (const chartType of ['candle', 'line', 'area'] as const) {
      const original = createSettings({ chartType });
      const tvData = toTvFormat(original, 'Test');
      const result = fromTvFormat(tvData);
      expect(result.data.chartType).toBe(chartType);
    }
  });

  it('preserves viewport through round-trip', () => {
    const viewport = {
      startTime: 1700000000000,
      endTime: 1700003600000,
      priceMin: 35000,
      priceMax: 36000,
    };
    const original = createSettings({ viewport });
    const tvData = toTvFormat(original, 'Test');
    const result = fromTvFormat(tvData);

    expect(result.data.viewport).toEqual(viewport);
  });

  it('round-trip produces no warnings for custom chart origin', () => {
    const original = createSettings();
    const tvData = toTvFormat(original, 'Test');
    const result = fromTvFormat(tvData);

    expect(result.warnings).toHaveLength(0);
  });

  it('preserves unmapped indicators through round-trip', () => {
    const customIndicator: IndicatorInstance = {
      id: 'custom_12345',
      name: 'My Custom Indicator',
      builtinId: 'unknown-custom-indicator',
      inputs: { period: 14, mode: 'fast' },
      isVisible: true,
      createdAt: 1700000000000,
    };
    const original = createSettings({ indicators: [customIndicator] });
    const tvData = toTvFormat(original, 'Test');
    const result = fromTvFormat(tvData);

    expect(result.data.indicators).toHaveLength(1);
    expect(result.data.indicators[0].builtinId).toBe('unknown-custom-indicator');
    expect(result.data.indicators[0].name).toBe('My Custom Indicator');
    expect(result.data.indicators[0].inputs).toEqual({ period: 14, mode: 'fast' });
  });

  it('preserves multiple unmapped indicators', () => {
    const indicators: IndicatorInstance[] = [
      {
        id: 'a_100',
        name: 'Indicator A',
        builtinId: 'custom-a',
        inputs: { len: 10 },
        isVisible: true,
        createdAt: 100,
      },
      {
        id: 'b_200',
        name: 'Indicator B',
        builtinId: 'custom-b',
        inputs: { len: 20 },
        isVisible: false,
        createdAt: 200,
      },
    ];
    const original = createSettings({ indicators });
    const tvData = toTvFormat(original, 'Test');
    const result = fromTvFormat(tvData);

    expect(result.data.indicators).toHaveLength(2);
    // Sorted by createdAt
    expect(result.data.indicators[0].builtinId).toBe('custom-a');
    expect(result.data.indicators[1].builtinId).toBe('custom-b');
  });

  it('double round-trip preserves data', () => {
    const original = createSettings({
      symbol: 'XRPUSDT',
      interval: '240' as ResolutionString,
      showVolume: true,
      volumeHeight: 0.25,
      chartType: 'line',
    });

    // First round-trip
    const tvData1 = toTvFormat(original, 'Test');
    const result1 = fromTvFormat(tvData1);

    // Second round-trip
    const tvData2 = toTvFormat(result1.data, 'Test');
    const result2 = fromTvFormat(tvData2);

    expect(result2.data.symbol).toBe(original.symbol);
    expect(result2.data.interval).toBe(original.interval);
    expect(result2.data.showVolume).toBe(original.showVolume);
    expect(result2.data.volumeHeight).toBe(original.volumeHeight);
    expect(result2.data.chartType).toBe(original.chartType);
  });
});
