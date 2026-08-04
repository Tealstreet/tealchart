import type { DerivedValue, SharedValue } from 'react-native-reanimated';
import type { NativeBracketDragInteractionState, NativeOrderDragInteractionState } from './nativeOemsDragState';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineGeometry,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import { useLayoutEffect } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import {
  clearNativeBracketDragState,
  clearNativeOrderDragState,
} from './nativeOemsDragState';
import {
  syncNativePriceAxisTagSources,
  syncNativeTradeLineInteractionGeometry,
} from './nativeInteractionSharedValues';
import { resolveNativePriceAxisTagCenters } from './nativeTradeLineHitTest';

export interface NativeSkiaSharedValueBridgeInput {
  bracketDragState: NativeBracketDragInteractionState;
  frame: NativeChartFrame | null;
  hasDataViewport: boolean;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  priceAxisTagHeight: number;
  priceAxisTagSources: NativePriceAxisTagSource[];
  sharedPriceAxisTagSources: SharedValue<NativePriceAxisTagSource[]>;
  sharedViewport: NativeViewportSharedValues;
  syncNativeOemsDragStateForSnapshot: () => void;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export interface NativeSkiaSharedValueBridge {
  resolvedPriceAxisTags: DerivedValue<NativeResolvedPriceAxisTag[]>;
}

export function useNativeSkiaSharedValueBridge({
  bracketDragState,
  frame,
  hasDataViewport,
  orderDragState,
  orderDragZones,
  priceAxisTagHeight,
  priceAxisTagSources,
  sharedPriceAxisTagSources,
  sharedViewport,
  syncNativeOemsDragStateForSnapshot,
  tradeLineActionZones,
  tradeLineGeometries,
  tradeLineRows,
}: NativeSkiaSharedValueBridgeInput): NativeSkiaSharedValueBridge {
  const resolvedPriceAxisTags = useDerivedValue(() =>
    hasDataViewport && frame
      ? resolveNativePriceAxisTagCenters({
          priceAxisTagSources: sharedPriceAxisTagSources.value,
          sharedViewport,
          frame,
          orderDragState,
          bracketDragState,
          priceAxisTagHeight,
        })
      : [],
  );

  useLayoutEffect(() => {
    if (!hasDataViewport) {
      syncNativeTradeLineInteractionGeometry({
        orderDragZones,
        actionZones: tradeLineActionZones,
        rows: tradeLineRows,
        geometries: [],
      });
      syncNativePriceAxisTagSources({ target: sharedPriceAxisTagSources, sources: [] });
      clearNativeOrderDragState(orderDragState);
      clearNativeBracketDragState(bracketDragState);
      return;
    }
    syncNativeTradeLineInteractionGeometry({
      orderDragZones,
      actionZones: tradeLineActionZones,
      rows: tradeLineRows,
      geometries: tradeLineGeometries,
    });
    syncNativeOemsDragStateForSnapshot();
  }, [
    hasDataViewport,
    bracketDragState,
    orderDragState,
    orderDragZones,
    sharedPriceAxisTagSources,
    syncNativeOemsDragStateForSnapshot,
    tradeLineActionZones,
    tradeLineGeometries,
    tradeLineRows,
  ]);

  useLayoutEffect(() => {
    if (!hasDataViewport) return;
    syncNativePriceAxisTagSources({ target: sharedPriceAxisTagSources, sources: priceAxisTagSources });
  }, [hasDataViewport, priceAxisTagSources, sharedPriceAxisTagSources]);

  return { resolvedPriceAxisTags };
}
