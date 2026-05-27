import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from './state/chartState';
import {
  chartThemeToRenderOptions,
  mergeChartThemeRenderOptions,
  resolveChartTheme,
  type ChartTheme,
} from './theme';

describe('chart theme helpers', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('resolves built-in theme names', () => {
    expect(resolveChartTheme('Dark').renderOptions.backgroundColor).toBe('#1e222d');
    expect(resolveChartTheme('Light').renderOptions.backgroundColor).toBe('#ffffff');
  });

  it('returns a copy of built-in render options', () => {
    const first = chartThemeToRenderOptions('Dark');
    const second = chartThemeToRenderOptions('Dark');

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('accepts custom theme objects', () => {
    const theme: ChartTheme = {
      name: 'Premys',
      renderOptions: {
        backgroundColor: '#09090b',
        textColor: '#e4e4e7',
      },
    };

    expect(chartThemeToRenderOptions(theme)).toEqual(theme.renderOptions);
  });

  it('lets explicit render options override theme values', () => {
    expect(
      mergeChartThemeRenderOptions('Dark', {
        backgroundColor: '#000000',
      }),
    ).toMatchObject({
      backgroundColor: '#000000',
      gridColor: '#363a45',
    });
  });

  it('falls back to the dark theme for invalid runtime values', () => {
    expect(resolveChartTheme('Unknown' as never)).toBe(resolveChartTheme('Dark'));
    expect(resolveChartTheme({} as never)).toBe(resolveChartTheme('Dark'));
  });
});
