import { describe, expect, it } from 'vitest';

import { appendNativeAxisLabelGlyphs, createNativeAxisGlyphMetrics, type NativeAxisGlyph } from './nativeAxisLabelGlyphs';

// Digits advance 7, everything else 3 - the asymmetry is the point.
const font = {
  getGlyphIDs: (text: string) => Array.from(text, (character) => character.codePointAt(0) ?? 0),
  getGlyphWidths: (ids: number[]) => ids.map((id) => (id >= 48 && id <= 57 ? 7 : 3)),
} as never;

function layout(text: string, characters = '0123456789,.-:+ '): NativeAxisGlyph[] {
  const out: NativeAxisGlyph[] = [];
  appendNativeAxisLabelGlyphs({
    glyphMetrics: createNativeAxisGlyphMetrics(font, characters),
    out,
    text,
    x: 100,
    y: 50,
  });
  return out;
}

describe('native axis label glyphs', () => {
  it('resolves an id and an advance for every character in the alphabet', () => {
    const metrics = createNativeAxisGlyphMetrics(font, '0,');

    expect(metrics['0']).toEqual({ id: 48, advance: 7 });
    expect(metrics[',']).toEqual({ id: 44, advance: 3 });
  });

  it('returns nothing without a font rather than throwing', () => {
    expect(createNativeAxisGlyphMetrics(null, '0123')).toEqual({});
  });

  // The bug this replaced: stepping by one constant character width gave a comma
  // a whole digit cell, so every label loosened around its punctuation. The axis
  // font only looks monospace - it resolves to the proportional system font.
  it('advances per glyph rather than by a fixed cell', () => {
    const glyphs = layout('1,2');

    expect(glyphs.map((glyph) => glyph.pos.x)).toEqual([100, 107, 110]);
    expect(glyphs.every((glyph) => glyph.pos.y === 50)).toBe(true);
  });

  it('round-trips ids back to the text it laid out', () => {
    const glyphs = layout('63,777');

    expect(String.fromCodePoint(...glyphs.map((glyph) => glyph.id))).toBe('63,777');
  });

  // A character outside the alphabet is dropped, which would silently truncate a
  // label. The formatters only emit digits, comma, dot and minus today; this
  // pins the behaviour so a new format character shows up as a failure here.
  it('drops characters the alphabet does not cover', () => {
    const glyphs = layout('1e9');

    expect(String.fromCodePoint(...glyphs.map((glyph) => glyph.id))).toBe('19');
    expect(glyphs.map((glyph) => glyph.pos.x)).toEqual([100, 107]);
  });
});
