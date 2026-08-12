import { describe, expect, it } from 'vitest';

import { CHART_PROPERTY_KEYS, sanitizeChartProperties } from './overrides';

describe('sanitizeChartProperties', () => {
  it('keeps supported chart property paths', () => {
    expect(
      sanitizeChartProperties({
        'paneProperties.background': '#101418',
        'scalesProperties.textColor': '#eef2f8',
      }),
    ).toEqual({
      'paneProperties.background': '#101418',
      'scalesProperties.textColor': '#eef2f8',
    });
  });

  it('drops real TradingView paths that are not supported yet', () => {
    // These exist in TradingView but nothing renders them here, so persisting
    // them would store a setting that silently does nothing.
    expect(
      sanitizeChartProperties({
        'paneProperties.gridLinesMode': 'both',
        'mainSeriesProperties.minTick': 'default',
      }),
    ).toBeUndefined();
  });

  it('drops values of the wrong type', () => {
    // Every supported path is a color today. A number here would be stored and
    // then stripped on reload, which reads as "the setting did not save".
    expect(
      sanitizeChartProperties({
        'paneProperties.background': 42,
        'scalesProperties.textColor': '#eef2f8',
      }),
    ).toEqual({ 'scalesProperties.textColor': '#eef2f8' });
  });

  it('returns undefined rather than an empty object when nothing survives', () => {
    // Absence and {} are not equivalent downstream: nanostores setKey(k, undefined)
    // deletes the key, and safeDeepMerge skips undefined.
    expect(sanitizeChartProperties({})).toBeUndefined();
    expect(sanitizeChartProperties({ nonsense: 'x' })).toBeUndefined();
  });

  it('rejects non-objects', () => {
    expect(sanitizeChartProperties(null)).toBeUndefined();
    expect(sanitizeChartProperties(undefined)).toBeUndefined();
    expect(sanitizeChartProperties('#fff')).toBeUndefined();
    expect(sanitizeChartProperties(['#fff'])).toBeUndefined();
  });

  it('exposes every supported key at runtime', () => {
    expect(CHART_PROPERTY_KEYS).toContain('paneProperties.background');
    expect(CHART_PROPERTY_KEYS).toContain('mainSeriesProperties.candleStyle.upColor');
    expect(new Set(CHART_PROPERTY_KEYS).size).toBe(CHART_PROPERTY_KEYS.length);
  });
});
