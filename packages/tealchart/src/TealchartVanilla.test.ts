import type { Canvas } from '@napi-rs/canvas';
import type { Bar, Viewport } from './types';

import { createCanvas } from '@napi-rs/canvas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from './state/chartState';
import { SimpleChart } from './TealchartVanilla';

function installDisplay(target: Window, initialRatio = 1) {
  const queries: Array<{ listeners: Set<EventListenerOrEventListenerObject>; emit: () => void }> = [];
  const originalRatio = Object.getOwnPropertyDescriptor(target, 'devicePixelRatio');
  const originalMatchMedia = Object.getOwnPropertyDescriptor(target, 'matchMedia');
  Object.defineProperty(target, 'devicePixelRatio', { configurable: true, writable: true, value: initialRatio });
  Object.defineProperty(target, 'matchMedia', {
    configurable: true,
    value: vi.fn((media: string) => {
      const listeners = new Set<EventListenerOrEventListenerObject>();
      const queryRatio = Number(media.match(/([\d.]+)dppx/)?.[1]);
      const query = {
        media,
        get matches() {
          return target.devicePixelRatio === queryRatio;
        },
        addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener),
        removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
          listeners.delete(listener),
        addListener: (listener: EventListenerOrEventListenerObject) => listeners.add(listener),
        removeListener: (listener: EventListenerOrEventListenerObject) => listeners.delete(listener),
      };
      queries.push({
        listeners,
        emit: () => {
          const event = { matches: query.matches, media } as MediaQueryListEvent;
          for (const listener of [...listeners]) {
            if (typeof listener === 'function') listener(event);
            else listener.handleEvent(event);
          }
        },
      });
      return query as unknown as MediaQueryList;
    }),
  });
  return {
    queries,
    change(ratio: number) {
      Object.defineProperty(target, 'devicePixelRatio', { configurable: true, writable: true, value: ratio });
      for (const query of [...queries]) query.emit();
    },
    restore() {
      if (originalRatio) Object.defineProperty(target, 'devicePixelRatio', originalRatio);
      if (originalMatchMedia) Object.defineProperty(target, 'matchMedia', originalMatchMedia);
      else Reflect.deleteProperty(target, 'matchMedia');
    },
  };
}

describe('SimpleChart display scaling', () => {
  let backingStores: WeakMap<HTMLCanvasElement, Canvas>;
  let display: ReturnType<typeof installDisplay>;
  let charts: SimpleChart[];
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    backingStores = new WeakMap();
    charts = [];
    frames = new Map();
    let nextFrame = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => frames.delete(id)),
    );
    for (const dimension of ['width', 'height'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
      vi.spyOn(HTMLCanvasElement.prototype, dimension, 'set').mockImplementation(function (
        this: HTMLCanvasElement,
        value: number,
      ) {
        descriptor.set!.call(this, value);
        const backingStore = backingStores.get(this);
        if (backingStore) backingStore[dimension] = this[dimension];
      });
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      let backingStore = backingStores.get(this);
      if (!backingStore) {
        backingStore = createCanvas(this.width, this.height);
        backingStores.set(this, backingStore);
      }
      return backingStore.getContext('2d');
    } as unknown as HTMLCanvasElement['getContext']);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      toJSON: () => ({}),
    });
    display = installDisplay(window);
  });

  afterEach(() => {
    for (const chart of charts) chart.dispose();
    display.restore();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearChartStoreCache();
    document.body.replaceChildren();
  });

  function createChart(ownerDocument = document, devicePixelRatio = 1) {
    const container = ownerDocument.createElement('div');
    ownerDocument.body.appendChild(container);
    const chart = new SimpleChart({
      container,
      symbol: 'BTCUSDT',
      chartKey: `display-${charts.length}`,
      showTopBar: false,
      renderOptions: { devicePixelRatio },
    });
    charts.push(chart);
    return { chart, canvas: container.querySelector('canvas')! };
  }

  function expectBackingStore(canvas: HTMLCanvasElement, ratio: number) {
    expect(canvas.width).toBe(Math.floor(800 * ratio));
    expect(canvas.height).toBe(Math.floor(600 * ratio));
    const backingStore = backingStores.get(canvas)!;
    expect(backingStore.width).toBe(Math.floor(800 * ratio));
    expect(backingStore.height).toBe(Math.floor(600 * ratio));
    expect(backingStore.getContext('2d').getTransform().a).toBeCloseTo(ratio, 7);
    expect(backingStore.getContext('2d').getTransform().d).toBeCloseTo(ratio, 7);
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
  }

  it('refreshes unchanged CSS dimensions through fractional and reversed DPR changes without replacing chart state', () => {
    const { chart, canvas } = createChart(document, 2);
    const viewport: Viewport = { startTime: 1000, endTime: 2000, priceMin: 90, priceMax: 120 };
    const bars: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 20 }];
    chart.setBars(bars);
    chart.setViewport(viewport);
    const probe = chart as unknown as {
      _renderer: { getOptions(): { devicePixelRatio: number } };
      _viewport: Viewport;
    };
    const renderer = probe._renderer;
    expectBackingStore(canvas, 1);

    for (const ratio of [2, 1.25, 1.5, 1.0001, 1.0002, 1]) {
      display.change(ratio);
      expectBackingStore(canvas, ratio);
      expect(probe._renderer).toBe(renderer);
      expect(probe._renderer.getOptions().devicePixelRatio).toBe(1);
      expect(probe._viewport).toBe(viewport);
      expect(chart.getBars()).toEqual(bars);
    }
  });

  it('uses the canvas owner window for display changes, animation frames, and cancellation', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const ownerWindow = iframe.contentWindow!;
    const ownerDisplay = installDisplay(ownerWindow, 1.5);
    const ownerFrames = new Map<number, FrameRequestCallback>();
    let nextOwnerFrame = 100;
    const requestOwnerFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextOwnerFrame;
      ownerFrames.set(id, callback);
      return id;
    });
    const cancelOwnerFrame = vi.fn((id: number) => ownerFrames.delete(id));
    Object.defineProperty(ownerWindow, 'requestAnimationFrame', { configurable: true, value: requestOwnerFrame });
    Object.defineProperty(ownerWindow, 'cancelAnimationFrame', { configurable: true, value: cancelOwnerFrame });
    try {
      const { chart, canvas } = createChart(ownerWindow.document);
      expectBackingStore(canvas, 1.5);
      expect(requestOwnerFrame).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
      const initialFrame = ownerFrames.get(101)!;
      ownerFrames.delete(101);
      initialFrame(0);
      display.change(2);
      window.dispatchEvent(new Event('resize'));
      expectBackingStore(canvas, 1.5);
      ownerDisplay.change(1.25);
      expectBackingStore(canvas, 1.25);
      expect(requestOwnerFrame).toHaveBeenCalledTimes(2);
      expect(frames.size).toBe(0);
      chart.dispose();
      expect(cancelOwnerFrame).toHaveBeenCalledExactlyOnceWith(102);
      expect(ownerFrames.size).toBe(0);
    } finally {
      ownerDisplay.restore();
    }
  });

  it('detaches display and resize listeners and cancels pending rendering before disposal', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { chart, canvas } = createChart();
    display.change(2);
    expectBackingStore(canvas, 2);
    expect(frames.size).toBe(1);
    const resizeListeners = addListener.mock.calls
      .filter(([type]) => type === 'resize')
      .map(([, listener]) => listener);
    const staleCallbacks = display.queries.flatMap((query) => [...query.listeners]);
    chart.dispose();
    expect(frames.size).toBe(0);
    expect(display.queries.every((query) => query.listeners.size === 0)).toBe(true);
    for (const listener of resizeListeners) expect(removeListener).toHaveBeenCalledWith('resize', listener);

    display.change(1.25);
    window.dispatchEvent(new Event('resize'));
    for (const listener of staleCallbacks) {
      if (typeof listener === 'function') listener(new Event('change'));
      else listener.handleEvent(new Event('change'));
    }
    chart.render();
    expectBackingStore(canvas, 2);
    expect(frames.size).toBe(0);
  });
});
