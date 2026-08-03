import type { SharedValue } from 'react-native-reanimated';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { Group, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { NativeAnimatedSkiaText } from './nativeSkiaText';
import { NativeStaticTradeLineBox } from './NativeTradeLineBox';
import { NativeTradeLineButtonIcon } from './NativeTradeLineButtonIcon';

export function NativeTradeLineLabelBody({
  geometry,
  labelY,
  smallFont,
  textFont,
  tradeLabelHeight,
}: {
  geometry: NativeTradeLineGeometry;
  labelY: SharedValue<number>;
  smallFont: ReturnType<typeof Skia.Font>;
  textFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
}) {
  const transform = useDerivedValue(() => [{ translateY: labelY.value }], [labelY]);

  return (
    <Group transform={transform}>
      {renderNativeTradeLineLabelBodyContent({ geometry, smallFont, textFont, tradeLabelHeight })}
    </Group>
  );
}

export function NativeStaticTradeLineLabelBody({
  geometry,
  labelY,
  smallFont,
  textFont,
  tradeLabelHeight,
}: {
  geometry: NativeTradeLineGeometry;
  labelY: number;
  smallFont: ReturnType<typeof Skia.Font>;
  textFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
}) {
  return (
    <Group transform={[{ translateY: labelY }]}>
      {renderNativeTradeLineLabelBodyContent({ geometry, smallFont, textFont, tradeLabelHeight })}
    </Group>
  );
}

function renderNativeTradeLineLabelBodyContent({
  geometry,
  smallFont,
  textFont,
  tradeLabelHeight,
}: {
  geometry: NativeTradeLineGeometry;
  smallFont: ReturnType<typeof Skia.Font>;
  textFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
}) {
  const textY = tradeLabelHeight / 2 + 4;

  return [
    ...geometry.segments.map((segment, index) => (
      <Group key={`${geometry.objectId}-segment-${index}`}>
        <NativeStaticTradeLineBox
          x={segment.x}
          y={0}
          width={segment.width}
          height={tradeLabelHeight}
          backgroundColor={segment.backgroundColor}
          borderColor={segment.borderColor}
          corners={segment.corners}
        />
        <NativeAnimatedSkiaText
          x={segment.textX}
          y={textY}
          text={segment.displayText}
          font={textFont}
          color={segment.textColor}
        />
      </Group>
    )),
    ...geometry.buttons.map((button, index) => (
      <Group key={`${geometry.objectId}-button-${button.type}-${index}`}>
        <NativeStaticTradeLineBox
          x={button.x}
          y={0}
          width={button.width}
          height={tradeLabelHeight}
          backgroundColor={button.backgroundColor}
          borderColor={button.borderColor}
          corners={button.corners}
        />
        {button.type === 'tp' || button.type === 'sl' ? (
          <NativeAnimatedSkiaText
            x={button.textX}
            y={textY}
            text={button.displayIcon}
            font={smallFont}
            color={button.iconColor}
          />
        ) : (
          <NativeTradeLineButtonIcon
            button={button}
            font={smallFont}
            color={button.iconColor}
            tradeLabelHeight={tradeLabelHeight}
          />
        )}
      </Group>
    )),
  ];
}
