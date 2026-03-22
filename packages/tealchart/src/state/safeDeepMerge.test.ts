import { describe, expect, it } from 'vitest';

import { CHART_SETTINGS_VERSION, migrateChartSettings, safeDeepMerge } from './safeDeepMerge';

describe('safeDeepMerge', () => {
  const defaults = {
    name: 'default',
    count: 10,
    nested: {
      color: 'red',
      size: 5,
    },
    items: [1, 2, 3],
    flag: true,
  };

  describe('null/undefined userState', () => {
    it('returns cloned defaults when userState is null', () => {
      const result = safeDeepMerge(null, defaults);
      expect(result).toEqual(defaults);
      // Should be a clone, not the same reference
      expect(result).not.toBe(defaults);
    });

    it('returns cloned defaults when userState is undefined', () => {
      const result = safeDeepMerge(undefined, defaults);
      expect(result).toEqual(defaults);
    });
  });

  describe('corrupted string values', () => {
    it('replaces "undefined" string with default', () => {
      const result = safeDeepMerge({ name: 'undefined' }, defaults);
      expect(result.name).toBe('default');
    });

    it('replaces "null" string with default', () => {
      const result = safeDeepMerge({ name: 'null' }, defaults);
      expect(result.name).toBe('default');
    });

    it('replaces "NaN" string with default', () => {
      const result = safeDeepMerge({ name: 'NaN' }, defaults);
      expect(result.name).toBe('default');
    });

    it('replaces empty string with default', () => {
      const result = safeDeepMerge({ name: '' }, defaults);
      expect(result.name).toBe('default');
    });

    it('keeps valid strings', () => {
      const result = safeDeepMerge({ name: 'hello' }, defaults);
      expect(result.name).toBe('hello');
    });
  });

  describe('non-finite numbers', () => {
    it('replaces NaN with default', () => {
      const result = safeDeepMerge({ count: NaN }, defaults);
      expect(result.count).toBe(10);
    });

    it('replaces Infinity with default', () => {
      const result = safeDeepMerge({ count: Infinity }, defaults);
      expect(result.count).toBe(10);
    });

    it('replaces -Infinity with default', () => {
      const result = safeDeepMerge({ count: -Infinity }, defaults);
      expect(result.count).toBe(10);
    });

    it('keeps valid numbers including zero', () => {
      const result = safeDeepMerge({ count: 0 }, defaults);
      expect(result.count).toBe(0);
    });

    it('keeps negative numbers', () => {
      const result = safeDeepMerge({ count: -5 }, defaults);
      expect(result.count).toBe(-5);
    });
  });

  describe('nested recursive merge', () => {
    it('merges nested objects recursively', () => {
      const result = safeDeepMerge({ nested: { color: 'blue' } } as typeof defaults, defaults);
      expect(result.nested.color).toBe('blue');
      expect(result.nested.size).toBe(5); // default preserved
    });

    it('fills missing nested properties from defaults', () => {
      const result = safeDeepMerge({ nested: {} } as typeof defaults, defaults);
      expect(result.nested.color).toBe('red');
      expect(result.nested.size).toBe(5);
    });

    it('replaces corrupted nested values with defaults', () => {
      const result = safeDeepMerge({ nested: { color: 'undefined', size: NaN } }, defaults);
      expect(result.nested.color).toBe('red');
      expect(result.nested.size).toBe(5);
    });
  });

  describe('arrays', () => {
    it('replaces arrays wholesale (no item merging)', () => {
      const result = safeDeepMerge({ items: [10, 20] }, defaults);
      expect(result.items).toEqual([10, 20]);
    });

    it('preserves empty arrays from user', () => {
      const result = safeDeepMerge({ items: [] }, defaults);
      expect(result.items).toEqual([]);
    });
  });

  describe('deep clone isolation', () => {
    it('result is independent of defaults', () => {
      const result = safeDeepMerge({ name: 'custom' }, defaults);
      result.nested.color = 'green';
      expect(defaults.nested.color).toBe('red');
    });

    it('result is independent of userState', () => {
      const user = { nested: { color: 'blue', size: 5 } };
      const result = safeDeepMerge(user, defaults);
      result.nested.color = 'green';
      expect(user.nested.color).toBe('blue');
    });
  });

  describe('missing properties filled from defaults', () => {
    it('fills properties not present in userState', () => {
      const result = safeDeepMerge({ name: 'custom' }, defaults);
      expect(result.count).toBe(10);
      expect(result.flag).toBe(true);
      expect(result.nested).toEqual({ color: 'red', size: 5 });
    });
  });

  describe('boolean values', () => {
    it('keeps false boolean from user', () => {
      const result = safeDeepMerge({ flag: false }, defaults);
      expect(result.flag).toBe(false);
    });
  });
});

describe('migrateChartSettings', () => {
  const defaultSettings = {
    symbol: 'BTCUSDT',
    interval: '60',
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [] as unknown[],
    version: CHART_SETTINGS_VERSION,
  };

  describe('null stored settings', () => {
    it('returns cloned defaults when stored is null', () => {
      const result = migrateChartSettings(null, defaultSettings);
      expect(result).toEqual(defaultSettings);
      expect(result).not.toBe(defaultSettings);
    });

    it('returns cloned defaults when stored is undefined', () => {
      const result = migrateChartSettings(undefined, defaultSettings);
      expect(result).toEqual(defaultSettings);
    });
  });

  describe('v0 to v1 migration', () => {
    it('adds indicators array if missing', () => {
      const stored = { symbol: 'ETHUSDT', interval: '15' };
      const result = migrateChartSettings(stored, defaultSettings);
      expect(result.indicators).toEqual([]);
    });

    it('sets version to 1', () => {
      const stored = { symbol: 'ETHUSDT' };
      const result = migrateChartSettings(stored, defaultSettings);
      expect(result.version).toBe(1);
    });

    it('preserves existing indicators array', () => {
      const stored = {
        symbol: 'ETHUSDT',
        indicators: [{ id: 'test', name: 'Test' }],
      };
      const result = migrateChartSettings(stored, defaultSettings);
      expect(result.indicators).toEqual([{ id: 'test', name: 'Test' }]);
    });
  });

  describe('safe merge after migration', () => {
    it('fills missing fields from defaults after migration', () => {
      const stored = { symbol: 'ETHUSDT' };
      const result = migrateChartSettings(stored, defaultSettings);
      expect(result.symbol).toBe('ETHUSDT');
      expect(result.showVolume).toBe(true);
      expect(result.volumeHeight).toBe(0.2);
    });

    it('replaces corrupted values after migration', () => {
      const stored = { symbol: 'NaN', interval: '' };
      const result = migrateChartSettings(stored, defaultSettings);
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.interval).toBe('60');
    });
  });
});
