import { describe, expect, it } from 'vitest';

import type { PlotOutput } from '@tealstreet/tealscript';
import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';

import {
  createNativeIndicatorOutputTagSources,
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

describe('native indicator output tag sources', () => {
  const panes = [
    { id: 'main', type: 'main' },
    { id: 'pane_1', type: 'indicator', indicatorIds: ['macd'] },
  ];

  function plot(overrides: Partial<PlotOutput>): PlotOutput {
    return {
      id: 'plot',
      title: 'Plot',
      type: 'plot',
      values: [],
      color: '#2196F3',
      ...overrides,
    };
  }

  // They stack against orders and the last-trade tag, which owns the anchor, so
  // an indicator readout must never outrank either.
  it('emits main-pane outputs with no priority and no fixed flag', () => {
    const sources = createNativeIndicatorOutputTagSources({
      panes,
      indicatorPaneInfo: { bb: { overlay: true } },
      plots: [plot({ id: 'basis', scriptId: 'bb', values: [63_400, 63_500] })],
      totalBarCount: 2,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]!.sourceType).toBe('indicatorOutput');
    expect(sources[0]!.price).toBe(63_500);
    expect(sources[0]!.priority).toBeUndefined();
    expect(sources[0]!.fixed).toBeUndefined();
    expect(sources[0]!.clampToPane).toBeUndefined();
  });

  it('leaves indicator-pane outputs to their own pass', () => {
    const sources = createNativeIndicatorOutputTagSources({
      panes,
      indicatorPaneInfo: { macd: { overlay: false, paneId: 'pane_1' } },
      plots: [plot({ id: 'signal', scriptId: 'macd', values: [1, 2] })],
      totalBarCount: 2,
    });

    expect(sources).toEqual([]);
  });

  it('emits nothing when a plot has no resolvable value', () => {
    expect(
      createNativeIndicatorOutputTagSources({
        panes,
        indicatorPaneInfo: { bb: { overlay: true } },
        plots: [plot({ id: 'basis', scriptId: 'bb', values: [null, Number.NaN] })],
        totalBarCount: 2,
      }),
    ).toEqual([]);
  });

  // A forceOverlay plot draws on the main pane but the shared helper emits no
  // label for it, so there is no tag and nothing to stack.
  it('emits nothing for a forceOverlay plot', () => {
    expect(
      createNativeIndicatorOutputTagSources({
        panes,
        indicatorPaneInfo: { bb: { overlay: true } },
        plots: [plot({ id: 'basis', scriptId: 'bb', values: [63_500], forceOverlay: true })],
        totalBarCount: 1,
      }),
    ).toEqual([]);
  });

  it('emits nothing without a main pane', () => {
    expect(
      createNativeIndicatorOutputTagSources({
        panes: [{ id: 'main', type: 'indicator' }],
        indicatorPaneInfo: { bb: { overlay: true } },
        plots: [plot({ id: 'basis', scriptId: 'bb', values: [63_500] })],
        totalBarCount: 1,
      }),
    ).toEqual([]);
  });
});
