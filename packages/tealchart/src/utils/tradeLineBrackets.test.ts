import { describe, expect, it } from 'vitest';

import type { OrderLineRenderData } from '../types';
import { tradingLineToBracketLines } from './tradeLineBrackets';

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

describe('trade line bracket price lines', () => {
  it('builds persistent TP and SL dashed price lines from OEMS brackets', () => {
    const lines = tradingLineToBracketLines(createOrderLine(), (price) => price.toFixed(1), '#12c48b');

    expect(lines.map((line) => line.id)).toEqual(['adapter-order-tp', 'adapter-order-sl']);
    expect(lines.map((line) => line.lineStyle)).toEqual(['dashed', 'dashed']);
    expect(lines.map((line) => line.label.secondaryText)).toEqual(['TP', 'SL']);
    expect(lines.map((line) => line.label.primaryText)).toEqual(['65000.0', '62000.0']);
  });

  it('omits inactive brackets', () => {
    expect(tradingLineToBracketLines(createOrderLine({ brackets: null }), (price) => String(price), '#12c48b')).toEqual([]);
    expect(
      tradingLineToBracketLines(createOrderLine({ brackets: { takeProfit: 0, stopLoss: undefined } }), (price) => String(price), '#12c48b'),
    ).toEqual([]);
  });
});
