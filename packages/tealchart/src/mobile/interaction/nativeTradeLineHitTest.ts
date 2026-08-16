import type {
  NativeBracketDragSharedValues,
  NativeOrderDragSharedValues,
  NativeTradeLineBracketType,
} from './nativeOemsDragState';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativePriceAxisTagCollisionSource } from '../utils/priceAxisTagLayout';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionType,
  NativeTradeLineActionZone,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import { resolveNativePriceAxisTagStack } from '../utils/priceAxisTagLayout';
import { isNativeBracketPriceLineRefActive } from '../utils/nativeBracketPriceLines';
import { getNativeBracketDragTagId } from '../utils/priceAxisTagSources';
import {
  getNativePriceAxisTagFloor,
  isNativeYInMainPane,
  sharedPriceToNativeY,
} from '../render/nativeSharedViewport';

export const NATIVE_TRADE_LABEL_HIT_SLOP = 8;

export function sharedPriceToNativeLineY(price: number, sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame): number {
  'worklet';
  return sharedPriceToNativeY(price, sharedViewport, frame);
}

export function getNativePriceAxisSourcePrice(
  source: NativePriceAxisTagSource,
  orderDragState: NativeOrderDragSharedValues,
): number {
  'worklet';
  if (source.sourceType === 'order' && orderDragState.activeObjectId.value === source.objectId) {
    return orderDragState.activePrice.value;
  }
  return source.price;
}

/**
 * A dragged line's tag leaves the de-overlap stack.
 *
 * While it was in, it was displaced by its neighbours and shoved them back, and
 * the whole stack re-resolved every frame of the drag - so dragging one order
 * made every other tag on the axis jitter. Out of the stack it pins to the drag
 * price and draws above, which is how the crosshair tag has always behaved.
 */
export function isNativePriceAxisTagSourceSuppressedByOrderDrag(
  source: NativePriceAxisTagSource,
  orderDragState: NativeOrderDragSharedValues,
): boolean {
  'worklet';
  return source.sourceType === 'order' && orderDragState.activeObjectId.value === source.objectId;
}

export function isNativePriceAxisTagSourceSuppressedByBracketDrag(
  source: NativePriceAxisTagSource,
  bracketDragState: NativeBracketDragSharedValues,
): boolean {
  'worklet';
  return isNativeBracketPriceLineRefActive(source.bracketRef, bracketDragState);
}

export function getNativePriceAxisSourceCenterY({
  source,
  sharedViewport,
  frame,
  orderDragState,
}: {
  source: NativePriceAxisTagSource;
  sharedViewport: NativeViewportSharedValues;
  frame: NativeChartFrame;
  orderDragState: NativeOrderDragSharedValues;
}): number {
  'worklet';
  return sharedPriceToNativeLineY(getNativePriceAxisSourcePrice(source, orderDragState), sharedViewport, frame);
}

function clampNativePriceAxisSourceY(source: NativePriceAxisTagSource, y: number, frame: NativeChartFrame): number {
  'worklet';
  if (!source.clampToPane) return y;
  return Math.min(Math.max(y, frame.mainPane.top), frame.mainPane.bottom);
}

export function resolveNativePriceAxisTagCenters({
  priceAxisTagSources,
  sharedViewport,
  frame,
  orderDragState,
  bracketDragState,
  priceAxisTagHeight,
}: {
  priceAxisTagSources: readonly NativePriceAxisTagSource[];
  sharedViewport: NativeViewportSharedValues;
  frame: NativeChartFrame;
  orderDragState: NativeOrderDragSharedValues;
  bracketDragState: NativeBracketDragSharedValues;
  priceAxisTagHeight: number;
}) {
  'worklet';
  const sources: NativePriceAxisTagCollisionSource[] = [];

  for (let index = 0; index < priceAxisTagSources.length; index += 1) {
    const source = priceAxisTagSources[index];
    if (isNativePriceAxisTagSourceSuppressedByBracketDrag(source, bracketDragState)) continue;
    if (isNativePriceAxisTagSourceSuppressedByOrderDrag(source, orderDragState)) continue;
    const priceY = sharedPriceToNativeLineY(getNativePriceAxisSourcePrice(source, orderDragState), sharedViewport, frame);
    if (!source.clampToPane && !isNativeYInMainPane(priceY, frame)) continue;
    sources.push({
      id: source.tagId,
      originalY: clampNativePriceAxisSourceY(
        source,
        getNativePriceAxisSourceCenterY({
          source,
          sharedViewport,
          frame,
          orderDragState,
        }),
        frame,
      ),
      height: source.height,
      priority: source.priority,
      fixed: source.fixed,
    });
  }

  return resolveNativePriceAxisTagStack(sources, frame.mainPane.top, getNativePriceAxisTagFloor(frame));
}

export function findNativeOrderDragZoneIndex({
  zones,
  x,
  y,
  sharedViewport,
  frame,
  tradeLabelHeight,
}: {
  zones: readonly NativeOrderDragZone[];
  rows: readonly NativeTradeLineRow[];
  x: number;
  y: number;
  sharedViewport: NativeViewportSharedValues;
  frame: NativeChartFrame;
  tradeLabelHeight: number;
}): number {
  'worklet';
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    const zone = zones[index];
    const priceY = sharedPriceToNativeLineY(zone.price, sharedViewport, frame);
    if (!isNativeYInMainPane(priceY, frame)) continue;
    const zoneTop = priceY - tradeLabelHeight / 2;
    if (x >= zone.x1 && x <= zone.x2 && y >= zoneTop - NATIVE_TRADE_LABEL_HIT_SLOP && y <= zoneTop + tradeLabelHeight + NATIVE_TRADE_LABEL_HIT_SLOP) {
      return index;
    }
  }
  return -1;
}

export function findNativeOrderDragZone(args: Parameters<typeof findNativeOrderDragZoneIndex>[0]): NativeOrderDragZone | null {
  'worklet';
  const index = findNativeOrderDragZoneIndex(args);
  return index >= 0 ? args.zones[index] : null;
}

export function findNativeTradeLineActionZoneIndex({
  zones,
  x,
  y,
  sharedViewport,
  frame,
  tradeLabelHeight,
}: {
  zones: readonly NativeTradeLineActionZone[];
  rows: readonly NativeTradeLineRow[];
  x: number;
  y: number;
  sharedViewport: NativeViewportSharedValues;
  frame: NativeChartFrame;
  tradeLabelHeight: number;
}): number {
  'worklet';
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    const zone = zones[index];
    const priceY = sharedPriceToNativeLineY(zone.price, sharedViewport, frame);
    if (!isNativeYInMainPane(priceY, frame)) continue;
    const zoneTop = priceY - tradeLabelHeight / 2;
    if (x >= zone.x1 && x <= zone.x2 && y >= zoneTop - NATIVE_TRADE_LABEL_HIT_SLOP && y <= zoneTop + tradeLabelHeight + NATIVE_TRADE_LABEL_HIT_SLOP) {
      return index;
    }
  }
  return -1;
}

export function findNativeTradeLineActionZone(
  args: Parameters<typeof findNativeTradeLineActionZoneIndex>[0],
): NativeTradeLineActionZone | null {
  'worklet';
  const index = findNativeTradeLineActionZoneIndex(args);
  return index >= 0 ? args.zones[index] : null;
}

export function isNativeBracketActionType(actionType: NativeTradeLineActionType): actionType is NativeTradeLineBracketType {
  'worklet';
  return actionType === 'tp' || actionType === 'sl';
}

export function findNativeBracketDragZoneIndex(args: Parameters<typeof findNativeTradeLineActionZoneIndex>[0]): number {
  'worklet';
  const { zones, x, y, sharedViewport, frame, tradeLabelHeight } = args;
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    const zone = zones[index];
    if (!isNativeBracketActionType(zone.actionType)) continue;
    const priceY = sharedPriceToNativeLineY(zone.price, sharedViewport, frame);
    if (!isNativeYInMainPane(priceY, frame)) continue;
    const zoneTop = priceY - tradeLabelHeight / 2;
    if (x >= zone.x1 && x <= zone.x2 && y >= zoneTop - NATIVE_TRADE_LABEL_HIT_SLOP && y <= zoneTop + tradeLabelHeight + NATIVE_TRADE_LABEL_HIT_SLOP) {
      return index;
    }
  }
  return -1;
}

export function findNativeBracketDragZone(args: Parameters<typeof findNativeBracketDragZoneIndex>[0]): NativeTradeLineActionZone | null {
  'worklet';
  const index = findNativeBracketDragZoneIndex(args);
  return index >= 0 ? args.zones[index] : null;
}

export function canBeginNativeChartPan({
  actionZones,
  orderDragZones,
  rows,
  x,
  y,
  sharedViewport,
  frame,
  tradeLabelHeight,
}: {
  actionZones: readonly NativeTradeLineActionZone[];
  orderDragZones: readonly NativeOrderDragZone[];
  rows: readonly NativeTradeLineRow[];
  x: number;
  y: number;
  sharedViewport: NativeViewportSharedValues;
  frame: NativeChartFrame;
  tradeLabelHeight: number;
}): boolean {
  'worklet';
  if (
    findNativeTradeLineActionZone({
      zones: actionZones,
      rows,
      x,
      y,
      sharedViewport,
      frame,
      tradeLabelHeight,
    })
  ) {
    return false;
  }

  if (
    findNativeOrderDragZone({
      zones: orderDragZones,
      rows,
      x,
      y,
      sharedViewport,
      frame,
      tradeLabelHeight,
    })
  ) {
    return false;
  }

  // Any pane, not just the main one. Bounding this to mainPane meant a drag
  // starting inside an indicator pane began no gesture at all, so those panes
  // could not be panned or scrolled through time.
  return (
    x >= frame.contentLeft &&
    x < frame.priceAxisHitLeft &&
    frame.panes.some((pane) => y >= pane.top && y <= pane.bottom)
  );
}
