import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
  PRICE_AXIS_TAG_BACKGROUND_ALPHA,
} from '../constants';
import { parseColorChannels, withColorAlpha } from './colorAlpha';

/**
 * The one place a price-axis tag's colours are decided.
 *
 * This existed four times - web's order/position tags, native's order/position
 * tags, native's `price` tags and native's drag-preview tag - and the four had
 * drifted into three different answers for the same question. Each was right
 * about something the others were not, so this is their union rather than any
 * one of them:
 *
 * - Trading lines always fill, from web. An order or position tag carries its
 *   own colour; only `price` tags are ever outlines.
 * - An unfilled tag keeps a dark backing, from native. Unfilled does not mean
 *   transparent: it is what keeps the tag readable where it overlaps a grid
 *   label, and dropping it let the grid read straight through.
 * - Text contrast is measured, from native. Web hardcoded white, which is
 *   unreadable on a light line colour.
 */

export const PRICE_AXIS_TAG_LIGHT_TEXT_COLOR = '#ffffff';

/** Above this, the fill is light enough that white text stops being legible. */
const LIGHT_FILL_LUMINANCE = 0.4;

export interface PriceAxisTagLabel {
  filled?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export interface PriceAxisTagStyle {
  filled: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export function withPriceAxisTagBackgroundAlpha(color: string): string {
  return withColorAlpha(color, PRICE_AXIS_TAG_BACKGROUND_ALPHA);
}

function getRelativeLuminance(red: number, green: number, blue: number): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White on a dark fill, near-black on a light one. */
export function getPriceAxisTagContrastTextColor(backgroundColor: string): string {
  const rgb = parseColorChannels(backgroundColor);
  if (!rgb) return PRICE_AXIS_TAG_LIGHT_TEXT_COLOR;
  return getRelativeLuminance(rgb.red, rgb.green, rgb.blue) > LIGHT_FILL_LUMINANCE
    ? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR
    : PRICE_AXIS_TAG_LIGHT_TEXT_COLOR;
}

export function resolvePriceAxisTagStyle({
  type,
  label,
  color,
}: {
  /** Absent means a trading line, which fills - only `price` is ever an outline. */
  type?: string;
  label: PriceAxisTagLabel | undefined;
  color: string;
}): PriceAxisTagStyle {
  const filled = type !== 'price' || label?.filled === true;
  const backgroundColor = withPriceAxisTagBackgroundAlpha(
    filled ? label?.backgroundColor || color : DEFAULT_TRADE_LINE_LABEL_COLOR,
  );

  return {
    filled,
    backgroundColor,
    borderColor: color,
    // An outline tag draws its text in the line colour, which is the only thing
    // identifying it once the fill is gone.
    textColor: label?.textColor || (filled ? getPriceAxisTagContrastTextColor(backgroundColor) : color),
  };
}
