import type { SharedValue } from 'react-native-reanimated';

import {
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';

import {
  NativeAnimatedMonospaceText,
  NativeAnimatedSkiaText,
} from './nativeSkiaText';

type NativeSkiaColor = string | SharedValue<string>;

export interface NativePriceAxisTagBoxProps {
  x: number | SharedValue<number>;
  y: number | SharedValue<number>;
  width: number | SharedValue<number>;
  height: number;
  backgroundColor?: NativeSkiaColor;
  borderColor: NativeSkiaColor;
}

export interface NativePriceAxisTagStaticTextProps {
  x: number | SharedValue<number>;
  y: number | SharedValue<number>;
  text: string;
  font: ReturnType<typeof Skia.Font>;
  color: string;
}

export interface NativePriceAxisTagAnimatedTextProps {
  x: number | SharedValue<number>;
  y: number | SharedValue<number>;
  text: string | SharedValue<string>;
  maxCharacters: number;
  characterWidth: number;
  font: ReturnType<typeof Skia.Font>;
  color: string;
  characterSet?: string;
}

export function NativePriceAxisTagBox({
  backgroundColor,
  borderColor,
  height,
  width,
  x,
  y,
}: NativePriceAxisTagBoxProps) {
  return (
    <>
      {backgroundColor ? <RoundedRect x={x} y={y} width={width} height={height} r={2} color={backgroundColor} /> : null}
      <RoundedRect x={x} y={y} width={width} height={height} r={2} color={borderColor} style="stroke" strokeWidth={1} />
    </>
  );
}

export function NativePriceAxisTagStaticText({
  color,
  font,
  text,
  x,
  y,
}: NativePriceAxisTagStaticTextProps) {
  return <NativeAnimatedSkiaText x={x} y={y} text={text} font={font} color={color} />;
}

export function NativePriceAxisTagAnimatedText({
  characterSet,
  characterWidth,
  color,
  font,
  maxCharacters,
  text,
  x,
  y,
}: NativePriceAxisTagAnimatedTextProps) {
  return (
    <NativeAnimatedMonospaceText
      x={x}
      y={y}
      text={text}
      maxCharacters={maxCharacters}
      characterWidth={characterWidth}
      font={font}
      color={color}
      characterSet={characterSet}
    />
  );
}
