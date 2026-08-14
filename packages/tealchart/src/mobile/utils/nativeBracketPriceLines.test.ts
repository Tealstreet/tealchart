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
