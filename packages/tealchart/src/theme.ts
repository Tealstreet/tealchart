import type { RenderOptions } from './types';

import { DEFAULT_BUY_CANDLE_COLOR, DEFAULT_SELL_CANDLE_COLOR } from './constants';

export type ChartThemeName = 'Light' | 'Dark';

export type ChartThemeRenderOptions = Partial<
  Omit<
    RenderOptions,
    | 'width'
    | 'height'
    | 'devicePixelRatio'
    | 'margins'
    | 'exchange'
    | 'symbol'
    | 'resolutionString'
  >
>;

export interface ChartTheme {
  name?: string;
  renderOptions: ChartThemeRenderOptions;
}

export type ChartThemeInput = ChartThemeName | ChartTheme;

export const DARK_CHART_THEME: ChartTheme = {
  name: 'Dark',
  renderOptions: {
    backgroundColor: '#16171a',
    textColor: '#adb1b8',
    gridColor: '#202124',
    crosshairColor: '#71757a',
    upColor: DEFAULT_BUY_CANDLE_COLOR,
    downColor: DEFAULT_SELL_CANDLE_COLOR,
  },
};

export const LIGHT_CHART_THEME: ChartTheme = {
  name: 'Light',
  renderOptions: {
    backgroundColor: '#ffffff',
    textColor: '#71717a',
    gridColor: 'rgba(24, 24, 27, 0.08)',
    crosshairColor: '#3BA55D',
    upColor: '#0f9d6b',
    downColor: '#dc3450',
  },
};

export const BUILTIN_CHART_THEMES: Record<ChartThemeName, ChartTheme> = {
  Dark: DARK_CHART_THEME,
  Light: LIGHT_CHART_THEME,
};

function cloneChartTheme(theme: ChartTheme): ChartTheme {
  return {
    name: theme.name,
    renderOptions: { ...theme.renderOptions },
  };
}

export function resolveChartTheme(theme: ChartThemeInput = 'Dark'): ChartTheme {
  let resolvedTheme: ChartTheme;

  if (typeof theme === 'string') {
    resolvedTheme = BUILTIN_CHART_THEMES[theme as ChartThemeName] ?? DARK_CHART_THEME;
  } else if (theme?.renderOptions) {
    resolvedTheme = theme;
  } else {
    resolvedTheme = DARK_CHART_THEME;
  }

  return cloneChartTheme(resolvedTheme);
}

export function chartThemeToRenderOptions(theme: ChartThemeInput = 'Dark'): ChartThemeRenderOptions {
  return { ...resolveChartTheme(theme).renderOptions };
}

export function mergeChartThemeRenderOptions(
  theme: ChartThemeInput | undefined,
  renderOptions?: Partial<RenderOptions>,
): Partial<RenderOptions> {
  return {
    ...chartThemeToRenderOptions(theme ?? 'Dark'),
    ...renderOptions,
  };
}
