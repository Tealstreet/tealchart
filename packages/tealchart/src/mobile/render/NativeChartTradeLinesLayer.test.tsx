import type { ReactElement, ReactNode } from 'react';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeBracketDragSharedValues, NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { AnimatedBracketDragPreview } from './NativeBracketDragPreviewLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeChartTradeLinesLayer } from './NativeChartTradeLinesLayer';
import { AnimatedPriceLine } from './NativePriceLineLayer';
import { AnimatedTradeLine } from './NativeTradeLineLayer';

function shared<T>(value: T) {
  return { value };
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

function createGeometry(objectType: 'order' | 'position', objectId: string): NativeTradeLineGeometry {
  return {
    objectType,
    objectId,
    price: objectType === 'order' ? 63500 : 63777,
    fitting: {
      mode: 'full',
      hiddenActionTypes: [],
      hiddenSegmentIndexes: [],
      truncatedSegmentIndexes: [],
    },
    priceLabelText: objectType === 'order' ? '63,500.0' : '63,777.0',
    priceLabelTextX: 302,
    labelX: 80,
    labelWidth: 120,
    leftLineStartX: 62,
    leftLineEndX: 78,
    rightLineStartX: 202,
    rightLineEndX: 300,
    priceLabelX: 302,
    priceLabelWidth: 84,
    segments: [],
    buttons: [],
    dragZone: null,
    actionZones: [],
  };
}

describe('NativeChartTradeLinesLayer', () => {
  it('routes price, order, position, and bracket-preview layers in native z-order', () => {
    const axisFont = matchFont({ fontSize: 11 });
    const textFont = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });
    const orderDragState: NativeOrderDragSharedValues = {
      activeObjectId: shared(''),
      activePrice: shared(0),
    };
    const bracketDragState: NativeBracketDragSharedValues = {
      activeObjectId: shared(''),
      activeObjectType: shared(''),
      activeBracketType: shared(''),
      activePrice: shared(0),
      activePartialPercent: shared(100),
      activePartialEnabled: shared(false),
      activeColor: shared(''),
    };
    const extraPriceLines: NativeRenderablePriceLine[] = [
      {
        id: 'oracle',
        price: 63800,
        color: '#8b929f',
        lineStyle: 'solid',
        type: 'price',
        label: { primaryText: '63,800' },
        renderLineOnCanvas: true,
        showAxisTag: true,
      },
    ];
    const orderLine = { id: 'generated-order', orderId: 'exchange-order', price: 63500 } as OrderLineRenderData;
    const missingOrderLine = { id: 'missing-order', orderId: 'missing-order', price: 63400 } as OrderLineRenderData;
    const positionLine = {
      id: 'generated-position',
      positionId: 'position-btc',
      price: 63777,
    } as PositionLineRenderData;

    const resolvedPriceAxisTags = shared([]);
    const layer = NativeChartTradeLinesLayer({
      axisFont,
      bracketDragState,
      extraPriceLines,
      frame,
      getOrderObjectId: (line) => line.orderId ?? line.id,
      getPositionObjectId: (line) => line.positionId ?? line.id,
      lineSnapshot: {
        orderLines: [orderLine, missingOrderLine],
        positionLines: [positionLine],
      },
      nowMs: shared(0),
      orderDragState,
      pricePrecision: 0.1,
      resolvedPriceAxisTags,
      sharedViewport,
      smallFont,
      textFont,
      tradeLabelHeight: 18,
      tradeLineGeometries: [createGeometry('order', 'exchange-order'), createGeometry('position', 'position-btc')],
    });
    const rendered: ReactElement[] = [];
    walkElements(layer, (element) => {
      if (
        element.type === AnimatedPriceLine ||
        element.type === AnimatedTradeLine ||
        element.type === AnimatedBracketDragPreview
      ) {
        rendered.push(element);
      }
    });

    expect(rendered).toHaveLength(4);
    expect(rendered.map((element) => element.type)).toEqual([
      AnimatedPriceLine,
      AnimatedTradeLine,
      AnimatedTradeLine,
      AnimatedBracketDragPreview,
    ]);
    expect(rendered[0].props.line.id).toBe('oracle');
    expect(rendered[0].props.resolvedPriceAxisTags).toBe(resolvedPriceAxisTags);
    expect(rendered[1].props.geometry.objectId).toBe('exchange-order');
    expect(rendered[1].props.dragState).toBe(orderDragState);
    expect(rendered[2].props.geometry.objectId).toBe('position-btc');
    expect(rendered[2].props.dragState).toBeUndefined();
    expect(rendered[3].props.dragState).toBe(bracketDragState);
  });
});
