import type { RenderOptions } from './types';

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
    backgroundColor: '#1e222d',
    textColor: '#787b86',
    gridColor: '#363a45',
    crosshairColor: '#758696',
    upColor: '#26a69a',
    downColor: '#ef5350',
  },
};

export const LIGHT_CHART_THEME: ChartTheme = {
  name: 'Light',
  renderOptions: {
    backgroundColor: '#ffffff',
    textColor: '#131722',
    gridColor: '#e0e3eb',
    crosshairColor: '#758696',
    upColor: '#26a69a',
    downColor: '#ef5350',
  },
};

export const BUILTIN_CHART_THEMES: Record<ChartThemeName, ChartTheme> = {
  Dark: DARK_CHART_THEME,
  Light: LIGHT_CHART_THEME,
};

export function resolveChartTheme(theme: ChartThemeInput = 'Dark'): ChartTheme {
  if (typeof theme === 'string') {
    return BUILTIN_CHART_THEMES[theme as ChartThemeName] ?? DARK_CHART_THEME;
  }
  if (!theme?.renderOptions) return DARK_CHART_THEME;
  return theme;
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
