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

export function createNativeBracketPriceLines({
  objectType,
  objectId,
  line,
  pricePrecision,
  positiveColor,
}: {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  line: OrderLineRenderData | PositionLineRenderData;
  pricePrecision: number;
  positiveColor: string;
}): NativeRenderablePriceLine[] {
  return tradingLineToBracketLines(line, (price) => formatNativeTradeLinePrice(price, pricePrecision), positiveColor).map(
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
