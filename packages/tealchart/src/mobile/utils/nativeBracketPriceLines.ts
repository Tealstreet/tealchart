import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeTradeLineObjectType } from './tradeLineLayout';

import { tradingLineToBracketLines } from '../../utils/tradeLineBrackets';
import { formatNativeTradeLinePrice } from './tradeLineLayout';

export interface NativeBracketPriceLineRef {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  bracketType: 'tp' | 'sl';
}

export type NativeRenderablePriceLine = PriceLine & {
  nativeBracketRef?: NativeBracketPriceLineRef;
  nativeAxisTagWidth?: number;
};

export function isNativeBracketPriceLineRefActive(
  bracketRef: NativeBracketPriceLineRef | undefined,
  dragState: NativeBracketDragSharedValues,
): boolean {
  'worklet';
  if (!bracketRef) return false;
  return (
    dragState.activeObjectType.value === bracketRef.objectType &&
    dragState.activeObjectId.value === bracketRef.objectId &&
    dragState.activeBracketType.value === bracketRef.bracketType
  );
}

/**
 * A position's bracket IS one of the orders on the chart, so drawing both is
 * always wrong: while an optimistic bracket is pending the host's own optimistic
 * order row lands at the same price, and the price is drawn twice - once dashed
 * in the bracket colour, once as the order line.
 *
 * Callers pass order lines only for position brackets. An order's own brackets
 * are left alone because the order itself is in that list and could suppress
 * them. `OrderLineRenderData` carries no `parentId` or `reduceOnly`, so a
 * bracket cannot be tied to the order that owns it; the residual is that an
 * unrelated order resting exactly on a position's stop hides the dashed bracket,
 * leaving that order's own line drawn at the same price.
 *
 * Deliberately kept out of the shared `tradingLineToBracketLines`: web populates
 * `brackets` differently, and a dedupe there would start suppressing web order
 * lines the moment it does, with nothing watching that path.
 */
function isBracketCoveredByOrderLine(
  bracketPrice: number,
  orderLines: readonly OrderLineRenderData[],
  priceTolerance: number,
): boolean {
  const safePriceTolerance = Number.isFinite(priceTolerance) ? priceTolerance : 0;
  return orderLines.some((order) => Math.abs(order.price - bracketPrice) <= safePriceTolerance);
}

export function createNativeBracketPriceLines({
  objectType,
  objectId,
  line,
  pricePrecision,
  positiveColor,
  orderLines = [],
  priceTolerance = 0,
}: {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  line: OrderLineRenderData | PositionLineRenderData;
  pricePrecision: number;
  positiveColor: string;
  orderLines?: readonly OrderLineRenderData[];
  priceTolerance?: number;
}): NativeRenderablePriceLine[] {
  return tradingLineToBracketLines(line, (price) => formatNativeTradeLinePrice(price, pricePrecision), positiveColor)
    .filter((priceLine) => !isBracketCoveredByOrderLine(priceLine.price, orderLines, priceTolerance))
    .map(
      (priceLine): NativeRenderablePriceLine => ({
        ...priceLine,
        nativeBracketRef: {
          objectType,
          objectId,
          // tradingLineToBracketLines owns these ids; the labels carry no
          // secondaryText, so keying off one tagged every bracket as tp.
          bracketType: priceLine.id.endsWith('-sl') ? 'sl' : 'tp',
        },
      }),
    );
}
