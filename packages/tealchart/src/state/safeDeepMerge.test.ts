import { describe, expect, it } from 'vitest';

import { CHART_SETTINGS_VERSION, migrateChartSettings, safeDeepMerge } from './safeDeepMerge';

interface TestSettings {
  name: string;
  count: number;
  enabled: boolean;
  nested: {
    color: string;
    size: number;
  };
  items: string[];
}

const TEST_DEFAULTS: TestSettings = {
  name: 'default',
  count: 10,
  enabled: true,
  nested: {
    color: 'blue',
    size: 14,
  },
  items: ['a', 'b', 'c'],
};

describe('safeDeepMerge', () => {
  describe('basic behavior', () => {
    it('returns cloned defaults when userState is null', () => {
      const result = safeDeepMerge(null, TEST_DEFAULTS);
      expect(result).toEqual(TEST_DEFAULTS);
      // Ensure it is a clone, not the same reference
      expect(result).not.toBe(TEST_DEFAULTS);
      expect(result.nested).not.toBe(TEST_DEFAULTS.nested);
    });

    it('returns cloned defaults when userState is undefined', () => {
      const result = safeDeepMerge(undefined, TEST_DEFAULTS);
      expect(result).toEqual(TEST_DEFAULTS);
      expect(result).not.toBe(TEST_DEFAULTS);
    });

    it('preserves all user values when userState is complete', () => {
      const userState: TestSettings = {
        name: 'custom',
        count: 42,
        enabled: false,
        nested: {
          color: 'red',
          size: 20,
        },
        items: ['x', 'y'],
      };
      const result = safeDeepMerge(userState, TEST_DEFAULTS);
      expect(result).toEqual(userState);
    });

    it('fills missing properties from defaults', () => {
      const userState: Partial<TestSettings> = {
        name: 'partial',
      };
      const result = safeDeepMerge(userState, TEST_DEFAULTS);
      expect(result.name).toBe('partial');
      expect(result.count).toBe(10);
      expect(result.enabled).toBe(true);
      expect(result.nested).toEqual({ color: 'blue', size: 14 });
      expect(result.items).toEqual(['a', 'b', 'c']);
    });
  });

  describe('corrupted values', () => {
    it('replaces string "undefined" with default', () => {
      const userState = { name: 'undefined' as string, count: 5 };
      const result = safeDeepMerge(userState as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result.name).toBe('default');
      expect(result.count).toBe(5);
    });

    it('replaces string "NaN" with default', () => {
      const userState = { name: 'NaN' as string };
      const result = safeDeepMerge(userState as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result.name).toBe('default');
    });

    it('replaces empty string with default', () => {
      const userState = { name: '' as string };
      const result = safeDeepMerge(userState as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result.name).toBe('default');
    });

    it('replaces NaN number with default', () => {
      const userState = { count: NaN };
      const result = safeDeepMerge(userState as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result.count).toBe(10);
    });

    it('replaces Infinity number with default', () => {
      const userState = { count: Infinity };
      const result = safeDeepMerge(userState as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result.count).toBe(10);

      const userState2 = { count: -Infinity };
      const result2 = safeDeepMerge(userState2 as Partial<TestSettings>, TEST_DEFAULTS);
      expect(result2.count).toBe(10);
    });
  });

  describe('deep merge behavior', () => {
    it('recursively merges nested objects', () => {
      const userState: Partial<TestSettings> = {
        nested: { color: 'green' } as TestSettings['nested'],
      };
      const result = safeDeepMerge(userState, TEST_DEFAULTS);
      expect(result.nested.color).toBe('green');
      expect(result.nested.size).toBe(14);
    });

    it('uses user array entirely instead of merging items', () => {
      const userState: Partial<TestSettings> = {
        items: ['only-one'],
      };
      const result = safeDeepMerge(userState, TEST_DEFAULTS);
      expect(result.items).toEqual(['only-one']);
    });

    it('replaces object default when user provides a non-object value', () => {
      // User has a primitive where default has an object
      const defaults = { config: { a: 1, b: 2 }, name: 'test' };
      const userState = { config: 'flat-string' as unknown as { a: number; b: number } };
      const result = safeDeepMerge(userState, defaults);
      expect(result.config).toBe('flat-string');
    });
  });
});

describe('migrateChartSettings', () => {
  interface ChartLike {
    version: number;
    interval: string;
    indicators: string[];
    showVolume: boolean;
  }

  const CHART_DEFAULTS: ChartLike = {
    version: 1,
    interval: '1h',
    indicators: [],
    showVolume: true,
  };

  it('returns cloned defaults when stored is null', () => {
    const result = migrateChartSettings(null, CHART_DEFAULTS);
    expect(result).toEqual(CHART_DEFAULTS);
    expect(result).not.toBe(CHART_DEFAULTS);
  });

  it('adds indicators array and sets version=1 for legacy data', () => {
    const legacy = { interval: '5m', showVolume: false } as Partial<ChartLike>;
    const result = migrateChartSettings(legacy, CHART_DEFAULTS);
    expect(result.version).toBe(1);
    expect(result.indicators).toEqual([]);
    expect(result.interval).toBe('5m');
    expect(result.showVolume).toBe(false);
  });

  it('preserves already-v1 data without modification', () => {
    const v1Data: ChartLike = {
      version: 1,
      interval: '15m',
      indicators: ['rsi', 'macd'],
      showVolume: false,
    };
    const result = migrateChartSettings(v1Data, CHART_DEFAULTS);
    expect(result.version).toBe(1);
    expect(result.indicators).toEqual(['rsi', 'macd']);
    expect(result.interval).toBe('15m');
    expect(result.showVolume).toBe(false);
  });

  it('exports CHART_SETTINGS_VERSION as 1', () => {
    expect(CHART_SETTINGS_VERSION).toBe(1);
  });

  it('fills missing fields from defaults after migration', () => {
    // Legacy data missing showVolume entirely
    const legacy = { interval: '4h' } as Partial<ChartLike>;
    const result = migrateChartSettings(legacy, CHART_DEFAULTS);
    expect(result.version).toBe(1);
    expect(result.interval).toBe('4h');
    expect(result.showVolume).toBe(true); // filled from defaults
    expect(result.indicators).toEqual([]); // added by migration
  });
});
