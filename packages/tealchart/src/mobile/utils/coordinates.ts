import type { Viewport, ChartMargins } from '../../types';
import {
  createNativeChartFrameFromPanes,
  type NativeChartFrame,
  type NativePaneFrame,
} from '../render/nativeChartFrame';
import {
  mainPaneYToPrice,
  nativeXToTime as nativeXToTimeFromFrame,
  priceToMainPaneY,
  timeToNativeX as timeToNativeXFromFrame,
} from '../render/nativeProjection';

export interface ChartDimensions {
  width: number;
  height: number;
  margins: ChartMargins;
}

export interface PaneInfo {
  id: string;
  type: 'main' | 'indicator';
  top: number;      // pixel Y position of pane top
  height: number;   // pixel height of pane
  yMin: number;     // value range minimum
  yMax: number;     // value range maximum
}

export type { NativeChartFrame, NativePaneFrame };

export function createNativeChartFrame(dimensions: ChartDimensions, mainPane: PaneInfo): NativeChartFrame {
  return createNativeChartFrameFromPanes({
    dimensions,
    panes: [mainPane],
  });
}

export function priceToNativeY(price: number, frame: NativeChartFrame): number {
  return priceToMainPaneY(price, frame);
}

export function nativeYToPrice(y: number, frame: NativeChartFrame): number {
  return mainPaneYToPrice(y, frame);
}

export function timeToNativeX(time: number, viewport: Viewport, frame: NativeChartFrame): number {
  return timeToNativeXFromFrame(time, viewport, frame);
}

export function nativeXToTime(x: number, viewport: Viewport, frame: NativeChartFrame): number {
  return nativeXToTimeFromFrame(x, viewport, frame);
}
