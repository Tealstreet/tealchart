import { Platform } from 'react-native';
import {
  matchFont,
  Skia,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export interface NativeSkiaTextProps {
  x: number;
  y: number;
  text: string;
  font: ReturnType<typeof Skia.Font>;
  color: string;
}

export interface NativeAnimatedSkiaTextProps {
  x: number | SharedValue<number>;
  y: number | SharedValue<number>;
  text: string | SharedValue<string>;
  font: ReturnType<typeof Skia.Font>;
  color: string;
}

export interface NativeAnimatedMonospaceTextProps {
  x: number | SharedValue<number>;
  y: number | SharedValue<number>;
  text: string | SharedValue<string>;
  maxCharacters: number;
  characterWidth: number;
  font: ReturnType<typeof Skia.Font>;
  color: string;
  characterSet?: string;
}

const SKIA_TEXT_PROBE = '0123456789BTCUSDTP SL+-.,:%$x Xƒ↶↷⇄×✓';
export const NATIVE_ANIMATED_TEXT_CHARACTERS = '0123456789,.-:+ ';
export const NATIVE_ANIMATED_LABEL_TEXT_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.-:+$%() /_@&=!?<>[]{}#*|\\\'"`~^×✓↔↕←→↑↓';
const SKIA_FONT_FAMILIES =
  Platform.OS === 'ios'
    ? ['Helvetica Neue', 'Helvetica', 'Arial', 'System']
    : Platform.OS === 'android'
      ? ['sans-serif', 'Roboto', 'System']
      : ['Arial', 'Helvetica', 'System', 'sans-serif'];
const SKIA_AXIS_FONT_FAMILIES =
  Platform.OS === 'ios'
    ? ['Menlo', 'SF Mono', 'Courier New']
    : Platform.OS === 'android'
      ? ['monospace', 'Roboto Mono']
      : ['Menlo', 'Courier New', 'monospace'];

function hasNativeSkiaGlyphCoverage(font: ReturnType<typeof Skia.Font>): boolean {
  return measureNativeSkiaTextWidth(font, SKIA_TEXT_PROBE) > 0;
}

export function measureNativeSkiaTextWidth(font: ReturnType<typeof Skia.Font>, text: string): number {
  return Math.ceil(font.measureText(text).width);
}

export function measureNativeSkiaAxisCharacterWidth(font: ReturnType<typeof Skia.Font>): number {
  return Math.max(
    1,
    measureNativeSkiaTextWidth(font, '0'),
    measureNativeSkiaTextWidth(font, '1'),
    measureNativeSkiaTextWidth(font, ','),
    measureNativeSkiaTextWidth(font, '.'),
  );
}

export function createNativeSkiaFont(size: number, fontFamilies: readonly string[] = SKIA_FONT_FAMILIES) {
  const defaultFont = matchFont({ fontSize: size });
  if (hasNativeSkiaGlyphCoverage(defaultFont)) return defaultFont;

  for (const fontFamily of fontFamilies) {
    const font = matchFont({ fontFamily, fontSize: size });
    if (hasNativeSkiaGlyphCoverage(font)) return font;
  }
  return defaultFont;
}

export function createNativeSkiaAxisFont(size: number) {
  const defaultFont = matchFont({ fontSize: size });
  if (hasNativeSkiaGlyphCoverage(defaultFont)) return defaultFont;

  for (const fontFamily of SKIA_AXIS_FONT_FAMILIES) {
    const font = matchFont({ fontFamily, fontSize: size });
    if (hasNativeSkiaGlyphCoverage(font)) return font;
  }
  return defaultFont;
}

export function fitNativeSkiaTextToWidth(font: ReturnType<typeof Skia.Font>, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (measureNativeSkiaTextWidth(font, text) <= maxWidth) return text;

  const suffix = '...';
  const suffixWidth = measureNativeSkiaTextWidth(font, suffix);
  if (suffixWidth > maxWidth) return '';

  let end = text.length;
  while (end > 0 && measureNativeSkiaTextWidth(font, `${text.slice(0, end)}${suffix}`) > maxWidth) {
    end -= 1;
  }

  return end > 0 ? `${text.slice(0, end)}${suffix}` : suffix;
}

export function NativeSkiaText({ x, y, text, font, color }: NativeSkiaTextProps) {
  return <SkiaText x={x} y={y} text={text} font={font} color={color} />;
}

export function NativeAnimatedSkiaText({ x, y, text, font, color }: NativeAnimatedSkiaTextProps) {
  return <SkiaText x={x} y={y} text={text} font={font} color={color} />;
}

export function NativeAnimatedMonospaceText({
  characterSet,
  characterWidth,
  maxCharacters,
  ...textProps
}: NativeAnimatedMonospaceTextProps) {
  void characterSet;
  void characterWidth;
  void maxCharacters;

  return <NativeAnimatedSkiaText {...textProps} />;
}
