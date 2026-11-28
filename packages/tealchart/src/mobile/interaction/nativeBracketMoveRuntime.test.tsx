import type { TealchartApi } from '../../TealchartApi';
import type { OrderLineRenderData } from '../../types';
import type { NativeOemsLineRuntimeInput } from './useNativeOemsLineRuntime';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNativeOemsLineRuntime } from './useNativeOemsLineRuntime';

const source = vi.hoisted(() => ({ orders: [] as OrderLineRenderData[] }));
vi.mock('../../TealchartApi', () => ({
  getTealchartApiLineRenderSnapshot: () => ({ orderLines: source.orders, positionLines: [], executionLines: [] }),
}));

afterEach(cleanup);

function fixture() {
  const onTPMoveEnd = vi.fn();
  source.orders = [
    {
      id: 'order-1',
      price: 100,
      cancellable: true,
      bracketsEditable: true,
      brackets: { takeProfit: 110 },
      callbacks: { onMove: vi.fn(), onTPMoveEnd },
    } as OrderLineRenderData,
  ];
  const value = <T,>(initial: T) => ({ value: initial });
  const state = {
    active: value(false),
    activeObjectId: value(''),
    activeObjectType: value(''),
    activeBracketType: value(''),
    activePrice: value(110),
    activeEntryPrice: value(100),
    activeDragStartX: value(0),
    activeDragStartY: value(0),
    activeDragCurrentY: value(0),
    activeDragCurrentX: value(0),
    activePositionNotional: value(0),
    activePositionIsLong: value(true),
    activePartialPercent: value(100),
    activePartialEnabled: value(false),
    activeLadderDirection: value(1),
    activeColor: value(''),
    activeLineColor: value(''),
    startPrice: value(110),
    pricePerPixel: value(1),
    touchSequence: value(0),
    touchStartedAt: value(0),
  };
  const input = {
    chartApi: {} as TealchartApi,
    forceUpdate: vi.fn(),
    pricePrecision: 0.1,
    orderDragState: {} as NativeOemsLineRuntimeInput['orderDragState'],
    bracketDragInteractionState: state as unknown as NativeOemsLineRuntimeInput['bracketDragInteractionState'],
  };
  const hook = renderHook((props: NativeOemsLineRuntimeInput) => useNativeOemsLineRuntime(props), {
    initialProps: input,
  });
  const touch = (sequence: number, startedAt = Date.now()) => {
    state.touchSequence.value = sequence;
    state.touchStartedAt.value = startedAt;
    state.activeObjectId.value = 'order-1';
    state.activeObjectType.value = 'order';
    state.active.value = true;
    return { sequence, startedAt };
  };
  const lift = () => {
    state.active.value = false;
  };
  return { ...hook, input, state, touch, lift, onTPMoveEnd };
}

describe('native bracket move hook admission', () => {
  it('commits a leased TP drag once and accepts the next touch', () => {
    const f = fixture();
    const first = f.touch(1);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', first));
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, first));
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 113, undefined, first));
    expect(f.onTPMoveEnd).toHaveBeenCalledExactlyOnceWith(112, undefined);
    const second = f.touch(2);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', second));
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 115, undefined, second));
    expect(f.onTPMoveEnd.mock.calls).toEqual([
      [112, undefined],
      [115, undefined],
    ]);
  });

  it('refuses a commit that no admitted touch began', () => {
    const f = fixture();
    const gesture = f.touch(1);
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, gesture));
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
    expect(f.state.activeObjectId.value).toBe('');
  });

  it('refuses a commit while the finger is still down', () => {
    const f = fixture();
    const gesture = f.touch(1);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', gesture));
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, gesture));
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
  });

  it('refuses to redirect an admitted touch to replacement callbacks', () => {
    const f = fixture();
    const gesture = f.touch(1);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', gesture));
    const replacement = vi.fn();
    source.orders = [{ ...source.orders[0], callbacks: { onMove: vi.fn(), onTPMoveEnd: replacement } }];
    f.rerender(f.input);
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, gesture));
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
  });

  it('does not adopt an old touch after chart replacement', () => {
    const f = fixture();
    const first = f.touch(1);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', first));
    f.rerender({ ...f.input, chartApi: {} as TealchartApi });
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', first));
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, first));
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
  });

  it('refuses a touch first delivered after the lease expired', () => {
    const f = fixture();
    const stale = f.touch(1, Date.now() - 61_000);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', stale));
    f.lift();
    act(() => f.result.current.commitBracketMove('order', 'order-1', 'tp', 112, undefined, stale));
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
  });

  it('refuses the commit after the hook unmounts', () => {
    const f = fixture();
    const gesture = f.touch(1);
    act(() => f.result.current.beginBracketMove('order', 'order-1', 'tp', gesture));
    const { commitBracketMove } = f.result.current;
    f.unmount();
    f.lift();
    commitBracketMove('order', 'order-1', 'tp', 112, undefined, gesture);
    expect(f.onTPMoveEnd).not.toHaveBeenCalled();
  });
});
