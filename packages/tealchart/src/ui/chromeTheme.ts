import type { RenderOptions } from '../types';

/**
 * Maps the chart theme's render colors onto the CSS custom properties used by
 * the plain-DOM chrome (drawing rail, flyouts, tooltip, favorites bar,
 * selected-action surface, top bar, modals, context menus). Applying these to a
 * host element lets all descendant chrome track the chart background/accent in
 * both dark and light mode instead of hardcoded fallbacks.
 *
 * Portaled chrome (elements appended to document.body) does not inherit vars
 * from the widget root, so this is applied to those elements directly too.
 */

/** Parse a `#RRGGBB` hex or `rgb()/rgba()` color into [r, g, b]; null otherwise. */
function parseColor(color: string): [number, number, number] | null {
  const trimmed = color.trim();
  const hex = /^#?([0-9a-f]{6})$/i.exec(trimmed);
  if (hex) {
    const value = parseInt(hex[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function gammaExpand(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * gammaExpand(r) + 0.7152 * gammaExpand(g) + 0.0722 * gammaExpand(b);
}

/** True when the color is dark enough to want light (white) overlays on top. */
export function isDarkColor(color: string): boolean {
  const rgb = parseColor(color);
  return rgb ? relativeLuminance(rgb) < 0.4 : true;
}

/** Blend a color toward black (target 0) or white (target 255) by amount [0,1]. */
function mixTowards(color: string, target: 0 | 255, amount: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const [r, g, b] = rgb.map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Return `color` at the given alpha as rgba(); passes through unparseable colors. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function resolveChromeThemeVars(
  renderOptions: Partial<RenderOptions> | undefined,
): Record<string, string> {
  const ro = renderOptions ?? {};
  const bg = ro.backgroundColor ?? '#141416';
  const text = ro.textColor ?? '#b2b5be';
  const border = ro.gridColor ?? 'rgba(255, 255, 255, 0.08)';
  const accent = ro.crosshairColor ?? '#2962ff';
  const buy = ro.upColor ?? '#26a69a';
  const sell = ro.downColor ?? '#ef5350';

  const dark = isDarkColor(bg);
  const overlay = (alpha: number): string =>
    dark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
  const elevated = (amount: number): string => mixTowards(bg, dark ? 255 : 0, amount);

  return {
    // Primary / secondary / tertiary text form a brightness ladder from one color.
    '--text': text,
    '--text2': withAlpha(text, 0.75),
    '--text3': withAlpha(text, 0.55),
    '--bg': bg,
    '--border': border,
    '--accent': accent,
    '--accent-bg': withAlpha(accent, 0.16),
    '--active-bg': overlay(0.12),
    '--hover-bg': overlay(0.06),
    '--tooltip-bg': elevated(0.14),
    '--modal-bg': elevated(0.06),
    '--input-bg': elevated(0.1),
    '--buy-color': buy,
    '--sell-color': sell,
  };
}

export function applyChromeThemeVars(
  el: HTMLElement,
  renderOptions: Partial<RenderOptions> | undefined,
): void {
  const vars = resolveChromeThemeVars(renderOptions);
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}
