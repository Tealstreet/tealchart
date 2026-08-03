import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { Skia } from '@shopify/react-native-skia';

import { NativePriceGridLayer } from './NativePriceGridLayer';
import { NativeTimeGridLayer } from './NativeTimeGridLayer';

export function NativeChartPrimitiveLayer({
  axisFont,
  frame,
  gridColor,
  showAxisLabels = true,
  showGridLines = true,
  staticProjection,
  pricePrecision,
  sharedViewport,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  gridColor: string;
  showAxisLabels?: boolean;
  showGridLines?: boolean;
  staticProjection?: NativeChartProjection | null;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  textColor: string;
}) {
  if (!showAxisLabels && !showGridLines) return null;

  return (
    <>
      <NativePriceGridLayer
        axisFont={axisFont}
        frame={frame}
        gridColor={gridColor}
        showAxisLabels={showAxisLabels}
        showGridLines={showGridLines}
        staticProjection={staticProjection}
        pricePrecision={pricePrecision}
        sharedViewport={sharedViewport}
        textColor={textColor}
      />

      <NativeTimeGridLayer
        axisFont={axisFont}
        frame={frame}
        gridColor={gridColor}
        showAxisLabels={showAxisLabels}
        showGridLines={showGridLines}
        staticProjection={staticProjection}
        sharedViewport={sharedViewport}
        textColor={textColor}
      />
    </>
  );
}
