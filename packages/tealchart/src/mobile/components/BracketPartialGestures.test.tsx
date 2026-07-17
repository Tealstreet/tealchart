import type { OrderLineRenderData, PositionLineRenderData, Viewport } from '../../types';
import type { ChartDimensions } from '../utils/coordinates';

import { render } from '@testing-library/react';
import { Gesture } from 'react-native-gesture-handler';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrderLineComponent } from './OrderLineComponent';
import { PositionLineComponent } from './PositionLineComponent';

interface MockGesture {
  __callbacks?: Record<string, unknown[]>;
}

interface MockGestureFactory {
  mockClear(): void;
  mock: {
    results: Array<{ value: MockGesture }>;
  };
}

const viewport: Viewport = {
  startTime: 0,
  endTime: 1_000,
  priceMin: 90,
  priceMax: 110,
};

const dimensions: ChartDimensions = {
  width: 360,
  height: 240,
  margins: {
    top: 12,
    right: 48,
    bottom: 24,
    left: 8,
  },
};

function runGestureCallback(gesture: MockGesture, name: string, ...args: unknown[]): void {
  const callback = gesture.__callbacks?.[name]?.[0];
  if (typeof callback !== 'function') {
    throw new Error(`Expected ${name} gesture callback to be registered`);
  }

  callback(...args);
}

function getPanGesture(index: number): MockGesture {
  const panMock = Gesture.Pan as unknown as MockGestureFactory;
  const gesture = panMock.mock.results[index]?.value;
  if (!gesture) throw new Error(`Expected pan gesture ${index} to be registered`);
  return gesture;
}

function createOrderLine(callbacks: OrderLineRenderData['callbacks']): OrderLineRenderData {
  return {
    id: 'order-1',
    price: 100,
    quantity: '0.001',
    quantityShort: '0.001',
    text: 'Buy Limit',
    textShort: 'Buy',
    lineColor: '#3b82f6',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 50,
    extendLeft: true,
    editable: true,
    cancellable: true,
    bodyBackgroundColor: '#3b82f6',
    bodyTextColor: '#ffffff',
    bodyBorderColor: '#3b82f6',
    quantityBackgroundColor: '#3b82f6',
    quantityTextColor: '#ffffff',
    quantityBorderColor: '#3b82f6',
    cancelButtonBackgroundColor: '#3b82f6',
    cancelButtonIconColor: '#ffffff',
    cancelButtonBorderColor: '#3b82f6',
    cancelTooltip: 'Cancel',
    modifyTooltip: 'Modify',
    brackets: {},
    partialEnabled: true,
    callbacks,
  };
}

function createPositionLine(callbacks: PositionLineRenderData['callbacks']): PositionLineRenderData {
  return {
    id: 'position-1',
    price: 100,
    quantity: '0.001',
    quantityShort: '0.001',
    text: 'Long',
    textShort: 'Long',
    lineColor: '#3b82f6',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 50,
    extendLeft: true,
    bodyBackgroundColor: '#3b82f6',
    bodyTextColor: '#ffffff',
    bodyBorderColor: '#3b82f6',
    quantityBackgroundColor: '#3b82f6',
    quantityTextColor: '#ffffff',
    quantityBorderColor: '#3b82f6',
    closeable: true,
    closeButtonBackgroundColor: '#3b82f6',
    closeButtonIconColor: '#ffffff',
    closeButtonBorderColor: '#3b82f6',
    reversible: true,
    reverseButtonBackgroundColor: '#3b82f6',
    reverseButtonIconColor: '#ffffff',
    reverseButtonBorderColor: '#3b82f6',
    closeTooltip: 'Close',
    protectTooltipText: 'Protect',
    pnl: '0.00',
    pnlShort: '0.00',
    profitState: 'neutral',
    brackets: {},
    partialEnabled: true,
    positionData: {
      entryPrice: 100,
      notional: 1,
      isLong: true,
    },
    callbacks,
  };
}

describe('mobile TP/SL partial bracket gestures', () => {
  afterEach(() => {
    (Gesture.Pan as unknown as MockGestureFactory).mockClear();
  });

  it('passes partial percentages for mobile order bracket drags', () => {
    const onTPMove = vi.fn();
    const onTPMoveEnd = vi.fn();
    const onSLMove = vi.fn();
    const onSLMoveEnd = vi.fn();
    const onTPClick = vi.fn();
    const onTPMovePreview = vi.fn();
    const onSLMovePreview = vi.fn();

    render(
      <OrderLineComponent
        dimensions={dimensions}
        onSLMovePreview={onSLMovePreview}
        onTPMovePreview={onTPMovePreview}
        order={createOrderLine({ onSLMove, onSLMoveEnd, onTPClick, onTPMove, onTPMoveEnd })}
        viewport={viewport}
      />,
    );

    runGestureCallback(getPanGesture(0), 'onUpdate', { translationX: 90, translationY: 0 });
    runGestureCallback(getPanGesture(0), 'onEnd', { translationX: 90, translationY: 0 });
    runGestureCallback(getPanGesture(1), 'onUpdate', { translationX: 30, translationY: 12 });
    runGestureCallback(getPanGesture(1), 'onEnd', { translationX: 30, translationY: 12 });

    expect(onTPMove).toHaveBeenLastCalledWith(expect.any(Number), 50);
    expect(onTPMoveEnd).toHaveBeenLastCalledWith(expect.any(Number), 50);
    expect(onTPMovePreview).toHaveBeenLastCalledWith('order-1', expect.any(Number), 50);
    expect(onTPClick).not.toHaveBeenCalled();
    expect(onSLMove).toHaveBeenLastCalledWith(expect.any(Number), 75);
    expect(onSLMoveEnd).toHaveBeenLastCalledWith(expect.any(Number), 75);
    expect(onSLMovePreview).toHaveBeenLastCalledWith('order-1', expect.any(Number), 75);
  });

  it('passes partial percentages for mobile position bracket drags', () => {
    const onTPMove = vi.fn();
    const onTPMoveEnd = vi.fn();
    const onSLMove = vi.fn();
    const onSLMoveEnd = vi.fn();
    const onSLClick = vi.fn();
    const onTPMovePreview = vi.fn();
    const onSLMovePreview = vi.fn();

    render(
      <PositionLineComponent
        dimensions={dimensions}
        onSLMovePreview={onSLMovePreview}
        onTPMovePreview={onTPMovePreview}
        position={createPositionLine({ onSLClick, onSLMove, onSLMoveEnd, onTPMove, onTPMoveEnd })}
        viewport={viewport}
      />,
    );

    runGestureCallback(getPanGesture(0), 'onUpdate', { translationX: 150, translationY: 12 });
    runGestureCallback(getPanGesture(0), 'onEnd', { translationX: 150, translationY: 12 });
    runGestureCallback(getPanGesture(1), 'onUpdate', { translationX: 210, translationY: 0 });
    runGestureCallback(getPanGesture(1), 'onEnd', { translationX: 210, translationY: 0 });

    expect(onTPMove).toHaveBeenLastCalledWith(expect.any(Number), 25);
    expect(onTPMoveEnd).toHaveBeenLastCalledWith(expect.any(Number), 25);
    expect(onTPMovePreview).toHaveBeenLastCalledWith('position-1', expect.any(Number), 25);
    expect(onSLMove).toHaveBeenLastCalledWith(expect.any(Number), 10);
    expect(onSLMoveEnd).toHaveBeenLastCalledWith(expect.any(Number), 10);
    expect(onSLMovePreview).toHaveBeenLastCalledWith('position-1', expect.any(Number), 10);
    expect(onSLClick).not.toHaveBeenCalled();
  });
});
