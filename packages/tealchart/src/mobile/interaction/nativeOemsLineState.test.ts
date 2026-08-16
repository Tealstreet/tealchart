import { describe, expect, it } from 'vitest';

import { OemsActionManager } from '../../interaction/oemsActionManager';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';

import {
  applyNativeOrderActionState,
  applyNativePositionActionState,
  confirmNativeOrderLineSnapshots,
  getNativeOrderLineState,
  getNativePositionLineState,
  type NativeOemsTradingLineState,
} from './nativeOemsLineState';

function pendingCallback(): Promise<void> {
  return new Promise(() => {});
}

function createManager(): OemsActionManager<NativeOemsTradingLineState> {
  return new OemsActionManager<NativeOemsTradingLineState>();
}

function orderLine(overrides: Partial<OrderLineRenderData> = {}): OrderLineRenderData {
  return {
    // Adapter id is identity; the venue id differs on purpose.
    id: 'order-1',
    orderId: 'venue-order-1',
    price: 100,
    quantity: '0.10',
    quantityShort: '0.10',
    text: 'Buy Limit',
    textShort: 'Buy',
    lineColor: '#00a8d8',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 100,
    lineLengthUnit: 'percentage',
    extendLeft: false,
    editable: true,
    cancellable: true,
    cancelAsSubmit: false,
    bodyBackgroundColor: '#1f2937',
    bodyTextColor: '#00a8d8',
    bodyBorderColor: '#00a8d8',
    bodyFont: '12px sans-serif',
    quantityBackgroundColor: '#00a8d8',
    quantityTextColor: '#111827',
    quantityBorderColor: '#00a8d8',
    quantityFont: '12px sans-serif',
    cancelButtonBackgroundColor: '#1f2937',
    cancelButtonIconColor: '#00a8d8',
    cancelButtonBorderColor: '#00a8d8',
    tooltip: '',
    cancelTooltip: '',
    modifyTooltip: '',
    brackets: { takeProfit: 120, stopLoss: 90 },
    partialEnabled: false,
    ...overrides,
  };
}

function positionLine(overrides: Partial<PositionLineRenderData> = {}): PositionLineRenderData {
  return {
    id: 'position-1',
    positionId: 'position-1',
    price: 100,
    quantity: '0.10',
    quantityShort: '0.10',
    text: 'Long',
    textShort: 'Long',
    lineColor: '#00a8d8',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 100,
    lineLengthUnit: 'percentage',
    extendLeft: false,
    bodyBackgroundColor: '#1f2937',
    bodyTextColor: '#00a8d8',
    bodyBorderColor: '#00a8d8',
    bodyFont: '12px sans-serif',
    quantityBackgroundColor: '#00a8d8',
    quantityTextColor: '#111827',
    quantityBorderColor: '#00a8d8',
    quantityFont: '12px sans-serif',
    closeable: true,
    closeButtonBackgroundColor: '#1f2937',
    closeButtonIconColor: '#00a8d8',
    closeButtonBorderColor: '#00a8d8',
    reversible: true,
    reverseButtonBackgroundColor: '#1f2937',
    reverseButtonIconColor: '#00a8d8',
    reverseButtonBorderColor: '#00a8d8',
    tooltip: '',
    closeTooltip: '',
    reverseTooltip: '',
    protectTooltipText: '',
    pnl: '+$1.00',
    pnlShort: '+$1',
    profitState: 'positive',
    brackets: { takeProfit: 120, stopLoss: 90 },
    partialEnabled: false,
    positionData: null,
    ...overrides,
  };
}

describe('native OEMS line state', () => {
  it('applies pending order move state with stable order identity', () => {
    const manager = createManager();
    const line = orderLine();
    const originalState = getNativeOrderLineState(line);

    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderMove',
      originalState,
      optimisticState: { ...originalState, price: 105 },
      callback: pendingCallback,
    });

    const applied = applyNativeOrderActionState(line, manager);

    expect(applied.price).toBe(105);
    expect(applied.actionState).toEqual({
      kind: 'orderMove',
      isPending: true,
      isAwaitingCallback: true,
      isAwaitingConfirmation: false,
    });

    manager.dispose();
  });

  it('confirms pending order removal when the snapshot no longer contains the stable order id', () => {
    const manager = createManager();
    const originalState = getNativeOrderLineState(orderLine());

    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderCancel',
      originalState,
      optimisticState: originalState,
      confirmsRemoved: true,
      callback: pendingCallback,
    });

    confirmNativeOrderLineSnapshots(manager, []);

    expect(manager.getAction('order', 'order-1')).toBeNull();
    manager.dispose();
  });

  it('applies pending position bracket move state without changing entry price', () => {
    const manager = createManager();
    const line = positionLine();
    const originalState = getNativePositionLineState(line);

    manager.startAction({
      objectType: 'position',
      objectId: 'position-1',
      kind: 'positionTpMove',
      originalState,
      optimisticState: { ...originalState, takeProfit: 130 },
      callback: pendingCallback,
    });

    const applied = applyNativePositionActionState(line, manager);

    expect(applied.price).toBe(100);
    expect(applied.brackets?.takeProfit).toBe(130);
    expect(applied.brackets?.stopLoss).toBe(90);
    expect(applied.actionState?.kind).toBe('positionTpMove');

    manager.dispose();
  });
});
