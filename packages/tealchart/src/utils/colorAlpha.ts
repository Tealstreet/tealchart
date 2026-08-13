/**
 * Colour parsing shared by the web and native trade-line paths.
 *
 * Kept dependency-free on purpose: this package renders through Konva on web
 * and Skia on native, and neither ships a colour library the other can use.
 */

export interface ColorChannels {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const HEX_SHORT = /^#?([0-9a-f]{3,4})$/i;
const HEX_LONG = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

export function parseColorChannels(color: string): ColorChannels | null {
  const trimmed = color?.trim();
  if (!trimmed) return null;

  const short = HEX_SHORT.exec(trimmed);
  if (short) {
    const parts = short[1].split('').map((value) => Number.parseInt(`${value}${value}`, 16));
    return {
      red: parts[0],
      green: parts[1],
      blue: parts[2],
      alpha: parts.length > 3 ? parts[3] / 255 : 1,
    };
  }

  const long = HEX_LONG.exec(trimmed);
  if (long) {
    const value = long[1];
    return {
      red: Number.parseInt(value.slice(0, 2), 16),
      green: Number.parseInt(value.slice(2, 4), 16),
      blue: Number.parseInt(value.slice(4, 6), 16),
      alpha: value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = RGB.exec(trimmed);
  if (rgb) {
    return {
      red: clampChannel(Number.parseFloat(rgb[1])),
      green: clampChannel(Number.parseFloat(rgb[2])),
      blue: clampChannel(Number.parseFloat(rgb[3])),
      alpha: rgb[4] === undefined ? 1 : clampAlpha(Number.parseFloat(rgb[4])),
    };
  }

  return null;
}

export function formatRgba(red: number, green: number, blue: number, alpha: number): string {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Lays `tint` over `base` at `ratio`, keeping the base's own opacity.
 *
 * A trade line label is translucent over live candles, so a segment cannot just
 * fill with a low-alpha hue: it would punch a window through the label and put
 * text straight on the candlesticks. Mixing into the label's own ground gives
 * the tint while the label stays one solid, readable object.
 */
export function tintOver(base: string, tint: string, ratio: number): string {
  const baseChannels = parseColorChannels(base);
  const tintChannels = parseColorChannels(tint);
  if (!baseChannels || !tintChannels) return tint;

  const mix = clampAlpha(ratio);
  const channel = (from: number, to: number) => Math.round(from * (1 - mix) + to * mix);

  return formatRgba(
    channel(baseChannels.red, tintChannels.red),
    channel(baseChannels.green, tintChannels.green),
    channel(baseChannels.blue, tintChannels.blue),
    baseChannels.alpha,
  );
}
