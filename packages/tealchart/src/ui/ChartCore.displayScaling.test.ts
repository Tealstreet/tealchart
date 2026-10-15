// @vitest-environment jsdom
import type { Canvas } from '@napi-rs/canvas';
import type { PriceLineManager } from '../interaction/PriceLineManager';
import type { TealchartRenderer } from '../TealchartRenderer';
import type { Viewport } from '../types';

import { createCanvas } from '@napi-rs/canvas';
import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChartCore } from './ChartCore';

vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    dispose() {}
    getIsDragging() {
      return false;
    }
    getActiveCursor() {
      return null;
    }
  },
}));

interface CoreProbe {
  canvas: HTMLCanvasElement;
  crosshairCanvas: HTMLCanvasElement;
  stage: Konva.Stage;
  viewport: Viewport | null;
  renderer: TealchartRenderer;
  priceLineManager: PriceLineManager;
}

function installRasterCanvas() {
  const backing = new WeakMap<HTMLCanvasElement, Canvas>();
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  for (const dimension of ['width', 'height'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
    vi.spyOn(HTMLCanvasElement.prototype, dimension, 'set').mockImplementation(function (
      this: HTMLCanvasElement,
      value: number,
    ) {
      descriptor.set!.call(this, value);
      const raster = backing.get(this);
      if (raster) raster[dimension] = this[dimension];
    });
  }
  const getContext = function (this: HTMLCanvasElement) {
    if (!backing.has(this)) backing.set(this, createCanvas(this.width, this.height));
    if (!contexts.has(this)) {
      const context = backing.get(this)!.getContext('2d');
      const proxy = new Proxy(context, {
        get(target, key) {
          if (key === 'drawImage') {
            return (source: HTMLCanvasElement, ...args: number[]) => {
              const image = source instanceof HTMLCanvasElement ? backing.get(source)! : source;
              Reflect.apply(target.drawImage, target, [image, ...args]);
            };
          }
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
        set(target, key, value) {
          return Reflect.set(target, key, value, target);
        },
      });
      contexts.set(this, proxy as unknown as CanvasRenderingContext2D);
    }
    return contexts.get(this)!;
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    getContext as unknown as HTMLCanvasElement['getContext'],
  );
}

describe('ChartCore display scaling', () => {
  let cores: ChartCore[];
  let initialKonvaRatio: number;

  beforeEach(() => {
    cores = [];
    initialKonvaRatio = Konva.pixelRatio;
    Konva.pixelRatio = 1;
    installRasterCanvas();
    vi.stubGlobal('devicePixelRatio', 1);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    for (const core of cores) core.dispose();
    Konva.pixelRatio = initialKonvaRatio;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  function createCore() {
    const container = document.createElement('div');
    document.body.append(container);
    const core = new ChartCore({ container, width: 320, height: 200 });
    cores.push(core);
    return { core, probe: core as unknown as CoreProbe };
  }

  function expectBacking(probe: CoreProbe, ratio: number, width = 320, height = 200) {
    for (const canvas of [probe.canvas, probe.crosshairCanvas]) {
      expect([canvas.width, canvas.height]).toEqual([width * ratio, height * ratio]);
      expect([canvas.style.width, canvas.style.height]).toEqual([`${width}px`, `${height}px`]);
      expect(canvas.getContext('2d')!.getTransform().a).toBe(ratio);
      expect(canvas.getContext('2d')!.getTransform().d).toBe(ratio);
    }
    const layer = probe.stage.getLayers()[0]!;
    expect(layer.getCanvas().getPixelRatio()).toBe(ratio);
    expect([layer.getCanvas().getWidth(), layer.getCanvas().getHeight()]).toEqual([width * ratio, height * ratio]);
    expect(layer.getCanvas().getContext()._context.getTransform().a).toBe(ratio);
    expect(layer.getHitCanvas().getPixelRatio()).toBe(1);
    expect(Konva.pixelRatio).toBe(1);
  }

  it('initializes every scene backing store from the live DPR, not Konva’s module snapshot', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const { probe } = createCore();
    expectBacking(probe, 2);
  });

  it('tracks the canvas owner window rather than another window’s DPR', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const owner = iframe.contentWindow!;
    const container = owner.document.createElement('div');
    owner.document.body.append(container);
    Object.defineProperty(owner, 'devicePixelRatio', { configurable: true, value: 2 });
    const core = new ChartCore({ container, width: 320, height: 200 });
    cores.push(core);
    const probe = core as unknown as CoreProbe;
    expectBacking(probe, 2);
    vi.stubGlobal('devicePixelRatio', 3);
    window.dispatchEvent(new Event('resize'));
    expectBacking(probe, 2);
    Object.defineProperty(owner, 'devicePixelRatio', { configurable: true, value: 1.5 });
    owner.dispatchEvent(new Event('resize'));
    expectBacking(probe, 1.5);
  });

  it('refreshes DPR-only backing stores and paint while retaining the viewport and manager nodes', () => {
    const { core, probe } = createCore();
    const layer = probe.stage.getLayers()[0]!;
    const group = (probe.priceLineManager as unknown as { group: Konva.Group }).group;
    const retained = new Konva.Rect({ x: 10, y: 10, width: 10, height: 10, fill: '#ffffff', opacity: 0.5 });
    group.add(retained);
    core.setBars([{ time: 0, open: 1.2, high: 1.8, low: 1.1, close: 1.6, volume: 10 }]);
    const viewport = { startTime: 0, endTime: 60_000, priceMin: 1, priceMax: 2 };
    core.setViewport(viewport);
    const paint = vi.spyOn(core, 'paint');
    const setDimensions = vi.spyOn(probe.priceLineManager, 'setDimensions');
    const updateLines = vi.spyOn(probe.priceLineManager, 'update');
    const rendererOptions = vi.spyOn(probe.renderer, 'setOptions');
    const draw = vi.spyOn(layer, 'batchDraw');
    for (const ratio of [2, 1.5, 1]) {
      vi.stubGlobal('devicePixelRatio', ratio);
      window.dispatchEvent(new Event('resize'));
      expectBacking(probe, ratio);
      expect(probe.viewport).toBe(viewport);
      expect(group.getChildren()).toContain(retained);
      expect(retained.getParent()).toBe(group);
      layer.draw();
    }
    expect(paint).toHaveBeenCalledTimes(3);
    expect(draw).toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
    expect(updateLines).not.toHaveBeenCalled();
    expect(rendererOptions).not.toHaveBeenCalled();
  });

  it('keeps ordinary CSS resizing at the current DPR and stops watching even when preserving DOM', () => {
    const { core, probe } = createCore();
    vi.stubGlobal('devicePixelRatio', 1.5);
    core.resize(400, 240);
    expectBacking(probe, 1.5, 400, 240);
    const paint = vi.spyOn(core, 'paint');
    core.dispose(true);
    cores = [];
    vi.stubGlobal('devicePixelRatio', 2);
    window.dispatchEvent(new Event('resize'));
    expect(paint).not.toHaveBeenCalled();
    expect([probe.canvas.width, probe.canvas.height]).toEqual([600, 360]);
    expect(probe.canvas.isConnected).toBe(true);
  });
});
