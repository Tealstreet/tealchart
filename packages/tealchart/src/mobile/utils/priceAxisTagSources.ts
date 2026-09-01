import type { PlotOutput } from '@tealstreet/tealscript';
import type { IndicatorOutputPane, IndicatorOutputPaneInfo } from '../../rendering/indicatorOutputAxisLabels';
import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';
import type {
  NativeBracketPriceLineRef,
  NativeRenderablePriceLine,
} from './nativeBracketPriceLines';
import type { NativeSelectedTradeLine, NativeTradeLineObjectType } from './tradeLineLayout';

import { getIndicatorOutputAxisLabelSources } from '../../rendering/indicatorOutputAxisLabels';
import { NATIVE_PRICE_AXIS_TAG_SIZING, NATIVE_PRICE_AXIS_TAG_TWO_LINE_HEIGHT } from '../../utils/priceAxisTagSizing';
import { getNativeOrderObjectId, getNativePositionObjectId } from './tradeLineLayout';

export const DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT = NATIVE_PRICE_AXIS_TAG_SIZING.other.height;
export const DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT = NATIVE_PRICE_AXIS_TAG_TWO_LINE_HEIGHT;
export const NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY = 90;
export const NATIVE_SELECTED_TRADE_LINE_AXIS_TAG_PRIORITY = 95;

export interface NativePriceAxisTagSource {
  sourceType: 'priceLine' | 'indicatorOutput' | NativeTradeLineObjectType;
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

export interface NativeIndicatorOutputTagSourcesInput {
  indicatorPaneInfo?: Readonly<Record<string, IndicatorOutputPaneInfo>>;
  panes: readonly IndicatorOutputPane[];
  plots?: readonly PlotOutput[];
  totalBarCount?: number;
  tagHeight?: number;
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
  return line.countdownToTime !== undefined || line.label.secondaryText
    ? DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT
    : priceLineTagHeight;
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
    ...(line.nativeBracketRef ? { bracketRef: line.nativeBracketRef } : {}),
  };
}

function hasNativePriceLineAxisTag(line: PriceLine): boolean {
  return line.showAxisTag === true || !line.renderLineOnCanvas;
}

/**
 * Main-pane indicator readouts, as ordinary stack sources.
 *
 * On the main pane an indicator's value IS a price - `resolveNativePaneValueRange`
 * hands that pane the viewport's range - so these need no projection of their
 * own and can de-overlap against orders, positions and the last-trade tag in the
 * one stack. That is what web has done since `0f25f98a`; native kept them in a
 * second stack that never saw the first, and the two only started colliding once
 * overlay indicators began producing main-pane labels.
 *
 * Indicator panes are deliberately not included: nothing but outputs is ever
 * drawn in them, and they keep their own denser outputs-only pass.
 */
export function createNativeIndicatorOutputTagSources({
  indicatorPaneInfo,
  panes,
  plots,
  totalBarCount,
  tagHeight = NATIVE_PRICE_AXIS_TAG_SIZING.indicatorOutput.height,
}: NativeIndicatorOutputTagSourcesInput): NativePriceAxisTagSource[] {
  const mainPaneId = panes.find((pane) => pane.type === 'main')?.id;
  if (mainPaneId === undefined) return [];

  const sources: NativePriceAxisTagSource[] = [];
  for (const source of getIndicatorOutputAxisLabelSources({ indicatorPaneInfo, panes, plots, totalBarCount })) {
    if (source.paneId !== mainPaneId) continue;
    sources.push({
      sourceType: 'indicatorOutput',
      tagId: source.id,
      objectId: source.id,
      price: source.value,
      height: tagHeight,
    });
  }

  return sources;
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
