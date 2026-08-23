import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';
import type {
  NativeBracketPriceLineRef,
  NativeRenderablePriceLine,
} from './nativeBracketPriceLines';
import type { NativeSelectedTradeLine, NativeTradeLineObjectType } from './tradeLineLayout';

import { getNativeOrderObjectId, getNativePositionObjectId } from './tradeLineLayout';

export const DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT = 22;
export const NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY = 90;
export const NATIVE_SELECTED_TRADE_LINE_AXIS_TAG_PRIORITY = 95;

export interface NativePriceAxisTagSource {
  sourceType: 'priceLine' | NativeTradeLineObjectType;
  tagId: string;
  objectId: string;
  price: number;
  height: number;
  clampToPane?: boolean;
  priority?: number;
  fixed?: boolean;
  bracketRef?: NativeBracketPriceLineRef;
}

export interface NativePriceAxisTagSourcesInput {
  extraPriceLines: readonly PriceLine[];
  bracketPriceLines: readonly NativeRenderablePriceLine[];
  lastTradeLine?: PriceLine | null;
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  priceLineTagHeight?: number;
  selectedTradeLine?: NativeSelectedTradeLine | null;
  tradeLineTagHeight: number;
}

export function getNativePriceLineTagId(lineId: string): string {
  'worklet';
  return `priceLine:${lineId}`;
}

export function getNativeTradeLineTagId(objectType: NativeTradeLineObjectType, objectId: string): string {
  'worklet';
  return `${objectType}:${objectId}`;
}

export function getNativeBracketDragTagId(objectId: string, bracketType: string): string {
  'worklet';
  return `bracketDrag:${objectId}:${bracketType}`;
}

export function getNativePriceLineTagHeight(
  line: PriceLine,
  priceLineTagHeight = DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT,
): number {
  return line.countdownToTime !== undefined || line.label.secondaryText ? 34 : priceLineTagHeight;
}

function createNativePriceLineTagSource(
  line: NativeRenderablePriceLine,
  priceLineTagHeight: number,
  options?: { fixed?: boolean },
): NativePriceAxisTagSource {
  return {
    sourceType: 'priceLine',
    tagId: getNativePriceLineTagId(line.id),
    objectId: line.id,
    price: line.price,
    height: getNativePriceLineTagHeight(line, priceLineTagHeight),
    ...(line.showAxisTag === true ? { clampToPane: true } : {}),
    priority: line.priority,
    ...(options?.fixed === true ? { fixed: true } : {}),
    bracketRef: line.nativeBracketRef,
  };
}

function hasNativePriceLineAxisTag(line: PriceLine): boolean {
  return line.showAxisTag === true || !line.renderLineOnCanvas;
}

export function createNativePriceAxisTagSources(input: NativePriceAxisTagSourcesInput): NativePriceAxisTagSource[] {
  const priceLineTagHeight = input.priceLineTagHeight ?? DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT;
  const priceLineSources = [
    ...input.extraPriceLines.filter(hasNativePriceLineAxisTag).map((line) => createNativePriceLineTagSource(line, priceLineTagHeight)),
    ...input.bracketPriceLines.filter(hasNativePriceLineAxisTag).map((line) => createNativePriceLineTagSource(line, priceLineTagHeight)),
    ...(input.lastTradeLine && hasNativePriceLineAxisTag(input.lastTradeLine)
      ? [createNativePriceLineTagSource(input.lastTradeLine, priceLineTagHeight, { fixed: true })]
      : []),
  ];
  const orderLineSources = input.orderLines.map((line) => {
    const objectId = getNativeOrderObjectId(line);
    const selected = input.selectedTradeLine?.objectType === 'order' && input.selectedTradeLine.objectId === objectId;
    return {
      sourceType: 'order' as const,
      tagId: getNativeTradeLineTagId('order', objectId),
      objectId,
      price: line.price,
      height: input.tradeLineTagHeight,
      priority: selected ? NATIVE_SELECTED_TRADE_LINE_AXIS_TAG_PRIORITY : NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY,
    };
  });
  const positionLineSources = input.positionLines.map((line) => {
    const objectId = getNativePositionObjectId(line);
    const selected = input.selectedTradeLine?.objectType === 'position' && input.selectedTradeLine.objectId === objectId;
    return {
      sourceType: 'position' as const,
      tagId: getNativeTradeLineTagId('position', objectId),
      objectId,
      price: line.price,
      height: input.tradeLineTagHeight,
      priority: selected ? NATIVE_SELECTED_TRADE_LINE_AXIS_TAG_PRIORITY : NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY,
    };
  });

  return [...priceLineSources, ...orderLineSources, ...positionLineSources];
}
