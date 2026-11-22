import type { TealchartApi } from '../../TealchartApi';
import type { OrderLineRenderData } from '../../types';
import type { NativeBracketDragInteractionState, NativeOrderDragInteractionState } from './nativeOemsDragState';
import type { NativeOemsLineRuntimeInput } from './useNativeOemsLineRuntime';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNativeOemsLineRuntime } from './useNativeOemsLineRuntime';

const source = vi.hoisted(() => ({ orders: [] as OrderLineRenderData[] }));
vi.mock('../../TealchartApi', () => ({
  getTealchartApiLineRenderSnapshot: () => ({ orderLines: source.orders, positionLines: [], executionLines: [] }),
}));

afterEach(cleanup);

function shared<T>(value: T) {
  return { value } as { value: T };
}

function order(id: string, price: number): OrderLineRenderData {
  return { id, price, cancellable: true, brackets: {}, callbacks: {} } as OrderLineRenderData;
}

function fixture() {
  source.orders = [order('order_1', 55_300), order('order_2', 55_197)];
  const orderDragState = {
    active: shared(false),
    activeObjectId: shared(''),
    activePrice: shared(0),
    startPrice: shared(0),
    pricePerPixel: shared(0),
    touchArmed: shared(false),
    touchSequence: shared(0),
    touchStartedAt: shared(0),
  } as unknown as NativeOrderDragInteractionState;
  const bracket = {
    active: shared(false),
    activeObjectId: shared(''),
    activeObjectType: shared(''),
    activeBracketType: shared(''),
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
    activeLadderDirection: shared(1),
    activeColor: shared(''),
    activeLineColor: shared(''),
    startPrice: shared(0),
    pricePerPixel: shared(0),
  } as unknown as NativeBracketDragInteractionState;
  const input: NativeOemsLineRuntimeInput = {
    bracketDragInteractionState: bracket,
    chartApi: {} as TealchartApi,
    forceUpdate: vi.fn(),
    orderDragState,
    pricePrecision: 0.1,
  };
  const hook = renderHook((props: NativeOemsLineRuntimeInput) => useNativeOemsLineRuntime(props), {
    initialProps: input,
  });
  act(() => hook.result.current.syncNativeOemsDragStateForSnapshot());
  /** The TP partial picker open on order_1 with its gesture still claiming the touch. */
  const openPicker = () => {
    bracket.active.value = true;
    bracket.activeObjectId.value = 'order_1';
    bracket.activeObjectType.value = 'order';
    bracket.activeBracketType.value = 'tp';
    bracket.activePrice.value = 55_300;
    bracket.activePartialEnabled.value = true;
  };
  const snapshot = (orders: OrderLineRenderData[]) => {
    source.orders = orders;
    hook.rerender(input);
    act(() => hook.result.current.syncNativeOemsDragStateForSnapshot());
  };
  return { bracket, openPicker, snapshot };
}

// AGT-123: the picker (and its dashed +0.00% line at the order's price) stayed on
// the chart for minutes after its order was cancelled, because nothing may retire a
// bracket drag while `active` - and this one was `active` with no finger down.
describe('a bracket drag picker whose order set changed', () => {
  it('closes when its order is cancelled or filled', () => {
    const f = fixture();
    f.openPicker();

    f.snapshot([order('order_2', 55_197)]);

    expect(f.bracket.activeObjectId.value).toBe('');
    expect(f.bracket.active.value).toBe(false);
  });

  it('closes when any other order joins or leaves the set', () => {
    const f = fixture();
    f.openPicker();

    f.snapshot([order('order_1', 55_300)]);

    expect(f.bracket.activeObjectId.value).toBe('');
    expect(f.bracket.active.value).toBe(false);
  });

  it('stays open across a snapshot that leaves the order set unchanged', () => {
    const f = fixture();
    f.openPicker();

    f.snapshot([order('order_1', 55_300), order('order_2', 55_190)]);

    expect(f.bracket.activeObjectId.value).toBe('order_1');
    expect(f.bracket.active.value).toBe(true);
  });
});
