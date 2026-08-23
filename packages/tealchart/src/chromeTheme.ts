import type { ChartChromeThemeOptions, ChartChromeThemeOverrides, RenderOptions } from './types';

import { DEFAULT_BUY_CANDLE_COLOR, DEFAULT_SELL_CANDLE_COLOR } from './constants';
import { formatRgba, parseColorChannels } from './utils/colorAlpha';

export type ChartChromeTheme = ChartChromeThemeOptions;

function relativeLuminance(red: number, green: number, blue: number): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkChromeColor(color: string): boolean {
  const rgb = parseColorChannels(color);
  return rgb ? relativeLuminance(rgb.red, rgb.green, rgb.blue) < 0.4 : true;
}

function mixTowards(color: string, target: 0 | 255, amount: number): string {
  const rgb = parseColorChannels(color);
  if (!rgb) return color;
  const red = Math.round(rgb.red + (target - rgb.red) * amount);
  const green = Math.round(rgb.green + (target - rgb.green) * amount);
  const blue = Math.round(rgb.blue + (target - rgb.blue) * amount);
  return `rgb(${red}, ${green}, ${blue})`;
}

export function withChromeAlpha(color: string, alpha: number): string {
  const rgb = parseColorChannels(color);
  if (!rgb) return color;
  return formatRgba(rgb.red, rgb.green, rgb.blue, alpha);
}

export function resolveChartChromeTheme(
  renderOptions: Partial<RenderOptions> | undefined,
): ChartChromeTheme {
  const ro = renderOptions ?? {};
  const overrides = ro.chromeTheme ?? {};
  const canvasBackgroundColor = overrides.canvasBackgroundColor ?? ro.backgroundColor ?? '#141416';
  const textColor = overrides.textColor ?? ro.textColor ?? '#b2b5be';
  const borderColor = overrides.borderColor ?? ro.gridColor ?? 'rgba(255, 255, 255, 0.08)';
  const accentColor = overrides.accentColor ?? ro.crosshairColor ?? '#2962ff';
  const buyColor = overrides.buyColor ?? ro.upColor ?? DEFAULT_BUY_CANDLE_COLOR;
  const sellColor = overrides.sellColor ?? ro.downColor ?? DEFAULT_SELL_CANDLE_COLOR;

  const dark = isDarkChromeColor(canvasBackgroundColor);
  const overlay = (alpha: number): string =>
    dark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
  const elevated = (amount: number): string => mixTowards(canvasBackgroundColor, dark ? 255 : 0, amount);

  const hoverBackgroundColor = overrides.hoverBackgroundColor ?? overlay(0.06);
  const activeBackgroundColor = overrides.activeBackgroundColor ?? overlay(0.12);
  const popoverBackgroundColor = overrides.popoverBackgroundColor ?? canvasBackgroundColor;

  return {
    accentBackgroundColor: overrides.accentBackgroundColor ?? withChromeAlpha(accentColor, 0.16),
    accentColor,
    activeBackgroundColor,
    backdropColor: overrides.backdropColor ?? 'rgba(0, 0, 0, 0.6)',
    borderColor,
    buyColor,
    canvasBackgroundColor,
    hoverBackgroundColor,
    inputBackgroundColor: overrides.inputBackgroundColor ?? hoverBackgroundColor,
    leftToolRailBackgroundColor: overrides.leftToolRailBackgroundColor ?? canvasBackgroundColor,
    menuBackgroundColor: overrides.menuBackgroundColor ?? canvasBackgroundColor,
    modalBackgroundColor: overrides.modalBackgroundColor ?? canvasBackgroundColor,
    mutedTextColor: overrides.mutedTextColor ?? withChromeAlpha(textColor, 0.75),
    popoverBackgroundColor,
    sellColor,
    tertiaryTextColor: overrides.tertiaryTextColor ?? withChromeAlpha(textColor, 0.55),
    textColor,
    tooltipBackgroundColor: overrides.tooltipBackgroundColor ?? elevated(0.14),
    topBarBackgroundColor: overrides.topBarBackgroundColor ?? canvasBackgroundColor,
    warningColor: overrides.warningColor ?? '#ff9800',
  };
}

export function resolveChromeThemeVars(
  renderOptions: Partial<RenderOptions> | undefined,
): Record<string, string> {
  const theme = resolveChartChromeTheme(renderOptions);
  return {
    '--tc-canvas-bg': theme.canvasBackgroundColor,
    '--tc-topbar-bg': theme.topBarBackgroundColor,
    '--tc-left-rail-bg': theme.leftToolRailBackgroundColor,
    '--tc-menu-bg': theme.menuBackgroundColor,
    '--tc-popover-bg': theme.popoverBackgroundColor,
    '--tc-modal-bg': theme.modalBackgroundColor,
    '--tc-input-bg': theme.inputBackgroundColor,
    '--tc-border': theme.borderColor,
    '--tc-text': theme.textColor,
    '--tc-text2': theme.mutedTextColor,
    '--tc-text3': theme.tertiaryTextColor,
    '--tc-accent': theme.accentColor,
    '--tc-accent-bg': theme.accentBackgroundColor,
    '--tc-active-bg': theme.activeBackgroundColor,
    '--tc-hover-bg': theme.hoverBackgroundColor,
    '--tc-tooltip-bg': theme.tooltipBackgroundColor,
    '--tc-backdrop': theme.backdropColor,
    '--tc-buy-color': theme.buyColor,
    '--tc-sell-color': theme.sellColor,
    '--tc-warning': theme.warningColor,
    '--tc-bg': theme.canvasBackgroundColor,
    '--bg': theme.canvasBackgroundColor,
    '--modal-bg': theme.modalBackgroundColor,
    '--input-bg': theme.inputBackgroundColor,
    '--border': theme.borderColor,
    '--text': theme.textColor,
    '--text2': theme.mutedTextColor,
    '--text3': theme.tertiaryTextColor,
    '--accent': theme.accentColor,
    '--accent-bg': theme.accentBackgroundColor,
    '--active-bg': theme.activeBackgroundColor,
    '--hover-bg': theme.hoverBackgroundColor,
    '--tooltip-bg': theme.tooltipBackgroundColor,
    '--buy-color': theme.buyColor,
    '--sell-color': theme.sellColor,
  };
}
