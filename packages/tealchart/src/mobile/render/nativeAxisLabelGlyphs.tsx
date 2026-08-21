import type { SkFont, SkPoint } from '@shopify/react-native-skia';

export interface NativeAxisGlyph {
  id: number;
  pos: SkPoint;
}

export interface NativeAxisGlyphMetric {
  advance: number;
  id: number;
}

/**
 * character -> glyph id and advance, resolved once on the JS thread.
 *
 * The advance has to come from the font. The axis font looks monospace from its
 * family list, but createNativeSkiaAxisFont only reaches that list as a fallback
 * and normally returns the proportional system font - and the character width
 * beside it is a digit's ink bounds, not an advance. Stepping by that constant
 * gives a comma a whole digit cell and loosens every label around punctuation.
 *
 * Resolving here is what keeps the worklet free of Skia text calls, which is
 * what makes one node per axis affordable.
 */
export function createNativeAxisGlyphMetrics(
  font: SkFont | null | undefined,
  characters: string,
): Record<string, NativeAxisGlyphMetric> {
  const metrics: Record<string, NativeAxisGlyphMetric> = {};
  if (!font) return metrics;

  const ids = font.getGlyphIDs(characters);
  const widths = font.getGlyphWidths(ids);
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    const id = ids[index];
    if (character === undefined || id === undefined) continue;
    metrics[character] = { advance: widths[index] ?? 0, id };
  }
  return metrics;
}

/**
 * Appends one label, advancing per glyph exactly as drawing the string would.
 * `x` is the aligned left edge the per-tick text nodes were positioned at, and
 * `y` its baseline.
 */
export function appendNativeAxisLabelGlyphs({
  glyphMetrics,
  out,
  text,
  x,
  y,
}: {
  glyphMetrics: Record<string, NativeAxisGlyphMetric>;
  out: NativeAxisGlyph[];
  text: string;
  x: number;
  y: number;
}): void {
  'worklet';
  let cursor = x;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === undefined) continue;
    const metric = glyphMetrics[character];
    if (metric === undefined) continue;
    out.push({ id: metric.id, pos: { x: cursor, y } });
    cursor += metric.advance;
  }
}
