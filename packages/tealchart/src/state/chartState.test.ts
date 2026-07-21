import { describe, it, expect } from 'vitest';
import {
  resolutionToMs,
  getResolutionLabel,
  getDecimalPlacesFromPrecision,
  formatPriceWithPrecision,
  DEFAULT_CHART_SETTINGS,
  AVAILABLE_TIMEFRAMES,
  type ChartSettings,
} from './chartState';
import type { ResolutionString } from '../types';

describe('chartState', () => {
  describe('resolutionToMs', () => {
    it('converts minute resolutions without suffix', () => {
      expect(resolutionToMs('1' as ResolutionString)).toBe(60 * 1000);
      expect(resolutionToMs('5' as ResolutionString)).toBe(5 * 60 * 1000);
      expect(resolutionToMs('15' as ResolutionString)).toBe(15 * 60 * 1000);
      expect(resolutionToMs('30' as ResolutionString)).toBe(30 * 60 * 1000);
      expect(resolutionToMs('60' as ResolutionString)).toBe(60 * 60 * 1000);
    });

    it('converts minute resolutions with M suffix', () => {
      expect(resolutionToMs('1M' as ResolutionString)).toBe(60 * 1000);
      expect(resolutionToMs('5M' as ResolutionString)).toBe(5 * 60 * 1000);
    });

    it('converts hourly resolutions', () => {
      expect(resolutionToMs('1H' as ResolutionString)).toBe(60 * 60 * 1000);
      expect(resolutionToMs('4H' as ResolutionString)).toBe(4 * 60 * 60 * 1000);
      expect(resolutionToMs('240' as ResolutionString)).toBe(4 * 60 * 60 * 1000); // 240 minutes = 4 hours
    });

    it('converts daily resolutions', () => {
      expect(resolutionToMs('1D' as ResolutionString)).toBe(24 * 60 * 60 * 1000);
      expect(resolutionToMs('D' as ResolutionString)).toBe(24 * 60 * 60 * 1000);
    });

    it('converts weekly resolutions', () => {
      expect(resolutionToMs('1W' as ResolutionString)).toBe(7 * 24 * 60 * 60 * 1000);
      expect(resolutionToMs('W' as ResolutionString)).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('converts second resolutions', () => {
      expect(resolutionToMs('1S' as ResolutionString)).toBe(1000);
      expect(resolutionToMs('30S' as ResolutionString)).toBe(30 * 1000);
    });

    it('handles lowercase suffixes', () => {
      expect(resolutionToMs('1h' as ResolutionString)).toBe(60 * 60 * 1000);
      expect(resolutionToMs('1d' as ResolutionString)).toBe(24 * 60 * 60 * 1000);
    });

    it('defaults to minutes for unknown suffixes', () => {
      expect(resolutionToMs('5X' as ResolutionString)).toBe(5 * 60 * 1000);
    });
  });

  describe('getResolutionLabel', () => {
    it('returns short label for known resolutions', () => {
      expect(getResolutionLabel('1' as ResolutionString)).toBe('1m');
      expect(getResolutionLabel('5' as ResolutionString)).toBe('5m');
      expect(getResolutionLabel('15' as ResolutionString)).toBe('15m');
      expect(getResolutionLabel('60' as ResolutionString)).toBe('1h');
      expect(getResolutionLabel('240' as ResolutionString)).toBe('4h');
      expect(getResolutionLabel('1D' as ResolutionString)).toBe('1D');
      expect(getResolutionLabel('1W' as ResolutionString)).toBe('1W');
    });

    it('returns raw resolution for unknown values', () => {
      expect(getResolutionLabel('999' as ResolutionString)).toBe('999');
      expect(getResolutionLabel('unknown' as ResolutionString)).toBe('unknown');
    });
  });

  describe('getDecimalPlacesFromPrecision', () => {
    it('returns correct decimal places for common precisions', () => {
      expect(getDecimalPlacesFromPrecision(0.01)).toBe(2);
      expect(getDecimalPlacesFromPrecision(0.001)).toBe(3);
      expect(getDecimalPlacesFromPrecision(0.0001)).toBe(4);
      expect(getDecimalPlacesFromPrecision(0.00001)).toBe(5);
      expect(getDecimalPlacesFromPrecision(0.1)).toBe(1);
    });

    it('returns 0 for precision >= 1', () => {
      expect(getDecimalPlacesFromPrecision(1)).toBe(0);
      expect(getDecimalPlacesFromPrecision(10)).toBe(0);
      expect(getDecimalPlacesFromPrecision(100)).toBe(0);
    });

    it('returns 2 for invalid precision values', () => {
      expect(getDecimalPlacesFromPrecision(0)).toBe(2);
      expect(getDecimalPlacesFromPrecision(-1)).toBe(2);
      expect(getDecimalPlacesFromPrecision(Infinity)).toBe(2);
      expect(getDecimalPlacesFromPrecision(NaN)).toBe(2);
    });

    it('handles scientific notation', () => {
      expect(getDecimalPlacesFromPrecision(1e-8)).toBe(8);
      expect(getDecimalPlacesFromPrecision(1e-5)).toBe(5);
    });
  });

  describe('formatPriceWithPrecision', () => {
    it('formats price with correct decimal places', () => {
      expect(formatPriceWithPrecision(50000, 0.01)).toBe('50,000.00');
      expect(formatPriceWithPrecision(50000.5, 0.1)).toBe('50,000.5');
      expect(formatPriceWithPrecision(50000.123, 0.001)).toBe('50,000.123');
    });

    it('pads with zeros when needed', () => {
      expect(formatPriceWithPrecision(50000, 0.001)).toBe('50,000.000');
    });

    it('handles whole numbers with 0 precision', () => {
      expect(formatPriceWithPrecision(50000, 1)).toBe('50,000');
    });

    it('handles small numbers', () => {
      expect(formatPriceWithPrecision(0.00001234, 0.00000001)).toBe('0.00001234');
    });
  });

  describe('DEFAULT_CHART_SETTINGS', () => {
    it('has expected default values', () => {
      expect(DEFAULT_CHART_SETTINGS.interval).toBe('1h');
      expect(DEFAULT_CHART_SETTINGS.symbol).toBe('BTCUSDT');
      expect(DEFAULT_CHART_SETTINGS.showVolume).toBe(true);
      expect(DEFAULT_CHART_SETTINGS.volumeHeight).toBe(0.2);
      expect(DEFAULT_CHART_SETTINGS.chartType).toBe('candle');
      expect(DEFAULT_CHART_SETTINGS.autoScale).toBe(true);
      expect(DEFAULT_CHART_SETTINGS.indicators).toEqual([]);
    });
  });

  describe('AVAILABLE_TIMEFRAMES', () => {
    it('includes common timeframes', () => {
      const values = AVAILABLE_TIMEFRAMES.map((tf) => tf.value);
      expect(values).toContain('1');
      expect(values).toContain('5');
      expect(values).toContain('15');
      expect(values).toContain('60');
      expect(values).toContain('240');
      expect(values).toContain('1D');
      expect(values).toContain('1W');
    });

    it('has matching labels for each timeframe', () => {
      for (const tf of AVAILABLE_TIMEFRAMES) {
        expect(tf.label).toBeTruthy();
        expect(tf.shortLabel).toBeTruthy();
      }
    });
  });
});
