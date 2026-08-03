import type { ReactElement, ReactNode } from 'react';
import type { PositionLineRenderData, PriceLine } from '../../types';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { matchFont, Line as SkiaLine } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { getNativePriceLineTagId, getNativeTradeLineTagId } from '../utils/priceAxisTagSources';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  NativePriceAxisTagAnimatedText,
  NativePriceAxisTagBox,
  NativePriceAxisTagStaticText,
} from './NativePriceAxisTag';
import { AnimatedPriceLine } from './NativePriceLineLayer';
import { NativeTradeLineLabelBody } from './NativeTradeLineLabelBody';
import { AnimatedTradeLine } from './NativeTradeLineLayer';

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
    expect(sharedValueOf<number>(axisTag.props.y)).toBe(130);
  });

  it('wires current-price axis tag primary and countdown text surfaces', () => {
    const axisFont = matchFont({ fontSize: 11 });
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
      pricePrecision: 0.1,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });

    const staticTexts = collectElementsByType(layer, NativePriceAxisTagStaticText);
    const animatedTexts = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(staticTexts.map((element) => element.props.text)).toEqual(expect.arrayContaining(['63,777.0', '00:00']));
    expect(animatedTexts).toHaveLength(0);
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

    expect(sharedValueOf<number>(axisTag.props.y)).toBe(129);
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
