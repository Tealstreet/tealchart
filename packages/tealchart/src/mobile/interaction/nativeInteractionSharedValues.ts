import type { SharedValue } from 'react-native-reanimated';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineGeometry,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import { createNativeOrderDragZones, createNativeTradeLineRows } from '../utils/tradeLineLayout';

function areNativeOrderDragZonesEqual(left: readonly NativeOrderDragZone[], right: readonly NativeOrderDragZone[]): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((zone, index) => {
    const other = right[index];
    return other && zone.objectId === other.objectId && zone.price === other.price && zone.x1 === other.x1 && zone.x2 === other.x2;
  });
}

function areNativeTradeLineActionZonesEqual(
  left: readonly NativeTradeLineActionZone[],
  right: readonly NativeTradeLineActionZone[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((zone, index) => {
    const other = right[index];
    return (
      other &&
      zone.objectType === other.objectType &&
      zone.objectId === other.objectId &&
      zone.actionType === other.actionType &&
      zone.price === other.price &&
      zone.entryPrice === other.entryPrice &&
      zone.dragPrice === other.dragPrice &&
      zone.partialEnabled === other.partialEnabled &&
      zone.positionNotional === other.positionNotional &&
      zone.positionIsLong === other.positionIsLong &&
      zone.color === other.color &&
      zone.lineColor === other.lineColor &&
      zone.x1 === other.x1 &&
      zone.x2 === other.x2
    );
  });
}

function areNativeTradeLineRowsEqual(left: readonly NativeTradeLineRow[], right: readonly NativeTradeLineRow[]): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((row, index) => {
    const other = right[index];
    return (
      other &&
      row.objectType === other.objectType &&
      row.objectId === other.objectId &&
      row.price === other.price &&
      row.x1 === other.x1 &&
      row.x2 === other.x2
    );
  });
}

function areNativePriceAxisTagSourcesEqual(
  left: readonly NativePriceAxisTagSource[],
  right: readonly NativePriceAxisTagSource[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((source, index) => {
    const other = right[index];
    return (
      other &&
      source.sourceType === other.sourceType &&
      source.tagId === other.tagId &&
      source.objectId === other.objectId &&
      source.price === other.price &&
      source.height === other.height &&
      source.clampToPane === other.clampToPane &&
      source.priority === other.priority &&
      source.fixed === other.fixed &&
      source.bracketRef?.objectId === other.bracketRef?.objectId &&
      source.bracketRef?.objectType === other.bracketRef?.objectType &&
      source.bracketRef?.bracketType === other.bracketRef?.bracketType
    );
  });
}

export function syncNativeTradeLineInteractionGeometry({
  orderDragZones,
  actionZones,
  rows,
  geometries,
}: {
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  actionZones: SharedValue<NativeTradeLineActionZone[]>;
  rows: SharedValue<NativeTradeLineRow[]>;
  geometries: readonly NativeTradeLineGeometry[];
}): void {
  const nextOrderDragZones = createNativeOrderDragZones(geometries);
  const nextActionZones = geometries.flatMap((geometry) => geometry.actionZones);
  const nextRows = createNativeTradeLineRows(geometries);
  if (!areNativeOrderDragZonesEqual(orderDragZones.value, nextOrderDragZones)) {
    orderDragZones.value = nextOrderDragZones;
  }
  if (!areNativeTradeLineActionZonesEqual(actionZones.value, nextActionZones)) {
    actionZones.value = nextActionZones;
  }
  if (!areNativeTradeLineRowsEqual(rows.value, nextRows)) {
    rows.value = nextRows;
  }
}

export function syncNativePriceAxisTagSources({
  target,
  sources,
}: {
  target: SharedValue<NativePriceAxisTagSource[]>;
  sources: NativePriceAxisTagSource[];
}): void {
  if (!areNativePriceAxisTagSourcesEqual(target.value, sources)) {
    target.value = [...sources];
  }
}
