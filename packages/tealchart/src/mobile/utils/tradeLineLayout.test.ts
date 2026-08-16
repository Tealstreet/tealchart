import { describe, expect, it } from 'vitest';

import {
  buildNativeTradeLineGeometries,
  createNativeTradeLineRows,
  formatNativeTradeLinePrice,
  getNativeTradeLinePriceDecimals,
  getNativeTradeLinePriceLabelCharacterCapacity,
  getNativeTradeLinePriceTagTextBaselineOffset,
  getNativeTradeLineTextBaselineOffset,
  getNativeTradeLineActionButtonWidth,
  layoutNativeTradeLine,
  measureNativeTradeLineLabelWidth,
  measureNativeTradeLinePriceLabelWidth,
  NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X,
  nativeTradeLineBorderStyle,
  nativeTradeLineDashArray,
} from './tradeLineLayout';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';

const dimensions = {
  height: 480,
  margins: { bottom: 32, left: 8, right: 76, top: 20 },
  width: 390,
};

const measureText = (text: string) => text.length * 7;
const measureVariableText = (text: string) =>
  Array.from(text).reduce((width, character) => width + (character === 'W' ? 16 : 7), 0);

function createOrderLine(overrides: Partial<OrderLineRenderData> = {}): OrderLineRenderData {
  return {
    // Adapter id is the identity; the exchange id is payload.
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

describe('native trade line layout', () => {
  it('maps TradingView line style values used by OEMS lines', () => {
    expect(nativeTradeLineBorderStyle(0)).toBe('solid');
    expect(nativeTradeLineBorderStyle(1)).toBe('dotted');
    expect(nativeTradeLineBorderStyle(2)).toBe('dashed');
    expect(nativeTradeLineBorderStyle(3)).toBe('dashed');
    expect(nativeTradeLineBorderStyle(4)).toBe('dashed');
    expect(nativeTradeLineDashArray(0)).toBeUndefined();
    expect(nativeTradeLineDashArray(1)).toEqual([1, 5]);
    expect(nativeTradeLineDashArray(2)).toEqual([4, 4]);
    expect(nativeTradeLineDashArray(3)).toEqual([4, 4]);
    expect(nativeTradeLineDashArray(4)).toEqual([6, 3]);
  });

  it('formats price labels with grouping and native tick-size precision', () => {
    expect(getNativeTradeLinePriceDecimals(1)).toBe(0);
    expect(getNativeTradeLinePriceDecimals(0.1)).toBe(1);
    expect(getNativeTradeLinePriceDecimals(0.01)).toBe(2);
    expect(formatNativeTradeLinePrice(63777, 0.1)).toBe('63,777.0');
    expect(formatNativeTradeLinePrice(60424, 0)).toBe('60,424');
    expect(formatNativeTradeLinePrice(Number.NaN, 0.01)).toBe('0.00');
  });

  it('measures optional controls as part of label width', () => {
    const base = measureNativeTradeLineLabelWidth({
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });
    const withControls = measureNativeTradeLineLabelWidth({
      actionButtonCount: 2,
      bracketButtonCount: 2,
      bracketGap: 4,
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });

    expect(withControls).toBeGreaterThan(base);
  });

  it('uses web-aligned compact action button width', () => {
    expect(getNativeTradeLineActionButtonWidth()).toBe(16);
  });

  it('derives native trade-label text baselines from label height', () => {
    expect(getNativeTradeLineTextBaselineOffset(18)).toBe(14);
    expect(getNativeTradeLineTextBaselineOffset(22)).toBe(16);
    expect(-1 + getNativeTradeLinePriceTagTextBaselineOffset(18)).toBe(14);
    expect(-1 + getNativeTradeLinePriceTagTextBaselineOffset(22)).toBe(16);
  });

  it('keeps long labels and price labels separated on phone-sized charts', () => {
    const labelWidth = measureNativeTradeLineLabelWidth({
      actionButtonCount: 2,
      bracketButtonCount: 2,
      bracketGap: 4,
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });
    const layout = layoutNativeTradeLine({
      dimensions,
      formattedPrice: '63777',
      labelWidth,
      lineLength: 0,
    });

    expect(layout.labelWidth).toBeLessThan(labelWidth);
    expect(layout.maxLabelWidth).toBeGreaterThan(0);
    expect(layout.labelX + layout.labelWidth).toBeLessThanOrEqual(layout.priceLabelLeft - 2);
    expect(layout.rightLineLeft + layout.rightLineWidth).toBeLessThanOrEqual(layout.priceLabelLeft - 2);
    expect(layout.priceLabelLeft + layout.priceLabelWidth).toBeLessThanOrEqual(dimensions.width - 4);
  });

  it('treats pixel line length as the right connector length', () => {
    const layout = layoutNativeTradeLine({
      dimensions,
      formattedPrice: '63777',
      labelWidth: 120,
      lineLength: 36,
      lineLengthUnit: 'pixel',
    });

    expect(layout.rightLineWidth).toBe(36);
  });

  it('builds stable order geometry with cancel, bracket actions, and drag zone', () => {
    const [geometry] = buildNativeTradeLineGeometries([createOrderLine()], [], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(geometry?.objectType).toBe('order');
    // The adapter id, not the exchange's - a venue re-key must not move a
    // line's identity out from under a pending action.
    expect(geometry?.objectId).toBe('adapter-order');
    expect(geometry?.priceLabelText).toBe('63,777.0');
    expect(geometry?.priceLabelWidth).toBe(measureNativeTradeLinePriceLabelWidth('63,777.0', measureText));
    expect(geometry?.priceLabelTextX).toBeGreaterThanOrEqual(geometry?.priceLabelX ?? 0);
    expect(geometry?.priceLabelTextX).toBe(
      Math.round(
        (geometry?.priceLabelX ?? 0) +
          (geometry?.priceLabelWidth ?? 0) -
          NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X -
          measureText('63,777.0'),
      ),
    );
    expect(geometry?.segments[0]?.displayText).toBe('Long');
    expect(geometry?.buttons.map((button) => button.type)).toEqual(['cancel', 'tp', 'sl']);
    expect(geometry?.fitting).toEqual({
      mode: 'full',
      hiddenActionTypes: [],
      hiddenSegmentIndexes: [],
      truncatedSegmentIndexes: [],
    });
    expect(geometry?.buttons.map((button) => button.corners)).toEqual(['right', 'left', 'right']);
    expect(geometry?.buttons.map((button) => button.displayIcon)).toEqual(['×', 'TP', 'SL']);
    expect(geometry?.actionZones.map((zone) => zone.actionType)).toEqual(['cancel', 'tp', 'sl']);
    expect(geometry?.actionZones.map((zone) => zone.price)).toEqual([63777, 63777, 63777]);
    expect(geometry?.actionZones.map((zone) => zone.dragPrice)).toEqual([63777, 65000, 62000]);
    expect(geometry?.dragZone?.objectId).toBe('adapter-order');
    const labelBodyRightX = Math.max(...(geometry?.segments ?? []).map((segment) => segment.x + segment.width));
    expect(geometry?.dragZone?.x1).toBe(geometry?.labelX);
    expect(geometry?.dragZone?.x2).toBe(labelBodyRightX);
    expect(geometry?.dragZone?.x2).toBeLessThanOrEqual(geometry?.buttons[0]?.x ?? Number.POSITIVE_INFINITY);
    expect(geometry?.dragZone?.x2).toBeLessThan(geometry?.rightLineStartX ?? Number.POSITIVE_INFINITY);
    expect(geometry?.dragZone?.x2).toBeLessThan(geometry?.priceLabelX ?? Number.POSITIVE_INFINITY);
    expect(geometry?.rightLineEndX).toBeLessThanOrEqual((geometry?.priceLabelX ?? 0) - 2);
  });

  it('matches web extendLeft semantics for the left connector', () => {
    const [withoutLeftConnector] = buildNativeTradeLineGeometries([createOrderLine({ extendLeft: false, lineLength: 50 })], [], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });
    const [withLeftConnector] = buildNativeTradeLineGeometries([createOrderLine({ extendLeft: true, lineLength: 50 })], [], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(withoutLeftConnector?.leftLineEndX).toBe(withoutLeftConnector?.leftLineStartX);
    expect(withoutLeftConnector?.rightLineEndX).toBeGreaterThan(withoutLeftConnector?.rightLineStartX ?? 0);
    expect(withLeftConnector?.leftLineEndX).toBeGreaterThan(withLeftConnector?.leftLineStartX ?? 0);
    expect(withLeftConnector?.rightLineEndX).toBeGreaterThan(withLeftConnector?.rightLineStartX ?? 0);
  });

  it('measures price tags independently from body and button text', () => {
    const priceTextWidth = (text: string) => text.length * 5;
    const [geometry] = buildNativeTradeLineGeometries([createOrderLine()], [], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      priceTextWidth,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(geometry?.priceLabelWidth).toBe(measureNativeTradeLinePriceLabelWidth('63,777.0', priceTextWidth));
    expect(geometry?.priceLabelTextX).toBe(
      Math.round(
        (geometry?.priceLabelX ?? 0) +
          (geometry?.priceLabelWidth ?? 0) -
          NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X -
          priceTextWidth('63,777.0'),
      ),
    );
    expect(geometry?.buttons.map((button) => button.textX)).toEqual([
      Math.round((geometry?.buttons[0]?.x ?? 0) + 8 - measureText('×') / 2),
      Math.round((geometry?.buttons[1]?.x ?? 0) + 13 - measureText('TP') / 2),
      Math.round((geometry?.buttons[2]?.x ?? 0) + 13 - measureText('SL') / 2),
    ]);
  });

  it('places price tags inside the native price-axis lane when provided', () => {
    const priceLabelLane = {
      left: dimensions.width - dimensions.margins.right + 2,
      right: dimensions.width - 4,
    };
    const [geometry] = buildNativeTradeLineGeometries([createOrderLine()], [], {
      dimensions,
      priceLabelLane,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      priceTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(geometry?.priceLabelX).toBeGreaterThanOrEqual(priceLabelLane.left);
    expect((geometry?.priceLabelX ?? 0) + (geometry?.priceLabelWidth ?? 0)).toBeLessThanOrEqual(priceLabelLane.right);
    expect(geometry?.priceLabelWidth).toBe(measureNativeTradeLinePriceLabelWidth('63,777.0', measureText));
    expect(geometry?.rightLineEndX).toBeLessThanOrEqual((geometry?.priceLabelX ?? 0) - 2);
  });

  it('lets wide price tags grow left from the native price-axis lane', () => {
    const priceLabelLane = {
      left: dimensions.width - dimensions.margins.right + 2,
      right: dimensions.width - 4,
    };
    const [geometry] = buildNativeTradeLineGeometries([createOrderLine()], [], {
      dimensions,
      priceLabelLane,
      pricePrecision: 0.000001,
      textWidth: measureText,
      smallTextWidth: measureText,
      priceTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(geometry?.priceLabelText).toBe('63,777.000000');
    expect(geometry?.priceLabelWidth).toBe(measureNativeTradeLinePriceLabelWidth('63,777.000000', measureText));
    expect(geometry?.priceLabelX).toBeLessThan(priceLabelLane.left);
    expect((geometry?.priceLabelX ?? 0) + (geometry?.priceLabelWidth ?? 0)).toBe(priceLabelLane.right);
    expect(geometry?.priceLabelTextX).toBe(
      Math.round(priceLabelLane.right - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X - measureText('63,777.000000')),
    );
    expect(geometry?.rightLineEndX).toBeLessThanOrEqual((geometry?.priceLabelX ?? 0) - 2);
  });

  it('derives live price-label character capacity from the same padding contract', () => {
    expect(getNativeTradeLinePriceLabelCharacterCapacity(62, 5)).toBe(
      Math.floor((62 - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2) / 5),
    );
    expect(getNativeTradeLinePriceLabelCharacterCapacity(4, 5)).toBe(1);
    expect(getNativeTradeLinePriceLabelCharacterCapacity(62, 0)).toBe(1);
  });

  it('truncates cramped native labels instead of rendering empty segments or dropping controls', () => {
    const [geometry] = buildNativeTradeLineGeometries(
      [
        createOrderLine({
          lineLength: 0,
          quantity: '123456789.123456789',
          quantityShort: '',
          text: 'Very Long Buy Limit Label',
          textShort: '',
        }),
      ],
      [],
      {
        dimensions: {
          ...dimensions,
          width: 310,
        },
        pricePrecision: 0.1,
        textWidth: measureText,
        smallTextWidth: measureText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      },
    );

    expect(geometry?.segments).toHaveLength(2);
    expect(geometry?.segments.map((segment) => segment.text)).toEqual(['Very Long Buy Limit Label', '123456789.123456789']);
    expect(geometry?.segments.every((segment) => segment.displayText.length > 0)).toBe(true);
    expect(geometry?.segments.some((segment) => segment.displayText.endsWith('...'))).toBe(true);
    expect(geometry?.buttons.map((button) => button.type)).toEqual(['cancel', 'tp', 'sl']);
    expect(geometry?.fitting.mode).toBe('compact');
    expect(geometry?.fitting.hiddenActionTypes).toEqual([]);
    expect(geometry?.fitting.truncatedSegmentIndexes.length).toBeGreaterThan(0);
    expect(geometry?.buttons.every((button) => button.displayIcon.length > 0)).toBe(true);
    expect(geometry?.labelX + (geometry?.labelWidth ?? 0)).toBeLessThanOrEqual((geometry?.priceLabelX ?? 0) - 2);
  });

  it('uses explicit compact fitting instead of silently dropping overflow actions', () => {
    const [geometry] = buildNativeTradeLineGeometries(
      [
        createOrderLine({
          lineLength: 0,
          quantity: '123456789.123456789',
          quantityShort: '',
          text: 'Very Long Buy Limit Label',
          textShort: '',
        }),
      ],
      [],
      {
        dimensions: {
          ...dimensions,
          width: 190,
        },
        pricePrecision: 0.1,
        textWidth: measureText,
        smallTextWidth: measureText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      },
    );

    expect(geometry?.fitting.mode).toBe('compact');
    expect(geometry?.buttons.map((button) => button.type)).toContain('cancel');
    expect(geometry?.fitting.hiddenActionTypes.length ?? 0).toBeGreaterThan(0);
    expect(geometry?.fitting.hiddenActionTypes).not.toContain('cancel');
    expect(geometry?.fitting.hiddenActionTypes.every((type) => type === 'tp' || type === 'sl')).toBe(true);
    expect(geometry?.actionZones.map((zone) => zone.actionType)).toEqual(geometry?.buttons.map((button) => button.type));
    expect(geometry?.segments.length ?? 0).toBeLessThanOrEqual(2);
    expect(geometry?.fitting.hiddenSegmentIndexes.length ?? 0).toBeGreaterThan(0);
  });

  it('reserves measured minimum width for later segments with variable-width fonts', () => {
    const [geometry] = buildNativeTradeLineGeometries(
      [
        createOrderLine({
          quantity: 'WW',
          quantityShort: '',
          text: 'Long body text',
          textShort: '',
        }),
      ],
      [],
      {
        dimensions: {
          ...dimensions,
          width: 318,
        },
        pricePrecision: 0.1,
        textWidth: measureVariableText,
        smallTextWidth: measureVariableText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      },
    );

    expect(geometry?.segments.map((segment) => segment.text)).toEqual(['Long body text', 'WW']);
    expect(geometry?.segments[1]?.displayText).toBe('W');
  });

  // The gap used to appear only when a cancel/close/reverse button happened to
  // be shown, so the same label spaced itself differently depending on which
  // actions were available. Web has always gapped a leading bracket group.
  it('stands the bracket buttons off the label whether or not action buttons precede them', () => {
    const gapBefore = (line: PositionLineRenderData) => {
      const [geometry] = buildNativeTradeLineGeometries([], [line], {
        dimensions,
        pricePrecision: 0.1,
        textWidth: measureText,
        smallTextWidth: measureText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      });
      const buttons = geometry?.buttons ?? [];
      const firstBracket = buttons.find((button) => button.type === 'tp');
      const previous = buttons[buttons.indexOf(firstBracket!) - 1];
      const segments = geometry?.segments ?? [];
      const leftEdge = previous
        ? previous.x + previous.width
        : Math.max(...segments.map((segment) => segment.x + segment.width));

      return { gap: (firstBracket?.x ?? 0) - leftEdge, geometry };
    };

    const withActions = gapBefore(
      createPositionLine({ positionData: { entryPrice: 63600, isLong: true, notional: 2500 } }),
    );
    const withoutActions = gapBefore(
      createPositionLine({
        closeable: false,
        reversible: false,
        positionData: { entryPrice: 63600, isLong: true, notional: 2500 },
      }),
    );

    expect(withActions.geometry?.buttons.map((button) => button.type)).toContain('reverse');
    expect(withoutActions.geometry?.buttons.map((button) => button.type)).not.toContain('reverse');
    expect(withoutActions.gap).toBe(withActions.gap);
    expect(withoutActions.gap).toBeGreaterThan(0);
  });

  // The gap has to be reserved in the requested label width, not taken out of
  // the text: measuring without it truncated the PnL segment in exactly the
  // case the gap was added for.
  it('widens the label for the gap instead of eating the segment text', () => {
    const render = (overrides: Partial<PositionLineRenderData>) => {
      const [geometry] = buildNativeTradeLineGeometries([], [
        createPositionLine({
          positionData: { entryPrice: 63600, isLong: true, notional: 2500 },
          ...overrides,
        }),
      ], {
        dimensions,
        pricePrecision: 0.1,
        textWidth: measureText,
        smallTextWidth: measureText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      });
      return geometry?.segments.map((segment) => segment.displayText ?? segment.text) ?? [];
    };

    expect(render({ closeable: false, reversible: false })).toEqual(render({}));
  });

  // Standing off the segments means the two are separate pills, so each closes
  // its own edge instead of running square into the gap between them.
  it('rounds the seam it just opened between the segments and the brackets', () => {
    const [geometry] = buildNativeTradeLineGeometries([], [
      createPositionLine({
        closeable: false,
        reversible: false,
        positionData: { entryPrice: 63600, isLong: true, notional: 2500 },
      }),
    ], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });
    const segments = geometry?.segments ?? [];
    const buttons = geometry?.buttons ?? [];

    expect(segments[segments.length - 1]?.corners).toBe('right');
    expect(buttons[0]?.corners).toBe('left');
    expect(buttons[buttons.length - 1]?.corners).toBe('right');
  });

  it('builds stable position geometry with reverse, close, bracket actions, and no order drag zone', () => {
    const [geometry] = buildNativeTradeLineGeometries([], [
      createPositionLine({
        positionData: {
          entryPrice: 63600,
          isLong: true,
          notional: 2500,
        },
      }),
    ], {
      dimensions,
      pricePrecision: 0.1,
      textWidth: measureText,
      smallTextWidth: measureText,
      positiveColor: '#12c48b',
      negativeColor: '#ff4d67',
    });

    expect(geometry?.objectType).toBe('position');
    expect(geometry?.objectId).toBe('adapter-position');
    expect(geometry?.buttons.map((button) => button.type)).toEqual(['reverse', 'close', 'tp', 'sl']);
    expect(geometry?.fitting).toEqual({
      mode: 'full',
      hiddenActionTypes: [],
      hiddenSegmentIndexes: [],
      truncatedSegmentIndexes: [],
    });
    expect(geometry?.buttons.map((button) => button.displayIcon)).toEqual(['⇄', '×', 'TP', 'SL']);
    expect(geometry?.segments[0]?.corners).toBe('left');
    expect(geometry?.buttons[0]?.corners).toBe('none');
    expect(geometry?.buttons[1]?.corners).toBe('right');
    expect(geometry?.buttons[2]?.corners).toBe('left');
    expect(geometry?.buttons[3]?.corners).toBe('right');
    const reverseButton = geometry?.buttons[0];
    expect(reverseButton?.textX).toBe(Math.round((reverseButton?.x ?? 0) + (reverseButton?.width ?? 0) / 2 - measureText('⇄') / 2));
    expect(geometry?.actionZones.map((zone) => zone.actionType)).toEqual(['reverse', 'close', 'tp', 'sl']);
    expect(geometry?.actionZones.map((zone) => zone.price)).toEqual([63777, 63777, 63777, 63777]);
    expect(geometry?.actionZones.map((zone) => zone.entryPrice)).toEqual([63600, 63600, 63600, 63600]);
    expect(geometry?.actionZones.map((zone) => zone.positionNotional)).toEqual([2500, 2500, 2500, 2500]);
    expect(geometry?.actionZones.map((zone) => zone.positionIsLong)).toEqual([true, true, true, true]);
    expect(geometry?.actionZones.map((zone) => zone.dragPrice)).toEqual([63777, 63777, 65000, 62000]);
    // The TP/SL buttons are tinted down to sit behind their label text, so the
    // drag preview strokes its price line with the untinted bracket colour
    // instead - and TP and SL must stay distinguishable.
    const bracketZones = geometry?.actionZones.filter((zone) => zone.actionType === 'tp' || zone.actionType === 'sl');
    expect(bracketZones?.map((zone) => zone.lineColor)).not.toEqual(bracketZones?.map((zone) => zone.color));
    expect(new Set(bracketZones?.map((zone) => zone.lineColor)).size).toBe(2);
    expect(geometry?.dragZone).toBeNull();
  });

  it('exports stable trade-line rows for native worklet collision resolution', () => {
    const geometries = buildNativeTradeLineGeometries(
      [createOrderLine({ id: 'order-a', price: 100 })],
      [createPositionLine({ id: 'position-b', price: 101 })],
      {
        dimensions,
        pricePrecision: 0.1,
        textWidth: measureText,
        smallTextWidth: measureText,
        positiveColor: '#12c48b',
        negativeColor: '#ff4d67',
      },
    );

    expect(createNativeTradeLineRows(geometries)).toEqual([
      { objectId: 'order-a', objectType: 'order', price: 100 },
      { objectId: 'position-b', objectType: 'position', price: 101 },
    ]);
  });
});
