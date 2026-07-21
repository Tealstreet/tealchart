import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_BUY_CANDLE_COLOR,
  DEFAULT_SELL_CANDLE_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
  DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
  POSITIVE_PNL_COLOR,
  TAKE_PROFIT_COLOR,
} from './constants';
import { clearChartStoreCache } from './state/chartState';
import {
  chartThemeToRenderOptions,
  mergeChartThemeRenderOptions,
  resolveChartTheme,
  type ChartTheme,
} from './theme';
import { DEFAULT_RENDER_OPTIONS } from './types';
import { buildLastTradePriceLine } from './utils/buildLastTradePriceLine';

describe('chart theme helpers', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('resolves built-in theme names', () => {
    expect(resolveChartTheme('Dark').renderOptions.backgroundColor).toBe('#16171a');
    expect(resolveChartTheme('Light').renderOptions.backgroundColor).toBe('#ffffff');
  });

  it('keeps positive trading-line colors tied to the default buy candle color', () => {
    expect(DEFAULT_RENDER_OPTIONS.upColor).toBe(DEFAULT_BUY_CANDLE_COLOR);
    expect(DEFAULT_RENDER_OPTIONS.downColor).toBe(DEFAULT_SELL_CANDLE_COLOR);
    expect(resolveChartTheme('Dark').renderOptions.upColor).toBe(DEFAULT_BUY_CANDLE_COLOR);
    expect(resolveChartTheme('Dark').renderOptions.downColor).toBe(DEFAULT_SELL_CANDLE_COLOR);
    expect(resolveChartTheme('Light').renderOptions.upColor).toBe('#0f9d6b');
    expect(TAKE_PROFIT_COLOR).toBe(DEFAULT_BUY_CANDLE_COLOR);
    expect(POSITIVE_PNL_COLOR).toBe(DEFAULT_BUY_CANDLE_COLOR);
    expect(DEFAULT_TRADE_LINE_LABEL_COLOR).toBe('#338DE2');
    expect(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR).toBe('rgba(255, 255, 255, 0.16)');
    expect(
      buildLastTradePriceLine({
        latestBar: { time: 1, open: 1, high: 2, low: 1, close: 2, volume: 1 },
        interval: '1',
      })?.color,
    ).toBe(DEFAULT_BUY_CANDLE_COLOR);
  });

  it('returns a copy of built-in render options', () => {
    const first = chartThemeToRenderOptions('Dark');
    const second = chartThemeToRenderOptions('Dark');

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('returns cloned theme objects from resolver', () => {
    const first = resolveChartTheme('Dark');
    const second = resolveChartTheme('Dark');

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.renderOptions).not.toBe(second.renderOptions);

    first.renderOptions.backgroundColor = '#000000';

    expect(resolveChartTheme('Dark').renderOptions.backgroundColor).toBe('#16171a');
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
    expect(resolveChartTheme(theme)).not.toBe(theme);
    expect(resolveChartTheme(theme).renderOptions).not.toBe(theme.renderOptions);
  });

  it('lets explicit render options override theme values', () => {
    expect(
      mergeChartThemeRenderOptions('Dark', {
        backgroundColor: '#000000',
      }),
    ).toMatchObject({
      backgroundColor: '#000000',
      gridColor: '#202124',
    });
  });

  it('falls back to the dark theme for invalid runtime values', () => {
    expect(resolveChartTheme('Unknown' as never)).toEqual(resolveChartTheme('Dark'));
    expect(resolveChartTheme({} as never)).toEqual(resolveChartTheme('Dark'));
  });
});
