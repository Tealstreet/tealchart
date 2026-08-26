import { describe, expect, it } from 'vitest';

import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';

import {
  createNativePriceAxisTagSources,
  DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT,
  DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT,
  getNativeBracketDragTagId,
  getNativePriceLineTagHeight,
  getNativePriceLineTagId,
  getNativeTradeLineTagId,
  NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY,
} from './priceAxisTagSources';

function priceLine(overrides: Partial<PriceLine>): PriceLine {
  return {
    id: 'price-line',
    price: 100,
    color: '#00a8d8',
    lineStyle: 'solid',
    type: 'price',
    label: {
      primaryText: '100',
    },
    ...overrides,
  } as PriceLine;
}

describe('native price axis tag sources', () => {
  it('creates stable tag ids for each source type', () => {
    expect(getNativePriceLineTagId('last')).toBe('priceLine:last');
    expect(getNativeTradeLineTagId('order', 'order-1')).toBe('order:order-1');
    expect(getNativeTradeLineTagId('position', 'position-1')).toBe('position:position-1');
    expect(getNativeBracketDragTagId('order-1', 'tp')).toBe('bracketDrag:order-1:tp');
  });

  it('uses taller tags for price lines with secondary labels', () => {
    expect(getNativePriceLineTagHeight(priceLine({ label: { primaryText: '100' } }))).toBe(DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT);
    expect(getNativePriceLineTagHeight(priceLine({ label: { primaryText: '100', secondaryText: '09:59' } }))).toBe(
      DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT,
    );
    expect(getNativePriceLineTagHeight(priceLine({ countdownToTime: 1_000, label: { primaryText: '100' } }))).toBe(
      DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT,
    );
  });

  it('creates price, order, and position sources with stable object identity', () => {
    const sources = createNativePriceAxisTagSources({
      extraPriceLines: [priceLine({ id: 'oracle', price: 101, priority: 20 })],
      bracketPriceLines: [
        {
          ...priceLine({ id: 'order-1:tp', price: 102, priority: 70 }),
          nativeBracketRef: {
            objectType: 'order',
            objectId: 'order-1',
            bracketType: 'tp',
          },
        },
      ],
      lastTradeLine: priceLine({ id: 'last', price: 103, priority: 100, label: { primaryText: '103', secondaryText: '09:59' } }),
      orderLines: [{ id: 'order-1', orderId: 'venue-order-1', price: 99 } as OrderLineRenderData],
      positionLines: [{ id: 'position-1', positionId: 'venue-position-1', price: 98 } as PositionLineRenderData],
      priceLineTagHeight: 22,
      tradeLineTagHeight: 21,
    });

    expect(sources).toEqual([
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:oracle',
        objectId: 'oracle',
        price: 101,
        height: 22,
        priority: 20,
      },
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:order-1:tp',
        objectId: 'order-1:tp',
        price: 102,
        height: 22,
        priority: 70,
        bracketRef: {
          objectType: 'order',
          objectId: 'order-1',
          bracketType: 'tp',
        },
      },
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:last',
        objectId: 'last',
        price: 103,
        height: DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT,
        priority: 100,
        fixed: true,
      },
      {
        sourceType: 'order',
        tagId: 'order:order-1',
        objectId: 'order-1',
        price: 99,
        height: 21,
        priority: NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY,
      },
      {
        sourceType: 'position',
        tagId: 'position:position-1',
        objectId: 'position-1',
        price: 98,
        height: 21,
        priority: NATIVE_TRADE_LINE_AXIS_TAG_PRIORITY,
      },
    ]);
  });

  it('does not reserve axis-tag collision space for canvas-only price lines', () => {
    const sources = createNativePriceAxisTagSources({
      extraPriceLines: [priceLine({ id: 'oracle', renderLineOnCanvas: true })],
      bracketPriceLines: [priceLine({ id: 'order-1:tp', renderLineOnCanvas: true })],
      lastTradeLine: priceLine({ id: 'last', renderLineOnCanvas: true }),
      orderLines: [],
      positionLines: [],
      tradeLineTagHeight: 21,
    });

    expect(sources).toEqual([]);
  });

  it('keeps collision space for canvas-rendered lines that explicitly show an axis tag', () => {
    const sources = createNativePriceAxisTagSources({
      extraPriceLines: [priceLine({ id: 'last', renderLineOnCanvas: true, showAxisTag: true })],
      bracketPriceLines: [],
      orderLines: [],
      positionLines: [],
      tradeLineTagHeight: 21,
    });

    expect(sources).toEqual([
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:last',
        objectId: 'last',
        price: 100,
        height: DEFAULT_NATIVE_PRICE_AXIS_TAG_HEIGHT,
        clampToPane: true,
        priority: undefined,
      },
    ]);
  });
});
