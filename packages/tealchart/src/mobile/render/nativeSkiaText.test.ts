import { describe, expect, it, vi } from 'vitest';
import { Text as SkiaText, matchFont } from '@shopify/react-native-skia';

import {
  NativeAnimatedSkiaText,
  createNativeSkiaAxisFont,
  createNativeSkiaFont,
  NATIVE_ANIMATED_LABEL_TEXT_CHARACTERS,
  NATIVE_ANIMATED_TEXT_CHARACTERS,
  measureNativeSkiaTextWidth,
} from './nativeSkiaText';

const zeroWidthFont = {
  getSize: () => 12,
  getTextWidth: () => 0,
  measureText: () => ({ width: 0, height: 12 }),
  setSize: vi.fn(),
};

function expectCharacterSetToCover(characters: string, text: string): void {
  for (const character of text) {
    expect(characters).toContain(character);
  }
}

describe('native Skia text helpers', () => {
  it('creates a measurable default font for chart text surfaces', () => {
    vi.mocked(matchFont).mockClear();

    const font = createNativeSkiaFont(11);

    expect(matchFont).toHaveBeenCalledWith({ fontSize: 11 });
    expect(matchFont).toHaveBeenCalledTimes(1);
    expect(measureNativeSkiaTextWidth(font, 'BTC-USD Long Buy Limit 63,777.0')).toBeGreaterThan(0);
  });

  it('uses the same measurable default path for animated axis text', () => {
    vi.mocked(matchFont).mockClear();

    const font = createNativeSkiaAxisFont(11);

    expect(matchFont).toHaveBeenCalledWith({ fontSize: 11 });
    expect(matchFont).toHaveBeenCalledTimes(1);
    expect(measureNativeSkiaTextWidth(font, '63,777.0 05:36')).toBeGreaterThan(0);
  });

  it('falls through to configured font families when the default font cannot measure text', () => {
    vi.mocked(matchFont).mockClear();
    vi.mocked(matchFont)
      .mockReturnValueOnce(zeroWidthFont)
      .mockReturnValueOnce(zeroWidthFont)
      .mockReturnValueOnce(zeroWidthFont);

    createNativeSkiaFont(11, ['Missing One', 'Missing Two']);

    expect(matchFont).toHaveBeenNthCalledWith(1, { fontSize: 11 });
    expect(matchFont).toHaveBeenNthCalledWith(2, { fontFamily: 'Missing One', fontSize: 11 });
    expect(matchFont).toHaveBeenNthCalledWith(3, { fontFamily: 'Missing Two', fontSize: 11 });
  });

  it('covers the dynamic price-axis strings rendered through animated glyph slots', () => {
    expectCharacterSetToCover(NATIVE_ANIMATED_TEXT_CHARACTERS, '63,777.0');
    expectCharacterSetToCover(NATIVE_ANIMATED_TEXT_CHARACTERS, '05:36');
    expectCharacterSetToCover(NATIVE_ANIMATED_LABEL_TEXT_CHARACTERS, '+$1.33 (+0.17%)');
    expectCharacterSetToCover(NATIVE_ANIMATED_LABEL_TEXT_CHARACTERS, 'BTC-USD Buy Limit #502309499002');
  });

  it('keeps numeric text coordinates on the direct Skia Text path', () => {
    const font = createNativeSkiaFont(11);
    const element = NativeAnimatedSkiaText({
      x: 12,
      y: 34,
      text: 'Long',
      font,
      color: '#18aee8',
    });

    expect(element.type).toBe(SkiaText);
    expect(element.props).toMatchObject({
      x: 12,
      y: 34,
      text: 'Long',
      font,
      color: '#18aee8',
    });
  });

  it('keeps shared-value text coordinates on the direct Skia Text path', () => {
    const font = createNativeSkiaFont(11);
    const x = { value: 12 };
    const y = { value: 34 };
    const element = NativeAnimatedSkiaText({
      x,
      y,
      text: '63,777.0',
      font,
      color: '#18aee8',
    });

    expect(element.type).toBe(SkiaText);
    expect(element.props).toMatchObject({
      x,
      y,
      text: '63,777.0',
      font,
      color: '#18aee8',
    });
  });
});
