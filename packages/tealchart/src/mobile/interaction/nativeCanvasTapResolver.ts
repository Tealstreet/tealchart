import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeGestureControlZone } from './nativeGestureControlZones';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionType,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import { isNativeCrosshairContextMenuButtonTap } from './nativeCrosshairContextMenu';
import { isNativeGestureControlPoint } from './nativeGestureControlZones';
import { isNativeResetViewRevealTap } from './nativeResetViewButton';
import { canBeginNativeChartPan, findNativeTradeLineActionZone } from './nativeTradeLineHitTest';

/**
 * The single owner of a canvas tap.
 *
 * Every canvas gesture used to decide for itself whether a tap was its own, and
 * `createNativeChartGesture` says so in its own comment: "Ordering is not
 * ownership. Each broad canvas gesture must reject reserved control zones
 * before it can compete." Under `Gesture.Simultaneous` they all fire, and none
 * of them declines in its recognizer - each accepts every tap and filters
 * inside `onEnd`. The crosshair could not see what the others concluded, so it
 * deferred its toggle a tick and skipped only if somebody called
 * `claimNativeTap`.
 *
 * Claiming was opt-in, which makes leaking the default. Exactly one caller ever
 * claimed, so tapping an order's cancel button toggled the crosshair too. Any
 * tap consumer added later would have done the same.
 *
 * So the point is resolved once, here, and the caller dispatches the single
 * outcome. Crosshair is the else-branch rather than a competitor, and there is
 * nothing left to opt into.
 */

export type NativeCanvasTapOutcome =
  /** Chrome owns the point - a bar, rail or overlay floating above the canvas. */
  | { kind: 'none' }
  | {
      kind: 'tradeLineAction';
      objectType: NativeTradeLineObjectType;
      objectId: string;
      actionType: NativeTradeLineActionType;
    }
  | { kind: 'crosshairContextMenu' }
  /**
   * Drawings hit-test on the JS thread inside their own callback, so their
   * ownership cannot be settled here with the rest. The caller offers the tap
   * to the drawing system and falls through to the crosshair when it declines.
   * A returned outcome rather than an opt-in claim, so it cannot be forgotten.
   */
  | { kind: 'drawingThenCrosshair' }
  | { kind: 'crosshair' };

export interface NativeCanvasTapContext {
  bracketDragActive: boolean;
  controlZones: readonly NativeGestureControlZone[];
  crosshairVisible: boolean;
  crosshairY: number;
  drawingTapEnabled: boolean;
  frame: NativeChartFrame;
  hasContextMenu: boolean;
  orderDragZones: readonly NativeOrderDragZone[];
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: readonly NativeTradeLineActionZone[];
  tradeLineRows: readonly NativeTradeLineRow[];
}

/**
 * Most-specific-first, matching the geometric nesting: an action button sits
 * inside a trade-line row, which sits inside the plot area the crosshair claims.
 */
export function resolveNativeCanvasTap(
  point: { x: number; y: number },
  ctx: NativeCanvasTapContext,
): NativeCanvasTapOutcome {
  'worklet';
  // Chrome first, and it is the only gate that returns `none`: a tap that lands
  // on a bar or rail never belonged to the canvas at all.
  if (isNativeGestureControlPoint(ctx.controlZones, point.x, point.y)) return { kind: 'none' };

  // Mid-bracket-drag the action buttons are not live, matching the gate the
  // trade-line tap applied for itself.
  if (!ctx.bracketDragActive) {
    const zone = findNativeTradeLineActionZone({
      zones: ctx.tradeLineActionZones,
      rows: ctx.tradeLineRows,
      x: point.x,
      y: point.y,
      sharedViewport: ctx.sharedViewport,
      frame: ctx.frame,
      tradeLabelHeight: ctx.tradeLabelHeight,
    });
    if (zone) {
      return {
        kind: 'tradeLineAction',
        objectType: zone.objectType,
        objectId: zone.objectId,
        actionType: zone.actionType,
      };
    }
  }

  // Deliberately geometry-only, like the gesture it replaces: the button floats
  // beside the crosshair and gating it on control zones would suppress
  // legitimate taps near chrome.
  if (
    ctx.hasContextMenu &&
    ctx.crosshairVisible &&
    isNativeCrosshairContextMenuButtonTap({
      frame: ctx.frame,
      crosshairY: ctx.crosshairY,
      pricePrecision: ctx.pricePrecision,
      sharedViewport: ctx.sharedViewport,
      x: point.x,
      y: point.y,
    })
  ) {
    return { kind: 'crosshairContextMenu' };
  }

  // The reveal strip is not a control zone; it is a frame-relative affordance
  // the crosshair has always yielded to.
  if (isNativeResetViewRevealTap(ctx.frame, point.x, point.y)) return { kind: 'none' };

  if (ctx.drawingTapEnabled) return { kind: 'drawingThenCrosshair' };

  // A tap on a trade-line row or order drag zone belongs to that line even when
  // it misses an action button, so the crosshair must not swallow it.
  if (
    !canBeginNativeChartPan({
      actionZones: ctx.tradeLineActionZones,
      orderDragZones: ctx.orderDragZones,
      rows: ctx.tradeLineRows,
      x: point.x,
      y: point.y,
      sharedViewport: ctx.sharedViewport,
      frame: ctx.frame,
      tradeLabelHeight: ctx.tradeLabelHeight,
    })
  ) {
    return { kind: 'none' };
  }

  return { kind: 'crosshair' };
}
