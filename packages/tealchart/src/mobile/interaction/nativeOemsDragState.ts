import type { SharedValue } from 'react-native-reanimated';
import type {
  OrderLineRenderData,
  PositionLineRenderData,
} from '../../types';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
} from '../utils/tradeLineLayout';

import { calculatePartialBracketPercentFromDelta } from '../../interaction/partialBrackets';

export type NativeTradeLineBracketType = 'tp' | 'sl';

export interface NativeOrderDragSharedValues {
  activeObjectId: SharedValue<string>;
  activePrice: SharedValue<number>;
}

export interface NativeOrderDragInteractionState extends NativeOrderDragSharedValues {
  active: SharedValue<boolean>;
  startPrice: SharedValue<number>;
  pricePerPixel: SharedValue<number>;
}

export interface NativeBracketDragSharedValues {
  activeObjectId: SharedValue<string>;
  activeObjectType: SharedValue<NativeTradeLineObjectType | ''>;
  activeBracketType: SharedValue<NativeTradeLineBracketType | ''>;
  activePrice: SharedValue<number>;
  activePartialPercent: SharedValue<number>;
  activePartialEnabled: SharedValue<boolean>;
  activeColor: SharedValue<string>;
}

export interface NativeBracketDragInteractionState extends NativeBracketDragSharedValues {
  active: SharedValue<boolean>;
  startPrice: SharedValue<number>;
  pricePerPixel: SharedValue<number>;
}

export const NATIVE_BRACKET_DRAG_THRESHOLD = 5;

export function clearNativeOrderDragState(state: NativeOrderDragInteractionState): void {
  'worklet';
  if (!state.active.value && !state.activeObjectId.value) return;
  state.activeObjectId.value = '';
  state.active.value = false;
}

export function beginNativeOrderDragState(
  state: NativeOrderDragInteractionState,
  zone: NativeOrderDragZone,
  pricePerPixel: number,
): void {
  'worklet';
  state.active.value = true;
  state.activeObjectId.value = zone.objectId;
  state.activePrice.value = zone.price;
  state.startPrice.value = zone.price;
  state.pricePerPixel.value = pricePerPixel;
}

export function updateNativeOrderDragState(state: NativeOrderDragInteractionState, translationY: number): boolean {
  'worklet';
  if (!state.active.value) return false;
  state.activePrice.value = state.startPrice.value - translationY * state.pricePerPixel.value;
  return true;
}

export interface NativeOrderDragCommitPayload {
  objectId: string;
  price: number;
}

export function getNativeOrderDragCommit(
  state: NativeOrderDragInteractionState,
  translationY = 0,
): NativeOrderDragCommitPayload | null {
  'worklet';
  if (!state.active.value) return null;
  if (Math.abs(translationY) <= NATIVE_BRACKET_DRAG_THRESHOLD) return null;
  return {
    objectId: state.activeObjectId.value,
    price: state.activePrice.value,
  };
}

export function finalizeNativeOrderDragState(state: NativeOrderDragInteractionState, success: boolean): boolean {
  'worklet';
  if (!state.active.value || success) return false;
  clearNativeOrderDragState(state);
  return true;
}

export function clearNativeBracketDragState(state: NativeBracketDragInteractionState): void {
  'worklet';
  if (!state.active.value && !state.activeObjectId.value) return;
  state.activeObjectId.value = '';
  state.activeObjectType.value = '';
  state.activeBracketType.value = '';
  state.activePartialPercent.value = 100;
  state.activePartialEnabled.value = false;
  state.activeColor.value = '';
  state.active.value = false;
}

export function beginNativeBracketDragState(
  state: NativeBracketDragInteractionState,
  zone: NativeTradeLineActionZone,
  pricePerPixel: number,
): boolean {
  'worklet';
  if (zone.actionType !== 'tp' && zone.actionType !== 'sl') return false;
  state.active.value = true;
  state.activeObjectId.value = zone.objectId;
  state.activeObjectType.value = zone.objectType;
  state.activeBracketType.value = zone.actionType;
  state.activePrice.value = zone.dragPrice ?? zone.price;
  state.activePartialPercent.value = 100;
  state.activePartialEnabled.value = zone.partialEnabled;
  state.activeColor.value = zone.color;
  state.startPrice.value = zone.dragPrice ?? zone.price;
  state.pricePerPixel.value = pricePerPixel;
  return true;
}

export function updateNativeBracketDragState(
  state: NativeBracketDragInteractionState,
  translationX: number,
  translationY: number,
): boolean {
  'worklet';
  if (!state.active.value) return false;
  state.activePrice.value = state.startPrice.value - translationY * state.pricePerPixel.value;
  state.activePartialPercent.value = state.activePartialEnabled.value ? calculatePartialBracketPercentFromDelta(translationX) : 100;
  return true;
}

export function hasNativeBracketDragMoved(
  translationX: number,
  translationY: number,
  threshold = NATIVE_BRACKET_DRAG_THRESHOLD,
): boolean {
  'worklet';
  return Math.abs(translationX) > threshold || Math.abs(translationY) > threshold;
}

export interface NativeBracketDragCommitPayload {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  bracketType: NativeTradeLineBracketType;
  price: number;
  partialPercent?: number;
}

export function getNativeBracketDragCommit(
  state: NativeBracketDragInteractionState,
  translationX: number,
  translationY: number,
): NativeBracketDragCommitPayload | 'clear' | null {
  'worklet';
  if (!state.active.value) return null;
  if (!hasNativeBracketDragMoved(translationX, translationY)) return null;
  const objectType = state.activeObjectType.value;
  const bracketType = state.activeBracketType.value;
  if ((objectType !== 'order' && objectType !== 'position') || (bracketType !== 'tp' && bracketType !== 'sl')) {
    return 'clear';
  }
  return {
    objectType,
    objectId: state.activeObjectId.value,
    bracketType,
    price: state.activePrice.value,
    partialPercent: state.activePartialEnabled.value ? state.activePartialPercent.value : undefined,
  };
}

export function finalizeNativeBracketDragState(state: NativeBracketDragInteractionState, success: boolean): boolean {
  'worklet';
  if (!state.active.value || success) return false;
  clearNativeBracketDragState(state);
  return true;
}

export function shouldClearNativeOrderDragForSnapshot({
  state,
  orderLines,
  getOrderObjectId,
}: {
  state: NativeOrderDragSharedValues;
  orderLines: readonly OrderLineRenderData[];
  getOrderObjectId: (line: OrderLineRenderData) => string;
}): boolean {
  const objectId = state.activeObjectId.value;
  if (!objectId) return false;

  const line = orderLines.find((candidate) => getOrderObjectId(candidate) === objectId);
  if (!line) return false;

  return line.actionState?.isPending === true || Math.abs(line.price - state.activePrice.value) <= 1e-9;
}

export function shouldClearNativeBracketDragForSnapshot({
  state,
  orderLines,
  positionLines,
  getOrderObjectId,
  getPositionObjectId,
}: {
  state: NativeBracketDragSharedValues;
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  getOrderObjectId: (line: OrderLineRenderData) => string;
  getPositionObjectId: (line: PositionLineRenderData) => string;
}): boolean {
  const objectId = state.activeObjectId.value;
  if (!objectId) return false;

  if (state.activeObjectType.value === 'order') {
    const line = orderLines.find((candidate) => getOrderObjectId(candidate) === objectId);
    return line?.actionState?.isPending === true;
  }

  if (state.activeObjectType.value === 'position') {
    const line = positionLines.find((candidate) => getPositionObjectId(candidate) === objectId);
    return line?.actionState?.isPending === true;
  }

  return false;
}
