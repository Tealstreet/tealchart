import type { NativeAnalysisSelectorHandle } from './NativeAnalysisSelectorOverlay';

import React, { createRef } from 'react';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NativeAnalysisSelectorOverlay } from './NativeAnalysisSelectorOverlay';

const capture = vi.hoisted(() => ({
  gesture: null as null | { config: Record<string, unknown>; handlers: Record<string, (...args: any[]) => void> },
  layout: null as null | ((event: unknown) => void),
  appState: null as null | ((next: string) => void),
  defer: false,
  jobs: [] as (() => void)[],
}));
vi.mock('react-native-worklets', () => ({
  runOnJS:
    (callback: (...args: any[]) => void) =>
    (...args: any[]) => {
      if (capture.defer) capture.jobs.push(() => callback(...args));
      else callback(...args);
    },
}));
vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native')>();
  return {
    ...original,
    AppState: {
      addEventListener: (_: string, callback: (next: string) => void) => {
        capture.appState = callback;
        return { remove: vi.fn() };
      },
    },
    ScrollView: (props: any) => {
      capture.layout = props.onLayout;
      return React.createElement(original.ScrollView, props);
    },
  };
});
vi.mock('react-native-reanimated', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native-reanimated')>();
  return {
    ...original,
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useAnimatedReaction: (prepare: () => unknown, react: (next: unknown, previous: null) => void) => {
      const next = prepare();
      React.useEffect(() => react(next, null), [next]);
    },
  };
});
vi.mock('react-native-gesture-handler', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native-gesture-handler')>();
  return {
    ...original,
    GestureDetector: ({ children, gesture }: any) => {
      capture.gesture = gesture;
      return children;
    },
  };
});

afterEach(() => {
  cleanup();
  capture.defer = false;
  capture.jobs = [];
});
const frame = {
  identity: 'TEST:1:1',
  timeRange: { from: 1000, to: 2000 },
  priceRange: { from: 10, to: 20 },
  projectionLeft: 20,
  projectionRight: 1020,
  plot: { left: 20, top: 36, width: 940, height: 400 },
};
function fixture(initialHandler = true) {
  const ref = createRef<NativeAnalysisSelectorHandle>();
  const handler = vi.fn();
  const onActiveChange = vi.fn();
  const zones = vi.fn();
  const viewport = {
    startTime: { value: 1000 },
    endTime: { value: 2000 },
    priceMin: { value: 10 },
    priceMax: { value: 20 },
  };
  const props = {
    ref,
    frame,
    canStart: () => true,
    onAnalysisRequest: initialHandler ? handler : undefined,
    onActiveChange,
    onControlZonesChange: zones,
    liveViewport: viewport,
    backgroundColor: '#131722',
    textColor: '#fff',
    borderColor: '#333',
  };
  const result = render(<NativeAnalysisSelectorOverlay {...props} />);
  return {
    ref,
    handler,
    onActiveChange,
    viewport,
    zones,
    rerender: (next = frame) => result.rerender(<NativeAnalysisSelectorOverlay {...props} frame={next} />),
    unmount: result.unmount,
  };
}

describe('native analysis selection', () => {
  it('has real controls, emits the frozen main-plot range and returns the input plane to passive paint', () => {
    const { handler, onActiveChange, zones } = fixture();
    fireEvent.click(screen.getByLabelText('Analyze chart'));
    expect(handler).toHaveBeenLastCalledWith({ action: 'describe' });
    fireEvent.click(screen.getByLabelText('Select pattern'));
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    expect(capture.gesture!.config.enabled).toBe(true);
    act(() => {
      capture.gesture!.handlers.onBegin({ x: 100, y: 100 });
      capture.gesture!.handlers.onUpdate({ x: 500 });
      capture.gesture!.handlers.onEnd({ x: 500 }, true);
      capture.gesture!.handlers.onFinalize();
    });
    act(() => capture.layout?.({ nativeEvent: { layout: { width: 300, height: 30 } } }));
    expect(zones).toHaveBeenLastCalledWith([{ x1: 26, x2: 326, y1: 400, y2: 430 }]);
    fireEvent.click(screen.getByLabelText('Find similar TA'));
    expect(handler).toHaveBeenLastCalledWith({ action: 'similar', range: { from: 1100, to: 1500 } });
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByLabelText('Select chart pattern').getAttribute('data-pointer-events')).toBe('none');
  });

  it('clears the previous range when a second drag has no width', () => {
    const { handler } = fixture();
    fireEvent.click(screen.getByLabelText('Select pattern'));
    act(() => {
      capture.gesture!.handlers.onBegin({ x: 100, y: 100 });
      capture.gesture!.handlers.onEnd({ x: 500 }, true);
      capture.gesture!.handlers.onFinalize();
    });
    expect(screen.getByLabelText('Find similar TA').hasAttribute('disabled')).toBe(false);
    act(() => capture.gesture!.handlers.onBegin({ x: 200, y: 100 }));
    expect(screen.getByLabelText('Find similar TA').hasAttribute('disabled')).toBe(true);
    act(() => {
      capture.gesture!.handlers.onEnd({ x: 200 }, true);
      capture.gesture!.handlers.onFinalize();
    });
    expect(screen.getByText('Drag across a pattern to select its time range.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Find similar TA'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a delayed interruption from an older drag within the same selection', () => {
    const { handler } = fixture();
    fireEvent.click(screen.getByLabelText('Select pattern'));
    act(() => capture.gesture!.handlers.onBegin({ x: 100, y: 100 }));
    capture.defer = true;
    act(() => capture.gesture!.handlers.onFinalize());
    const interrupted = capture.jobs.shift()!;
    capture.defer = false;
    act(() => {
      capture.gesture!.handlers.onBegin({ x: 200, y: 100 });
      interrupted();
      capture.gesture!.handlers.onEnd({ x: 500 }, true);
      capture.gesture!.handlers.onFinalize();
    });
    expect(screen.queryByText(/interrupted/)).toBeNull();
    fireEvent.click(screen.getByLabelText('Find similar TA'));
    expect(handler).toHaveBeenLastCalledWith({ action: 'similar', range: { from: 1200, to: 1500 } });
  });

  it('visibly cancels on native scale and transition changes and supports callback disable/re-enable', () => {
    const { ref, viewport, rerender, handler, zones } = fixture();
    act(() => {
      ref.current!.start();
    });
    viewport.priceMax.value = 21;
    rerender();
    expect(screen.getByText(/chart changed/)).toBeTruthy();
    viewport.priceMax.value = 20;
    act(() => {
      ref.current!.start();
    });
    rerender({ ...frame, identity: 'OTHER:1:2' });
    expect(screen.getByText(/chart changed/)).toBeTruthy();
    const retained = screen.getByLabelText('Analyze chart');
    act(() => ref.current!.setHandler(undefined));
    expect(screen.queryByLabelText('Analyze chart')).toBeNull();
    expect(zones).toHaveBeenLastCalledWith([]);
    fireEvent.click(retained);
    expect(handler).not.toHaveBeenCalled();
    act(() => {
      ref.current!.setHandler(handler);
    });
    expect(screen.getByLabelText('Analyze chart')).toBeTruthy();
    act(() => {
      ref.current!.start();
      capture.appState!('background');
    });
    expect(screen.getByText(/lost focus/)).toBeTruthy();
  });

  it('hides controls without a host and revokes a retained control after unmount', () => {
    const initial = fixture(false);
    expect(screen.queryByLabelText('Analyze chart')).toBeNull();
    expect(initial.ref.current!.start()).toBe(false);
    initial.unmount();
    const mounted = fixture();
    const retained = screen.getByLabelText('Analyze chart');
    mounted.unmount();
    fireEvent.click(retained);
    expect(mounted.handler).not.toHaveBeenCalled();
  });
});
