import type { DrawingOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { Bar } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { useMemo } from 'react';

import { createPicture, Picture } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { createNativeDrawingContext } from './nativeDrawingContext';
import { createNativeDrawingFonts } from './nativeDrawingFonts';
import { resolveNativePaneRange } from './nativePaneRangeOverride';
import { paintNativeTealScriptDrawings } from './nativeTealScriptDrawings';

export interface NativeTealScriptDrawingLayerProps {
  drawings: readonly DrawingOutput[];
  bars: readonly Bar[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  sharedViewport: NativeViewportSharedValues;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  staticProjection?: NativeChartProjection | null;
}

export function NativeTealScriptDrawingLayer({
  drawings,
  bars,
  frame,
  indicatorPaneInfo,
  sharedViewport,
  paneRangeOverrides,
  staticProjection,
}: NativeTealScriptDrawingLayerProps) {
  const panes = useMemo(
    () =>
      frame.panes.map((pane) => ({
        ...pane,
        heightRatio: 1,
        fixedRange: false,
        indicatorIds: Object.entries(indicatorPaneInfo)
          .filter(([, info]) => info.paneId === pane.id && !info.overlay)
          .map(([id]) => id),
      })),
    [frame, indicatorPaneInfo],
  );
  // Carry only serializable projection state into the worklet, never its JS methods.
  const fonts = useMemo(() => createNativeDrawingFonts(drawings), [drawings]);
  const staticViewport = staticProjection?.viewport;
  const picture = useDerivedValue(() => {
    'worklet';
    const viewport = staticViewport ?? {
      startTime: sharedViewport.startTime.value,
      endTime: sharedViewport.endTime.value,
      priceMin: sharedViewport.priceMin.value,
      priceMax: sharedViewport.priceMax.value,
    };
    const activePanes = panes.map((pane) => ({
      ...pane,
      ...(pane.type === 'main'
        ? { yMin: viewport.priceMin, yMax: viewport.priceMax }
        : resolveNativePaneRange(pane, paneRangeOverrides?.value)),
    }));
    return createPicture((canvas) => {
      paintNativeTealScriptDrawings({
        ctx: createNativeDrawingContext(canvas, fonts),
        drawings,
        bars,
        viewport,
        panes: activePanes,
        width: frame.dimensions.width,
        margins: frame.dimensions.margins,
      });
    });
  });
  return <Picture picture={picture} />;
}
