import type { ReactElement, ReactNode } from 'react';
import type { PositionLineRenderData, PriceLine } from '../../types';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { Group, matchFont, Line as SkiaLine } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TRADE_LINE_LABEL_COLOR } from '../../constants';
import { NATIVE_PRICE_AXIS_TAG_SIZING } from '../../utils/priceAxisTagSizing';
import { getNativePriceLineTagId, getNativeTradeLineTagId } from '../utils/priceAxisTagSources';
import { PRICE_AXIS_TAG_HEIGHT } from './nativeAxisTagLayout';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  NativePriceAxisTagAnimatedText,
  NativePriceAxisTagBox,
  NativePriceAxisTagStaticText,
} from './NativePriceAxisTag';
import { AnimatedPriceLine } from './NativePriceLineLayer';
import { measureNativeSkiaAxisCharacterWidth } from './nativeSkiaText';
import { NativeTradeLineLabelBody } from './NativeTradeLineLabelBody';
import { AnimatedTradeLine, AnimatedTradeLineDragTag } from './NativeTradeLineLayer';

function shared<T>(value: T) {
  return { value };
}

function sharedValueOf<T>(value: T | { value: T }): T {
  if (typeof value === 'object' && value !== null && 'value' in value) return value.value;
  return value;
}

function walkElements(node: ReactNode, visitor: (element: ReactElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as ReactElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): ReactElement[] {
  const elements: ReactElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 76, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(100),
  priceMin: shared(63000),
  priceMax: shared(64000),
};

const positionLine: PositionLineRenderData = {
  id: 'position-btc',
  positionId: 'position-btc',
  price: 63777,
  quantity: '0.0034',
  quantityShort: '0.0034',
  text: 'Long',
  textShort: 'Long',
  lineColor: '#18aee8',
  lineStyle: 0,
  lineWidth: 1,
  lineLength: 90,
  lineLengthUnit: 'percentage',
  extendLeft: true,
  bodyBackgroundColor: '#20242a',
  bodyTextColor: '#18aee8',
  bodyBorderColor: '#18aee8',
  bodyFont: '11px sans-serif',
  quantityBackgroundColor: '#18aee8',
  quantityTextColor: '#101418',
  quantityBorderColor: '#18aee8',
  quantityFont: '11px sans-serif',
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
  profitState: 'profit',
  brackets: { takeProfit: 64000, stopLoss: 63200 },
  partialEnabled: false,
  positionData: null,
};

const geometry: NativeTradeLineGeometry = {
  objectType: 'position',
  objectId: 'position-btc',
  price: 63777,
  fitting: {
    mode: 'full',
    hiddenActionTypes: [],
    hiddenSegmentIndexes: [],
    truncatedSegmentIndexes: [],
  },
  priceLabelText: '63,777.0',
  priceLabelTextX: 302,
  labelX: 80,
  labelWidth: 220,
  leftLineStartX: 62,
  leftLineEndX: 78,
  rightLineStartX: 302,
  rightLineEndX: 318,
  priceLabelX: 302,
  priceLabelWidth: 84,
  segments: [
    {
      text: 'Long',
      displayText: 'Long',
      textShort: 'Long',
      x: 80,
      width: 48,
      textX: 90,
      backgroundColor: '#20242a',
      textColor: '#18aee8',
      borderColor: '#18aee8',
      corners: 'left',
    },
  ],
  buttons: [],
  dragZone: null,
  actionZones: [],
};

const TRADE_AXIS_TAG_HEIGHT = NATIVE_PRICE_AXIS_TAG_SIZING.trade.height;

describe('native trade and price line layers', () => {
  it('wires native trade-line body and price-axis text surfaces', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const textFont = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });
    const layer = AnimatedTradeLine({
      axisFont,
      frame,
      geometry,
      line: positionLine,
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
      smallFont,
      textFont,
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
      tradeLabelHeight: 18,
    });

    const bodies = collectElementsByType(layer, NativeTradeLineLabelBody);
    const priceTexts = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(bodies).toHaveLength(1);
    expect(bodies[0].props.geometry.segments.map((segment: { displayText: string }) => segment.displayText)).toEqual([
      'Long',
    ]);
    expect(priceTexts).toHaveLength(1);
    expect(priceTexts[0].props.text.value).toBe('63,777.0');
    expect(priceTexts[0].props.maxCharacters).toBeGreaterThan(0);
  });

  function orderDrag(activeObjectId: string, price: number) {
    return {
      active: shared(true),
      activeObjectId: shared(activeObjectId),
      activePrice: shared(price),
      startPrice: shared(price),
      pricePerPixel: shared(1),
    };
  }

  // A dragged tag leaves the de-overlap stack and floats: two things have to
  // hold together or it draws twice, or not at all.
  it('hands the dragged line its tag over to the floating overlay', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const props = {
      axisFont,
      frame,
      geometry,
      line: positionLine,
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
      smallFont: matchFont({ fontSize: 10 }),
      textFont: matchFont({ fontSize: 11 }),
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
      tradeLabelHeight: 18,
    };
    const idle = AnimatedTradeLine({ ...props, dragState: orderDrag('', 0) });
    const dragging = AnimatedTradeLine({ ...props, dragState: orderDrag(geometry.objectId, 63_800) });
    const tagOpacity = (layer: ReturnType<typeof AnimatedTradeLine>) => {
      const boxes = collectElementsByType(layer, NativePriceAxisTagBox);
      // Innermost enclosing group: the outer one carries the whole line's
      // visibility, the inner one is the tag's own gate.
      const groups = collectElementsByType(layer, Group).filter((candidate) =>
        collectElementsByType(candidate, NativePriceAxisTagBox).includes(boxes[boxes.length - 1]),
      );
      return groups[groups.length - 1]?.props.opacity;
    };

    expect(sharedValueOf<number>(tagOpacity(idle))).toBe(1);
    expect(sharedValueOf<number>(tagOpacity(dragging))).toBe(0);
  });

  it('pins the floating drag tag to the drag price instead of a stacked position', () => {
    const overlay = AnimatedTradeLineDragTag({
      axisFont: matchFont({ fontSize: 11 }),
      color: '#18aee8',
      dragState: orderDrag(geometry.objectId, 63_500),
      frame,
      geometry,
      pricePrecision: 0.1,
      sharedViewport,
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
    });
    const box = collectElementsByType(overlay, NativePriceAxisTagBox)[0];
    const expectedY = frame.mainPane.top + ((64_000 - 63_500) / (64_000 - 63_000)) * frame.mainPane.height;

    expect(sharedValueOf<number>(box.props.y) + sharedValueOf<number>(box.props.height) / 2).toBeCloseTo(expectedY, 4);
  });

  it('hides the floating drag tag when nothing is being dragged', () => {
    const overlay = AnimatedTradeLineDragTag({
      axisFont: matchFont({ fontSize: 11 }),
      color: '#18aee8',
      dragState: orderDrag('', 0),
      frame,
      geometry,
      pricePrecision: 0.1,
      sharedViewport,
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
    });

    expect(sharedValueOf<number>(collectElementsByType(overlay, Group)[0].props.opacity)).toBe(0);
  });

  it('renders full trade-line price-axis text when the tag grows left of the axis lane', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const textFont = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });
    const wideGeometry: NativeTradeLineGeometry = {
      ...geometry,
      priceLabelText: '63,777.000000',
      priceLabelX: 250,
      priceLabelWidth: 136,
      rightLineEndX: 248,
    };
    const layer = AnimatedTradeLine({
      axisFont,
      frame,
      geometry: wideGeometry,
      line: positionLine,
      pricePrecision: 0.000001,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
      smallFont,
      textFont,
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
      tradeLabelHeight: 18,
    });

    const axisTag = collectElementsByType(layer, NativePriceAxisTagBox)[0];
    const priceText = collectElementsByType(layer, NativePriceAxisTagAnimatedText)[0];

    expect(priceText.props.text.value).toBe('63,777.000000');
    expect(priceText.props.text.value).not.toContain('...');
    expect(sharedValueOf<number>(axisTag.props.x)).toBeLessThan(frame.priceAxisLeft);
  });

  it('uses resolved native price-axis tag centers only for trade-line axis tags', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const textFont = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });
    const projectedY = 24 + ((64000 - 63777) / 1000) * 364;
    const layer = AnimatedTradeLine({
      axisFont,
      frame,
      geometry,
      line: positionLine,
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([
        {
          id: getNativeTradeLineTagId('position', 'position-btc'),
          originalY: 105,
          centerY: 140,
          height: 18,
        },
      ]),
      sharedViewport,
      smallFont,
      textFont,
      tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
      tradeLabelHeight: 18,
    });

    const horizontalLineYs = collectElementsByType(layer, SkiaLine)
      .map((element) => {
        const p1 = sharedValueOf<{ x: number; y: number }>(element.props.p1);
        const p2 = sharedValueOf<{ x: number; y: number }>(element.props.p2);
        return p1.y === p2.y ? p1.y : null;
      })
      .filter((value): value is number => value !== null);
    const body = collectElementsByType(layer, NativeTradeLineLabelBody)[0];
    const axisTag = collectElementsByType(layer, NativePriceAxisTagBox)[0];

    expect(horizontalLineYs[0]).toBeCloseTo(projectedY);
    expect(horizontalLineYs).not.toContain(140);
    expect(sharedValueOf<number>(body.props.labelY)).toBeCloseTo(projectedY - 9);
    expect(sharedValueOf<number>(axisTag.props.y)).toBe(140 - TRADE_AXIS_TAG_HEIGHT / 2);
  });

  it('wires current-price axis tag primary and countdown text surfaces', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const nowMs = shared(0);
    const line: PriceLine = {
      id: 'last-price',
      price: 63777,
      lineStyle: 'dotted',
      color: '#12c48b',
      label: {
        primaryText: '63,777.0',
      },
      countdownToTime: 10_000,
      renderLineOnCanvas: true,
      showAxisTag: true,
    };

    const layer = AnimatedPriceLine({
      axisFont,
      bracketDragState: {
        activeObjectId: shared(null),
        activeObjectType: shared(null),
        activeActionType: shared(null),
        activePrice: shared(0),
        startPrice: shared(0),
        startY: shared(0),
      },
      frame,
      line,
      nowMs,
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });

    const staticTexts = collectElementsByType(layer, NativePriceAxisTagStaticText);
    const animatedTexts = collectElementsByType(layer, NativePriceAxisTagAnimatedText);
    const axisTag = collectElementsByType(layer, NativePriceAxisTagBox)[0];

    expect(staticTexts.map((element) => element.props.text)).toEqual(['63,777.0']);
    expect(animatedTexts).toHaveLength(1);
    expect(sharedValueOf<string>(animatedTexts[0].props.text)).toBe('00:10');
    expect(sharedValueOf<number>(animatedTexts[0].props.x)).toBe(
      sharedValueOf<number>(axisTag.props.x) +
        Math.max(
          0,
          (sharedValueOf<number>(axisTag.props.width) -
            '00:10'.length * measureNativeSkiaAxisCharacterWidth(axisFont)) /
            2,
        ),
    );

    nowMs.value = 5_000;
    expect(sharedValueOf<string>(animatedTexts[0].props.text)).toBe('00:05');
  });

  // `filled` is web's flag for a solid tag rather than an outline one. Native
  // ignored it and always filled, so the tags sat over the grid labels behind.
  // Unfilled still keeps the shared dark backing every other tag in the lane
  // uses - without it the grid reads straight through the tag.
  it('backs an unfilled price-axis tag like every other tag in the lane', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const base: PriceLine = {
      id: 'last-price',
      price: 63777,
      lineStyle: 'dotted',
      color: '#12c48b',
      label: { primaryText: '63,777.0' },
      renderLineOnCanvas: true,
      showAxisTag: true,
    };
    const render = (line: PriceLine) =>
      AnimatedPriceLine({
        axisFont,
        bracketDragState: {
          activeObjectId: shared(null),
          activeObjectType: shared(null),
          activeActionType: shared(null),
          activePrice: shared(0),
          startPrice: shared(0),
          startY: shared(0),
        },
        frame,
        line,
        nowMs: shared(0),
        pricePrecision: 0.1,
        resolvedPriceAxisTags: shared([]),
        sharedViewport,
      });

    const outline = collectElementsByType(render(base), NativePriceAxisTagBox)[0];
    const solid = collectElementsByType(
      render({ ...base, label: { ...base.label, filled: true } }),
      NativePriceAxisTagBox,
    )[0];

    expect(outline.props.backgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(outline.props.borderColor).toBe('#12c48b');
    expect(solid.props.backgroundColor).toBe('rgba(18, 196, 139, 0.88)');
  });

  it('uses resolved native price-axis tag centers for price-line labels', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const line: PriceLine = {
      id: 'last-price',
      price: 63777,
      lineStyle: 'dotted',
      color: '#12c48b',
      label: {
        primaryText: '63,777.0',
      },
      renderLineOnCanvas: true,
      showAxisTag: true,
    };

    const layer = AnimatedPriceLine({
      axisFont,
      bracketDragState: {
        activeObjectId: shared(null),
        activeObjectType: shared(null),
        activeActionType: shared(null),
        activePrice: shared(0),
        startPrice: shared(0),
        startY: shared(0),
      },
      frame,
      line,
      nowMs: shared(0),
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([
        {
          id: getNativePriceLineTagId('last-price'),
          originalY: 105,
          centerY: 140,
          height: 22,
        },
      ]),
      sharedViewport,
    });

    const priceLine = collectElementsByType(layer, SkiaLine)[0];
    const axisTag = collectElementsByType(layer, NativePriceAxisTagBox)[0];
    const lineY = sharedValueOf<{ x: number; y: number }>(priceLine.props.p1).y;

    expect(sharedValueOf<number>(axisTag.props.y)).toBe(140 - PRICE_AXIS_TAG_HEIGHT / 2);
    expect(lineY).not.toBe(140);
  });

  it('keeps current-price line geometry live on shared viewport changes', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const line: PriceLine = {
      id: 'last-price',
      price: 63777,
      lineStyle: 'dotted',
      color: '#12c48b',
      label: {
        primaryText: '63,777.0',
      },
      renderLineOnCanvas: true,
      showAxisTag: true,
    };
    const bracketDragState = {
      activeObjectId: shared(null),
      activeObjectType: shared(null),
      activeActionType: shared(null),
      activePrice: shared(0),
      startPrice: shared(0),
      startY: shared(0),
    };

    const liveViewport = {
      startTime: shared(0),
      endTime: shared(100),
      priceMin: shared(63000),
      priceMax: shared(64000),
    };
    const layer = AnimatedPriceLine({
      axisFont,
      bracketDragState,
      frame,
      line,
      nowMs: shared(0),
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport: liveViewport,
    });

    const priceLine = collectElementsByType(layer, SkiaLine)[0];
    const axisTag = collectElementsByType(layer, NativePriceAxisTagBox)[0];
    const initialStart = sharedValueOf<{ x: number; y: number }>(priceLine.props.p1);
    const initialTagY = sharedValueOf<number>(axisTag.props.y);
    liveViewport.priceMin.value = 62000;
    liveViewport.priceMax.value = 65000;
    const updatedStart = sharedValueOf<{ x: number; y: number }>(priceLine.props.p1);
    const updatedTagY = sharedValueOf<number>(axisTag.props.y);

    expect(initialStart.x).toBe(frame.contentLeft);
    expect(updatedStart.x).toBe(frame.contentLeft);
    expect(updatedStart.y).not.toBe(initialStart.y);
    expect(updatedTagY).not.toBe(initialTagY);
  });

  it('wires static secondary price-axis text without the countdown surface', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const line: PriceLine = {
      id: 'oracle-price',
      price: 63777,
      lineStyle: 'solid',
      color: '#8b929f',
      label: {
        primaryText: '63,777.0',
        secondaryText: 'Oracle',
      },
      renderLineOnCanvas: true,
      showAxisTag: true,
    };

    const layer = AnimatedPriceLine({
      axisFont,
      bracketDragState: {
        activeObjectId: shared(null),
        activeObjectType: shared(null),
        activeActionType: shared(null),
        activePrice: shared(0),
        startPrice: shared(0),
        startY: shared(0),
      },
      frame,
      line,
      nowMs: shared(0),
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });

    const staticTexts = collectElementsByType(layer, NativePriceAxisTagStaticText);
    const animatedTexts = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(staticTexts).toHaveLength(2);
    expect(staticTexts.map((element) => element.props.text)).toEqual(['63,777.0', 'Oracle']);
    expect(sharedValueOf<number>(staticTexts[1].props.y)).toBeGreaterThan(
      sharedValueOf<number>(staticTexts[0].props.y),
    );
    expect(animatedTexts).toHaveLength(0);
  });
});
