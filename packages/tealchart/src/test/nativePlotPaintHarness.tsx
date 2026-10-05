import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneRangeOverrides } from '../mobile/render/nativePaneRangeOverride';
import type { NativeViewportSharedValues } from '../mobile/render/nativeSharedViewport';

import { Fragment } from 'react';

import { DashPathEffect, Group, LinearGradient, Path, Picture, Rect, Skia, Text } from '@shopify/react-native-skia';

import { createNativeChartFrameFromPanes } from '../mobile/render/nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from '../mobile/render/NativeIndicatorPlotLayer';
import { createNativeChartProjection } from '../mobile/render/nativeProjection';
import { nativePictureRects } from './nativePictureRects';

export const testFrame = createNativeChartFrameFromPanes({
  dimensions: { width: 400, height: 420, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
  panes: [
    { id: 'main', type: 'main', top: 0, height: 200, yMin: 0, yMax: 100 },
    { id: 'study', type: 'indicator', top: 200, height: 200, yMin: 0, yMax: 100 },
  ],
});
export const testBars = Array.from({ length: 5 }, (_, sourceIndex) => ({
  sourceIndex,
  time: sourceIndex * 1000,
  interval: 1000,
  x: sourceIndex * 100,
  open: 10,
  close: 15,
  high: 20,
  low: 5,
  volume: 100,
}));
export function testPlot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return { type: 'plot', id: 'p', title: 'P', values: [10, 20, 30, 40, 50], color: '#12345680', ...overrides };
}
export function resolved<T>(value: T | { value: T }): T {
  return value && typeof value === 'object' && 'value' in value ? value.value : (value as T);
}
export interface NativePaintPrimitive {
  type: unknown;
  props: Record<string, any>;
  opacity: number;
}
export function nativePrimitives(node: ReactNode, inheritedOpacity = 1): NativePaintPrimitive[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap((child) => nativePrimitives(child, inheritedOpacity));
  if (typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Record<string, any>>;
  if (element.type === Fragment) return nativePrimitives(element.props.children, inheritedOpacity);
  const opacity = inheritedOpacity * Number(resolved(element.props.opacity ?? 1));
  if (opacity === 0) return [];
  if (element.type === Picture)
    return [
      { type: Picture, props: element.props, opacity },
      ...nativePictureRects(element.props.picture).map((rect) => ({ type: Rect, props: rect, opacity })),
    ];
  if ([Group, Rect, Text, Path, DashPathEffect, LinearGradient].includes(element.type as never)) {
    return [
      { type: element.type, props: element.props, opacity },
      ...nativePrimitives(element.props.children, opacity),
    ];
  }
  return typeof element.type === 'function'
    ? nativePrimitives((element.type as (props: unknown) => ReactNode)(element.props), opacity)
    : [];
}
export function nativePlotHarness(plots: PlotOutput[], staticMode = false, visibleBars = testBars, frame = testFrame) {
  const sharedViewport = {
    startTime: { value: 0 },
    endTime: { value: 4000 },
    priceMin: { value: 0 },
    priceMax: { value: 100 },
  } as unknown as NativeViewportSharedValues;
  const paneRangeOverrides = { value: {} } as unknown as SharedValue<NativePaneRangeOverrides>;
  const render = () =>
    NativeIndicatorPlotLayerImpl({
      frame,
      bars: testBars,
      plots,
      visibleBars,
      totalBarCount: 5,
      indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } },
      sharedViewport,
      paneRangeOverrides,
      staticProjection: staticMode
        ? createNativeChartProjection({
            frame,
            viewport: { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 },
          })
        : undefined,
      textFont: Skia.Font(undefined, 12),
    });
  const primitives = () => nativePrimitives(render());
  const paths = () =>
    primitives()
      .filter((primitive) => primitive.type === Path)
      .map((primitive) => ({ ...primitive, path: resolved<any>(primitive.props.path) }));
  return { primitives, paths, sharedViewport, paneRangeOverrides };
}
