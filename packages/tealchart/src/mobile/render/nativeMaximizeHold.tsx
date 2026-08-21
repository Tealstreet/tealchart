import type { MutableRefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from './nativeChartFrame';

import { useDerivedValue } from 'react-native-reanimated';

/**
 * Pane geometry alone. The full layout signature folds in yMin/yMax, which
 * autoscale rewrites on every bar tick - a transition gate keyed on that would
 * re-arm all through a live market and never settle.
 */
export function createNativePaneGeometryKey(frame: NativeChartFrame | null): string {
  if (!frame) return '';
  return frame.panes.map((pane) => `${pane.id}:${Math.round(pane.top)}:${Math.round(pane.height)}`).join('|');
}

/** Ceiling on waiting for the echo, in frames, before releasing regardless. */
export const NATIVE_MAXIMIZE_ECHO_FRAME_LIMIT = 4;

export interface NativeMaximizeHoldReleaseInput {
  currentGeometryKey: string;
  framesWaited: number;
  heightsMatch: boolean;
  observedGeometryKey: string;
}

/**
 * The snapshot may only come down once the plot paths hold the new geometry.
 * They take it through a useDerivedValue closure, one Reanimated propagation
 * after the plain props do, so an echo through that same channel is what says it
 * landed - a frame count is only ever a guess at it. The limit is the escape
 * hatch for a layout still in motion, such as a divider drag overlapping the
 * transition, which would otherwise hold the bitmap to the 250ms ceiling.
 */
export function shouldReleaseNativeMaximizeHold({
  currentGeometryKey,
  framesWaited,
  heightsMatch,
  observedGeometryKey,
}: NativeMaximizeHoldReleaseInput): boolean {
  if (!heightsMatch) return false;
  if (observedGeometryKey === currentGeometryKey) return true;
  return framesWaited >= NATIVE_MAXIMIZE_ECHO_FRAME_LIMIT;
}

export interface NativePaneGeometryEchoProps {
  echoRef: MutableRefObject<SharedValue<string> | null>;
  geometryKey: string;
}

/**
 * Renders nothing; it exists to be declared INSIDE the Skia canvas tree.
 *
 * Skia renders `<Canvas>` children through its own react-reconciler root, so an
 * echo declared in the surrounding component restarts its mapper in an earlier
 * scheduler batch than the plot paths do. It coalesces into one `mapperRun` most
 * of the time, which is exactly the kind of coincidence that reports agreement a
 * frame too soon. Declared here it shares the plot layers' root and their batch.
 */
export function NativePaneGeometryEcho({ echoRef, geometryKey }: NativePaneGeometryEchoProps) {
  echoRef.current = useDerivedValue(() => geometryKey, [geometryKey]);
  return null;
}
