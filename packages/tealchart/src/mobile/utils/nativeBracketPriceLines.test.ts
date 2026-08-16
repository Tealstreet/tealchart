import type { SharedValue } from 'react-native-reanimated';
import type { OrderLineRenderData } from '../../types';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';

import { describe, expect, it } from 'vitest';

import {
  createNativeBracketPriceLines,
  isNativeBracketPriceLineRefActive,
} from './nativeBracketPriceLines';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function bracketDragState(objectId = '', bracketType: 'tp' | 'sl' | '' = 'tp'): NativeBracketDragSharedValues {
  return {
    activeObjectId: shared(objectId),
    activeObjectType: shared(objectId ? 'order' : ''),
    activeBracketType: shared(bracketType),
    activePrice: shared(0),
    activeEntryPrice: shared(0),
    activeDragStartX: shared(0),
    activeDragCurrentX: shared(0),
    activeDragStartY: shared(0),
    activeDragCurrentY: shared(0),
    activePositionNotional: shared(0),
    activePositionIsLong: shared(true),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared('#00a8d8'),
  };
}

describe('native bracket price lines', () => {
  it('adds stable native bracket metadata to generated TP and SL price lines', () => {
    const lines = createNativeBracketPriceLines({
      objectType: 'order',
      objectId: 'stable-order-id',
      line: {
        id: 'adapter-id',
        price: 100,
        brackets: {
          takeProfit: 120,
          stopLoss: 90,
        },
      } as OrderLineRenderData,
      pricePrecision: 0.1,
      positiveColor: '#12c48b',
    });

    expect(lines.map((line) => ({ id: line.id, primaryText: line.label.primaryText, bracketRef: line.nativeBracketRef }))).toEqual([
      {
        id: 'adapter-id-tp',
        primaryText: '120.0',
        bracketRef: {
          objectType: 'order',
          objectId: 'stable-order-id',
          bracketType: 'tp',
        },
      },
      {
        id: 'adapter-id-sl',
        primaryText: '90.0',
        bracketRef: {
          objectType: 'order',
          objectId: 'stable-order-id',
          bracketType: 'sl',
        },
      },
    ]);
  });

  // A bracket IS an order. While an optimistic bracket is pending, the host's
  // own optimistic order row lands at the same price, and the chart drew the
  // price twice - dashed in the bracket colour and again as the order line.
  describe('order line dedupe', () => {
    const bracketedLine = {
      id: 'adapter-id',
      price: 100,
      brackets: { takeProfit: 120, stopLoss: 90 },
    } as OrderLineRenderData;

    const build = (orderLines: OrderLineRenderData[], priceTolerance = 0.5) =>
      createNativeBracketPriceLines({
        objectType: 'position',
        objectId: 'position-1',
        line: bracketedLine,
        pricePrecision: 0.1,
        positiveColor: '#12c48b',
        orderLines,
        priceTolerance,
      }).map((line) => line.id);

    it('drops a bracket already drawn by an order line at the same price', () => {
      expect(build([{ id: 'optimistic', price: 90 } as OrderLineRenderData])).toEqual(['adapter-id-tp']);
    });

    it('tolerates the venue rounding the price to its own tick', () => {
      expect(build([{ id: 'real', price: 90.4 } as OrderLineRenderData])).toEqual(['adapter-id-tp']);
    });

    it('keeps both brackets when no order line covers them', () => {
      expect(build([{ id: 'entry', price: 100 } as OrderLineRenderData])).toEqual([
        'adapter-id-tp',
        'adapter-id-sl',
      ]);
    });

    it('keeps every bracket when the caller passes no order lines', () => {
      expect(
        createNativeBracketPriceLines({
          objectType: 'position',
          objectId: 'position-1',
          line: bracketedLine,
          pricePrecision: 0.1,
          positiveColor: '#12c48b',
        }).map((line) => line.id),
      ).toEqual(['adapter-id-tp', 'adapter-id-sl']);
    });
  });

  it('matches active bracket drag state by object type, object id, and bracket type', () => {
    const bracketRef = {
      objectType: 'order' as const,
      objectId: 'order-1',
      bracketType: 'tp' as const,
    };

    expect(isNativeBracketPriceLineRefActive(undefined, bracketDragState('order-1'))).toBe(false);
    expect(isNativeBracketPriceLineRefActive(bracketRef, bracketDragState())).toBe(false);
    expect(isNativeBracketPriceLineRefActive(bracketRef, bracketDragState('other-order'))).toBe(false);
    expect(isNativeBracketPriceLineRefActive(bracketRef, bracketDragState('order-1', 'sl'))).toBe(false);
    expect(isNativeBracketPriceLineRefActive(bracketRef, bracketDragState('order-1', 'tp'))).toBe(true);
  });
});
