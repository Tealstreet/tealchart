import type { SkCanvas } from '@shopify/react-native-skia';
import type { CanvasContext } from '../../rendering/CanvasContext';

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

// Vitest normally strips directives without running the mobile Babel plugin.
// Exercise the actual serialized function body to catch captured mutable state
// and JS-only helper calls that ordinary draw-call tests cannot detect.
const require = createRequire(import.meta.url);
const babel = require('@babel/core') as { transformSync(source: string, options: unknown): { code: string } };
interface Worklet extends Function {
  __initData?: { code: string };
  __closure?: Record<string, unknown> | unknown[];
}
function loadWorklets(file: string, cache = new Map<string, Record<string, unknown>>()) {
  if (cache.has(file)) return cache.get(file)!;
  const exports: Record<string, unknown> = {};
  cache.set(file, exports);
  const { code } = babel.transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    configFile: false,
    babelrc: false,
    plugins: [
      '@babel/plugin-transform-typescript',
      'react-native-worklets/plugin',
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  new Function('require', 'exports', code)((name: string) => {
    if (name === '@shopify/react-native-skia') return { Skia };
    if (name.startsWith('.')) return loadWorklets(resolve(file, '..', `${name}.ts`), cache);
    throw new Error(`Unexpected runtime dependency ${name}`);
  }, exports);
  return exports;
}
function onUI(value: unknown, cache = new Map<unknown, unknown>()): unknown {
  if (cache.has(value)) return cache.get(value);
  if (typeof value === 'function' && (value as Worklet).__initData) {
    const worklet = value as Worklet;
    const fn = new Function(`return (${worklet.__initData!.code})`)() as Function;
    // Worklets 0.13 serializes closures as arrays; older plugins use objects.
    const closure: Record<string, unknown> | unknown[] = Array.isArray(worklet.__closure) ? [] : {};
    const callable = (...args: unknown[]) => fn.apply({ __closure: closure }, args);
    cache.set(value, callable);
    for (const [key, item] of Object.entries(worklet.__closure ?? {})) {
      const materialized = onUI(item, cache);
      if (Array.isArray(closure)) closure[Number(key)] = materialized;
      else closure[key] = materialized;
    }
    return callable;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    cache.set(value, result);
    for (const item of value) result.push(onUI(item, cache));
    return result;
  }
  if (value && typeof value === 'object') {
    // Skia's factory methods are JSI host functions on device; keep their mock
    // functions intact here while materializing imported worklet namespaces.
    const result: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
    cache.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      (result as Record<string, unknown>)[key] = onUI(item, cache);
    }
    return result;
  }
  return value;
}

describe('native drawing serialized worklets', () => {
  it('keeps path/dash/style state local and executes shared coordinate helpers on UI', () => {
    const adapter = loadWorklets(resolve('src/mobile/render/nativeDrawingContext.ts'));
    const painter = loadWorklets(resolve('src/rendering/TealScriptDrawingRenderer.ts'));
    const partition = loadWorklets(resolve('src/rendering/TealScriptDrawingPartition.ts'));
    const drawPath = vi.fn();
    const canvas = { save: vi.fn(), restore: vi.fn(), clipPath: vi.fn(), drawPath } as unknown as SkCanvas;
    const makeContext = onUI(adapter.createNativeDrawingContext) as (canvas: SkCanvas, fonts: unknown) => CanvasContext;
    const ctx = makeContext(canvas, {});
    const partitionDrawings = onUI(partition.partitionTealScriptDrawings) as (drawings: unknown[]) => unknown;
    const paint = onUI(painter.paintTealScriptDrawings) as (...args: unknown[]) => void;
    paint(
      {
        ctx,
        options: { width: 120 },
        margins: { left: 0, right: 0 },
        font: 'sans-serif',
        coordinateResolvers: { timeToX: (time: number) => time / 100, valueToY: (value: number) => value },
        getTextWidth: () => 0,
      },
      partitionDrawings([
        {
          type: 'line',
          id: 'l',
          x1: 0,
          y1: 10,
          x2: 1,
          y2: 20,
          xloc: 'bar_index',
          extend: 'none',
          color: '#ff000080',
          width: 2,
          style: 'dashed',
        },
      ]),
      [{ time: 1000 }, { time: 2000 }],
      { startTime: 1000, endTime: 2000 },
      { top: 0, height: 100 },
    );
    expect(drawPath).toHaveBeenCalledOnce();
    expect(drawPath.mock.calls[0]![0].moveTo).toHaveBeenCalledWith(10, 10);
    expect(drawPath.mock.calls[0]![0].lineTo).toHaveBeenCalledWith(20, 20);
    expect(Skia.PathEffect.MakeDash).toHaveBeenCalledWith([6, 4], 0);
  });
});

describe('all drawing families in the serialized native painter', () => {
  it.each(['label_lower_left', 'label_lower_right', 'label_upper_left', 'label_upper_right', 'label_up', 'label_down'])(
    'paints documented corner orientation for %s in the serialized UI body',
    (style) => {
      const adapter = loadWorklets(resolve('src/mobile/render/nativeDrawingContext.ts'));
      const painter = loadWorklets(resolve('src/mobile/render/nativeTealScriptDrawings.ts'));
      const drawPath = vi.fn();
      const canvas = {
        save: vi.fn(),
        restore: vi.fn(),
        clipPath: vi.fn(),
        drawPath,
        drawText: vi.fn(),
      } as unknown as SkCanvas;
      const makeContext = onUI(adapter.createNativeDrawingContext) as (
        canvas: SkCanvas,
        fonts: unknown,
      ) => CanvasContext;
      const ctx = makeContext(canvas, { '12px sans-serif': Skia.Font(undefined, 12) });
      const paint = onUI(painter.paintNativeTealScriptDrawings) as (options: unknown) => void;
      paint({
        ctx,
        width: 400,
        margins: { left: 0, right: 0 },
        viewport: { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
        bars: [{ time: 1000 }, { time: 2000 }, { time: 3000 }],
        panes: [{ id: 'main', type: 'main', top: 10, height: 200, bottom: 210, yMin: 0, yMax: 20 }],
        drawings: [
          {
            type: 'label',
            id: 'corner',
            x: 1,
            y: 10,
            text: 'Text',
            xloc: 'bar_index',
            yloc: 'price',
            style,
            color: '#ff0000',
            textColor: '#ffffff',
            size: 'normal',
          },
        ],
      });
      expect(drawPath).toHaveBeenCalledTimes(2);
      const body = drawPath.mock.calls[0]![0].addRRect.mock.calls[0][0].rect as {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      const pointer = drawPath.mock.calls[1]![0];
      const lower = style.includes('lower') || style === 'label_down';
      if (lower) expect(body.y + body.height).toBeLessThan(110);
      else expect(body.y).toBeGreaterThan(110);
      if (style.endsWith('left')) expect(body.x).toBe(200);
      else if (style.endsWith('right')) expect(body.x + body.width).toBe(200);
      else expect(body.x + body.width / 2).toBe(200);
      const baseY = lower ? body.y + body.height : body.y;
      expect(pointer.moveTo.mock.calls[0][1]).toBe(baseY);
      expect(pointer.lineTo.mock.calls[0][1]).toBe(baseY);
      expect(pointer.lineTo.mock.calls[1]).toEqual([200, 110]);
    },
  );

  it.each(['label_left', 'label_right'])('paints the horizontal %s tip outside its body on UI', (style) => {
    const adapter = loadWorklets(resolve('src/mobile/render/nativeDrawingContext.ts'));
    const painter = loadWorklets(resolve('src/mobile/render/nativeTealScriptDrawings.ts'));
    const drawPath = vi.fn();
    const canvas = {
      save: vi.fn(),
      restore: vi.fn(),
      clipPath: vi.fn(),
      drawPath,
      drawText: vi.fn(),
    } as unknown as SkCanvas;
    const makeContext = onUI(adapter.createNativeDrawingContext) as (canvas: SkCanvas, fonts: unknown) => CanvasContext;
    const ctx = makeContext(canvas, { '12px sans-serif': Skia.Font(undefined, 12) });
    const paint = onUI(painter.paintNativeTealScriptDrawings) as (options: unknown) => void;
    paint({
      ctx,
      width: 400,
      margins: { left: 0, right: 0 },
      viewport: { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
      bars: [{ time: 1000 }, { time: 2000 }, { time: 3000 }],
      panes: [{ id: 'main', type: 'main', top: 10, height: 200, bottom: 210, yMin: 0, yMax: 20 }],
      drawings: [
        {
          type: 'label',
          id: 'label',
          x: 1,
          y: 10,
          text: 'Text',
          xloc: 'bar_index',
          yloc: 'price',
          style,
          color: '#ff0000',
          textColor: '#ffffff',
          size: 'normal',
        },
      ],
    });
    expect(drawPath).toHaveBeenCalledTimes(2);
    const body = drawPath.mock.calls[0]![0].addRRect.mock.calls[0][0].rect as { x: number; width: number };
    const pointer = drawPath.mock.calls[1]![0];
    const nearestEdge = style === 'label_left' ? body.x : body.x + body.width;
    if (style === 'label_left') expect(nearestEdge).toBeGreaterThan(200);
    else expect(nearestEdge).toBeLessThan(200);
    expect(pointer.moveTo.mock.calls[0][0]).toBe(nearestEdge);
    expect(pointer.lineTo.mock.calls[0][0]).toBe(nearestEdge);
    expect(pointer.lineTo.mock.calls[1]).toEqual([200, 110]);
  });
  it('runs routing, layout and Skia draw calls entirely in the UI function body', () => {
    const adapter = loadWorklets(resolve('src/mobile/render/nativeDrawingContext.ts'));
    const painter = loadWorklets(resolve('src/mobile/render/nativeTealScriptDrawings.ts'));
    const drawPath = vi.fn();
    const drawRect = vi.fn();
    const drawText = vi.fn();
    const canvas = {
      save: vi.fn(),
      restore: vi.fn(),
      clipPath: vi.fn(),
      drawPath,
      drawRect,
      drawText,
    } as unknown as SkCanvas;
    const makeContext = onUI(adapter.createNativeDrawingContext) as (canvas: SkCanvas, fonts: unknown) => CanvasContext;
    const ctx = makeContext(canvas, { '12px sans-serif': Skia.Font(null, 12), '14px sans-serif': Skia.Font(null, 14) });
    const line = {
      type: 'line',
      id: 'l',
      x1: 0,
      y1: 10,
      x2: 1,
      y2: 20,
      xloc: 'bar_index',
      extend: 'none',
      color: '#ff000080',
      width: 2,
      style: 'solid',
    };
    const paint = onUI(painter.paintNativeTealScriptDrawings) as (options: unknown) => void;
    paint({
      ctx,
      width: 120,
      margins: { left: 0, right: 0 },
      viewport: { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
      bars: [{ time: 1000 }, { time: 2000 }, { time: 3000 }],
      panes: [{ id: 'main', type: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 }],
      drawings: [
        { type: 'linefill', id: 'fill', line1: 'l', line2: 'l2', color: '#00ff0040' },
        line,
        { ...line, id: 'l2', y1: 5, y2: 15 },
        {
          type: 'box',
          id: 'b',
          left: 0,
          right: 1,
          top: 18,
          bottom: 8,
          xloc: 'bar_index',
          extend: 'none',
          borderColor: '#aabbcc',
          borderWidth: 2,
          borderStyle: 'solid',
          bgcolor: '#12345680',
          text: 'Box',
          textColor: '#ffffff',
          textSize: 'normal',
        },
        {
          type: 'polyline',
          id: 'p',
          points: [
            { index: 0, price: 10 },
            { index: 1, price: 20 },
            { index: 2, price: 12 },
          ],
          curved: true,
          closed: true,
          xloc: 'bar_index',
          lineColor: '#000000',
          fillColor: '#11223344',
          lineWidth: 2,
          lineStyle: 'solid',
        },
        {
          type: 'label',
          id: 'label',
          x: 0,
          y: 10,
          xloc: 'bar_index',
          yloc: 'price',
          style: 'text_outline',
          color: '#000000',
          text: 'Label',
          textColor: '#ffffff',
          size: 'normal',
        },
        {
          type: 'table',
          id: 't',
          position: 'top_right',
          columns: 1,
          rows: 1,
          bgcolor: '#123456',
          frameColor: '#111111',
          frameWidth: 1,
          borderColor: '#222222',
          borderWidth: 1,
          cells: [
            {
              column: 0,
              row: 0,
              text: 'Cell',
              width: 0,
              height: 0,
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'middle',
              bgcolor: '#112233',
            },
          ],
        },
      ],
    });
    expect(drawPath).toHaveBeenCalledTimes(5);
    expect(drawRect).toHaveBeenCalledTimes(6);
    expect(drawText.mock.calls.map((call) => call[0])).toEqual(['Box', 'Label', 'Label', 'Cell']);
    expect(drawPath.mock.calls[1]![0].cubicTo.mock.calls.map((call: number[]) => call.slice(4))).toEqual([
      [60, 0],
      [120, 40],
      [0, 50],
    ]);
    expect(drawRect.mock.calls.some((call) => call[0].x === 64 && call[0].width === 48 && call[0].height === 22)).toBe(
      true,
    );
  });
});
