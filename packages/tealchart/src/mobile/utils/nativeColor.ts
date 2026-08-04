import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
} from '../../constants';

export const NATIVE_TOP_BAR_ACTIVE_BACKGROUND_COLOR = '#24272d';
export const NATIVE_PRICE_AXIS_TAG_TEXT_COLOR = '#ffffff';

export function getNativeDarkLabelBackgroundColor(): string {
  return DEFAULT_TRADE_LINE_LABEL_COLOR;
}

export function getNativePriceAxisTagBackgroundColor(labelBackgroundColor: string | undefined, lineColor: string): string {
  return labelBackgroundColor || lineColor;
}

export function getNativePriceAxisTagTextColor(labelTextColor: string | undefined, backgroundColor: string): string {
  if (labelTextColor) return labelTextColor;

  const hex = parseHexColor(backgroundColor.trim());
  const rgb = hex ?? parseRgbColor(backgroundColor.trim());
  if (!rgb) return NATIVE_PRICE_AXIS_TAG_TEXT_COLOR;

  const luminance = getRelativeLuminance(rgb.red, rgb.green, rgb.blue);
  return luminance > 0.4 ? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR : NATIVE_PRICE_AXIS_TAG_TEXT_COLOR;
}

export function getNativeMutedTextColor(textColor: string): string {
  const trimmed = textColor.trim();
  const hex = parseHexColor(trimmed);
  if (hex) return formatRgba(hex.red, hex.green, hex.blue, 0.72);

  const rgb = parseRgbColor(trimmed);
  if (rgb) return formatRgba(rgb.red, rgb.green, rgb.blue, 0.72);

  return textColor;
}

function parseHexColor(color: string): { red: number; green: number; blue: number } | null {
  const short = /^#?([0-9a-f]{3})$/i.exec(color);
  if (short) {
    const [red, green, blue] = short[1].split('').map((value) => Number.parseInt(`${value}${value}`, 16));
    return { red, green, blue };
  }

  const long = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!long) return null;

  const value = long[1];
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function parseRgbColor(color: string): { red: number; green: number; blue: number } | null {
  const match = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i.exec(color);
  if (!match) return null;

  return {
    red: clampColorChannel(Number.parseFloat(match[1])),
    green: clampColorChannel(Number.parseFloat(match[2])),
    blue: clampColorChannel(Number.parseFloat(match[3])),
  };
}

function clampColorChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function formatRgba(red: number, green: number, blue: number, alpha: number): string {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRelativeLuminance(red: number, green: number, blue: number): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
