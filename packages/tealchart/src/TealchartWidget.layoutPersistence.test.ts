import type { TealchartWidgetOptions } from './types';

import { describe, expect, it } from 'vitest';

import { resolveDefaultLayoutPersistence } from './TealchartWidget';

function baseOptions(extra: Partial<TealchartWidgetOptions> = {}): TealchartWidgetOptions {
  return {
    container: document.createElement('div'),
    symbol: 'BTCUSDT',
    datafeed: {} as TealchartWidgetOptions['datafeed'],
    ...extra,
  };
}

describe('resolveDefaultLayoutPersistence', () => {
  it('injects a localStorage adapter and default auto-save delay when none provided', () => {
    const resolved = resolveDefaultLayoutPersistence(baseOptions());
    expect(resolved.save_load_adapter).toBeTruthy();
    expect(resolved.auto_save_delay).toBe(1);
  });

  it('does not mutate the caller options object', () => {
    const options = baseOptions();
    const resolved = resolveDefaultLayoutPersistence(options);
    expect(options.save_load_adapter).toBeUndefined();
    expect(resolved).not.toBe(options);
  });

  it('preserves an explicit auto_save_delay when defaulting the adapter', () => {
    const resolved = resolveDefaultLayoutPersistence(baseOptions({ auto_save_delay: 5 }));
    expect(resolved.save_load_adapter).toBeTruthy();
    expect(resolved.auto_save_delay).toBe(5);
  });

  it('leaves options untouched when a save_load_adapter is supplied', () => {
    const adapter = {
      saveChart: async () => 'x',
      getChartContent: async () => '',
      getAllCharts: async () => [],
      removeChart: async () => {},
    };
    const options = baseOptions({ save_load_adapter: adapter });
    const resolved = resolveDefaultLayoutPersistence(options);
    expect(resolved).toBe(options);
    expect(resolved.save_load_adapter).toBe(adapter);
  });

  it('opts out of default persistence when disabled', () => {
    const resolved = resolveDefaultLayoutPersistence(baseOptions({ disable_default_layout_persistence: true }));
    expect(resolved.save_load_adapter).toBeUndefined();
  });
});
