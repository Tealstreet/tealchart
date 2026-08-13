import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
} from '../../constants';
import { formatRgba, parseColorChannels } from '../../utils/colorAlpha';

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

  const rgb = parseColorChannels(backgroundColor);
  if (!rgb) return NATIVE_PRICE_AXIS_TAG_TEXT_COLOR;

  const luminance = getRelativeLuminance(rgb.red, rgb.green, rgb.blue);
  return luminance > 0.4 ? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR : NATIVE_PRICE_AXIS_TAG_TEXT_COLOR;
}

export function getNativeMutedTextColor(textColor: string): string {
  const rgb = parseColorChannels(textColor);
  if (!rgb) return textColor;

  return formatRgba(rgb.red, rgb.green, rgb.blue, 0.72);
}

function getRelativeLuminance(red: number, green: number, blue: number): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
