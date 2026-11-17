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

function fixture(preview = true) {
  const onMoving = vi.fn();
  const onMove = vi.fn();
  source.orders = [
    {
      id: 'order-1',
      price: 100,
      cancellable: true,
      brackets: {},
      callbacks: preview ? { onMoving, onMove } : { onMove },
    } as OrderLineRenderData,
  ];
  const state = {
    active: { value: false },
    activeObjectId: { value: '' },
    activePrice: { value: 100 },
    startPrice: { value: 100 },
    pricePerPixel: { value: 1 },
    touchArmed: { value: false },
    touchSequence: { value: 0 },
    touchStartedAt: { value: 0 },
  };
  const input = {
    chartApi: {} as TealchartApi,
    forceUpdate: vi.fn(),
    pricePrecision: 0.1,
    orderDragState: state,
    bracketDragInteractionState: {} as NativeOemsLineRuntimeInput['bracketDragInteractionState'],
  };
  const hook = renderHook((props: NativeOemsLineRuntimeInput) => useNativeOemsLineRuntime(props), {
    initialProps: input,
  });
  const touch = (sequence: number, startedAt = Date.now()) => {
    state.touchSequence.value = sequence;
    state.touchStartedAt.value = startedAt;
    state.activeObjectId.value = 'order-1';
    state.active.value = true;
    return { sequence, startedAt };
  };
  return { ...hook, input, state, touch, onMoving, onMove };
}

describe('native order move hook admission', () => {
  it('commits once when the admitted line has onMove without the optional preview callback', () => {
    const f = fixture(false);
    const first = f.touch(1);
    act(() => f.result.current.beginOrderMove('order-1', 100, first));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 110, first));
    f.rerender(f.input);
    act(() => {
      f.result.current.beginOrderMove('order-1', 100, first);
      f.result.current.commitOrderMove('order-1', 120, first);
    });
    expect(f.onMoving).not.toHaveBeenCalled();
    expect(f.onMove).toHaveBeenCalledExactlyOnceWith(110);
    const second = f.touch(2);
    act(() => f.result.current.beginOrderMove('order-1', 110, second));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 115, second));
    expect(f.onMove.mock.calls).toEqual([[110], [115]]);
  });

  it('consumes once across a rerender and accepts a distinct next touch', () => {
    const f = fixture();
    const first = f.touch(1);
    act(() => f.result.current.beginOrderMove('order-1', 100, first));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 110, first));
    f.rerender(f.input);
    act(() => {
      f.result.current.beginOrderMove('order-1', 100, first);
      f.result.current.commitOrderMove('order-1', 120, first);
    });
    expect(f.onMoving).toHaveBeenCalledTimes(1);
    expect(f.onMove).toHaveBeenCalledExactlyOnceWith(110);
    const second = f.touch(2);
    act(() => f.result.current.beginOrderMove('order-1', 100, second));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 115, second));
    expect(f.onMove.mock.calls).toEqual([[110], [115]]);
  });

  it('refuses callbacks first delivered 61 seconds after their original touch', () => {
    const f = fixture();
    const stale = f.touch(1, Date.now() - 61_000);
    act(() => f.result.current.beginOrderMove('order-1', 100, stale));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 120, stale));
    expect(f.onMoving).not.toHaveBeenCalled();
    expect(f.onMove).not.toHaveBeenCalled();
  });

  it('does not adopt an old touch after chart replacement', () => {
    const f = fixture();
    const first = f.touch(1);
    act(() => f.result.current.beginOrderMove('order-1', 100, first));
    f.rerender({ ...f.input, chartApi: {} as TealchartApi });
    act(() => f.result.current.beginOrderMove('order-1', 100, first));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 120, first));
    expect(f.onMove).not.toHaveBeenCalled();
    const second = f.touch(2);
    act(() => f.result.current.beginOrderMove('order-1', 100, second));
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 115, second));
    expect(f.onMove).toHaveBeenCalledExactlyOnceWith(115);
  });

  it('refuses to redirect an admitted touch to replacement callbacks', () => {
    const f = fixture();
    const gesture = f.touch(1);
    act(() => f.result.current.beginOrderMove('order-1', 100, gesture));
    const replacement = vi.fn();
    source.orders = [{ ...source.orders[0], callbacks: { onMoving: vi.fn(), onMove: replacement } }];
    f.rerender(f.input);
    f.state.active.value = false;
    act(() => f.result.current.commitOrderMove('order-1', 120, gesture));
    expect(f.onMove).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
  });

  it('fails closed without throwing for retained state missing touch shared values', () => {
    const f = fixture();
    const legacy = f.state as NativeOemsLineRuntimeInput['orderDragState'];
    delete legacy.touchArmed;
    delete legacy.touchSequence;
    delete legacy.touchStartedAt;
    f.rerender(f.input);
    expect(() =>
      act(() => {
        f.result.current.beginOrderMove('order-1', 100, { sequence: 1, startedAt: Date.now() });
        f.result.current.commitOrderMove('order-1', 120, { sequence: 1, startedAt: Date.now() });
        f.result.current.clearNativeOrderDrag();
      }),
    ).not.toThrow();
    expect(f.onMoving).not.toHaveBeenCalled();
    expect(f.onMove).not.toHaveBeenCalled();
  });
});
