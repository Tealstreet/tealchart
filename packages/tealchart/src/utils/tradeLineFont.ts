import type { ChartLineLabel } from '../types';

export interface TradeLineFont {
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
}

export function resolveTradeLineFont(font: string | undefined, fontFamily = 'sans-serif'): TradeLineFont {
  const fallback = { fontSize: 11, fontFamily, fontStyle: '' };
  if (!font || font.length > 512) return fallback;
  const match = font.trim().match(/^(?:(.*?)\s+)?(\d+(?:\.\d+)?)px(?:\s*\/\s*(?:normal|[\d.]+(?:px|%)?))?\s+(.+)$/i);
  if (!match) return fallback;
  const size = Number(match[2]);
  const family = match[3].trim();
  if (!Number.isFinite(size) || size <= 0 || size > 128 || family.includes('var(')) return fallback;
  const modifiers = match[1] ?? '';
  const italic = /\b(?:italic|oblique)\b/i.test(modifiers);
  const bold = /\b(?:bold|bolder|[6-9]00)\b/i.test(modifiers);
  return {
    fontSize: size,
    fontFamily: family,
    fontStyle: [italic && 'italic', bold && 'bold'].filter(Boolean).join(' '),
  };
}

export function getTradeLineLabelHeight(label: ChartLineLabel | undefined): number {
  const size = Math.max(11, ...(label?.segments.map((segment) => resolveTradeLineFont(segment.font).fontSize) ?? []));
  return Math.max(18, Math.ceil(size) + 6);
}
