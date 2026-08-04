import { describe, expect, it } from 'vitest';
import { matchFont } from '@shopify/react-native-skia';

import {
  NativePriceAxisTagAnimatedText,
  NativePriceAxisTagStaticText,
} from './NativePriceAxisTag';
import {
  NativeAnimatedMonospaceText,
  NativeAnimatedSkiaText,
} from './nativeSkiaText';

describe('NativePriceAxisTag', () => {
  it('renders static price-axis label text through the direct Skia text surface', () => {
    const font = matchFont({ fontSize: 11 });
    const text = NativePriceAxisTagStaticText({
      x: 320,
      y: 128,
      text: '63,777.0',
      font,
      color: '#18aee8',
    });

    expect(text.type).toBe(NativeAnimatedSkiaText);
    expect(text.props).toMatchObject({
      x: 320,
      y: 128,
      text: '63,777.0',
      font,
      color: '#18aee8',
    });
  });

  it('renders animated price-axis label text through fixed monospace slots', () => {
    const font = matchFont({ fontSize: 11 });
    const animatedText = { value: '05:36' };
    const text = NativePriceAxisTagAnimatedText({
      x: 320,
      y: 142,
      text: animatedText,
      maxCharacters: 5,
      characterWidth: 7,
      font,
      color: '#18aee8',
    });

    expect(text.type).toBe(NativeAnimatedMonospaceText);
    expect(text.props).toMatchObject({
      x: 320,
      y: 142,
      text: animatedText,
      maxCharacters: 5,
      characterWidth: 7,
      font,
      color: '#18aee8',
    });
  });
});
