import { describe, expect, it } from 'vitest';

import type { OrderLineRenderData, PositionLineRenderData } from '../types';
import {
  splitTradeLineButtonsForDisplay,
  resolveOrderTradeLineLabel,
  resolvePositionTradeLineLabel,
} from './tradeLineLabel';

function createOrderLine(overrides: Partial<OrderLineRenderData> = {}): OrderLineRenderData {
  return {
    id: 'adapter-order',
    orderId: 'exchange-order',
    price: 63777,
    quantity: '0.0034',
    quantityShort: '0.0034',
    text: 'Long',
    textShort: 'Long',
    lineColor: '#18aee8',
    lineStyle: 2,
    lineWidth: 1,
    lineLength: 0,
    lineLengthUnit: 'percentage',
    extendLeft: false,
    editable: true,
    cancellable: true,
    cancelAsSubmit: false,
    bodyBackgroundColor: '#20242a',
    bodyTextColor: '#18aee8',
    bodyBorderColor: '#18aee8',
    bodyFont: '11px Arial',
    quantityBackgroundColor: '#18aee8',
    quantityTextColor: '#101418',
    quantityBorderColor: '#18aee8',
    quantityFont: '11px Arial',
    cancelButtonBackgroundColor: '#20242a',
    cancelButtonIconColor: '#18aee8',
    cancelButtonBorderColor: '#18aee8',
    tooltip: '',
    cancelTooltip: '',
    modifyTooltip: '',
    brackets: { takeProfit: 65000, stopLoss: 62000 },
    partialEnabled: true,
    callbacks: { onMove: () => undefined },
    ...overrides,
  };
}

function createPositionLine(overrides: Partial<PositionLineRenderData> = {}): PositionLineRenderData {
  return {
    id: 'adapter-position',
    positionId: 'position-btc',
    price: 63777,
    quantity: '0.0034',
    quantityShort: '0.0034',
    text: 'Long',
    textShort: 'Long',
    lineColor: '#18aee8',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 0,
    lineLengthUnit: 'percentage',
    extendLeft: false,
    bodyBackgroundColor: '#20242a',
    bodyTextColor: '#18aee8',
    bodyBorderColor: '#18aee8',
    bodyFont: '11px Arial',
    quantityBackgroundColor: '#18aee8',
    quantityTextColor: '#101418',
    quantityBorderColor: '#18aee8',
    quantityFont: '11px Arial',
    closeable: true,
    closeButtonBackgroundColor: '#20242a',
    closeButtonIconColor: '#18aee8',
    closeButtonBorderColor: '#18aee8',
    reversible: true,
    reverseButtonBackgroundColor: '#20242a',
    reverseButtonIconColor: '#18aee8',
    reverseButtonBorderColor: '#18aee8',
    tooltip: '',
    closeTooltip: '',
    reverseTooltip: '',
    protectTooltipText: '',
    pnl: '+$1.33 (+0.17%)',
    pnlShort: '+$1.33',
    profitState: 'positive',
    brackets: { takeProfit: 65000, stopLoss: 62000 },
    partialEnabled: false,
    positionData: null,
    ...overrides,
  };
}

describe('trade line label resolver', () => {
  it('builds order segments and action buttons in the shared OEMS order', () => {
    const label = resolveOrderTradeLineLabel(createOrderLine(), '#12c48b');

    expect(label.offsetPercent).toBe(0);
    expect(label.segments.map((segment) => segment.text)).toEqual(['Long', '0.0034']);
    expect(label.buttons.map((button) => button.type)).toEqual(['tp', 'sl', 'cancel']);
    expect(label.buttons.map((button) => button.icon)).toEqual(['TP', 'SL', '×']);
  });

  it('orders inline action buttons before TP/SL for display parity', () => {
    const label = resolveOrderTradeLineLabel(createOrderLine(), '#12c48b');
    const ordered = splitTradeLineButtonsForDisplay(label.buttons);

    expect(ordered.inlineButtons.map((button) => button.type)).toEqual(['cancel']);
    expect(ordered.tpslButtons.map((button) => button.type)).toEqual(['tp', 'sl']);
    expect(ordered.orderedButtons.map((button) => button.type)).toEqual(['cancel', 'tp', 'sl']);
  });

  it('builds position pnl and controls in the shared OEMS order', () => {
    const label = resolvePositionTradeLineLabel(createPositionLine(), '#12c48b', '#ff4d67');

    expect(label.segments.map((segment) => segment.text)).toEqual(['Long', '0.0034', '+$1.33 (+0.17%)']);
    expect(label.segments[2]?.backgroundColor).toBe('#12c48b');
    expect(label.buttons.map((button) => button.type)).toEqual(['reverse', 'close', 'tp', 'sl']);
    expect(label.buttons.map((button) => button.icon)).toEqual(['⇄', '×', 'TP', 'SL']);
  });

  it('omits optional order controls when they are disabled', () => {
    const label = resolveOrderTradeLineLabel(createOrderLine({ brackets: null, cancellable: false }), '#12c48b');

    expect(label.segments.map((segment) => segment.text)).toEqual(['Long', '0.0034']);
    expect(label.buttons).toEqual([]);
  });

  it('omits optional position controls when they are disabled', () => {
    const label = resolvePositionTradeLineLabel(
      createPositionLine({ brackets: null, closeable: false, reversible: false }),
      '#12c48b',
      '#ff4d67',
    );

    expect(label.segments.map((segment) => segment.text)).toEqual(['Long', '0.0034', '+$1.33 (+0.17%)']);
    expect(label.buttons).toEqual([]);
  });
});
