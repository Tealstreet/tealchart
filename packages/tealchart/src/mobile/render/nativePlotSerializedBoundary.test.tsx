import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { NativeIndicatorPlotLayerImpl as NativeLayer } from './NativeIndicatorPlotLayer';

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import * as React from 'react';

import * as SkiaModule from '@shopify/react-native-skia';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { nativePictureRects } from '../../test/nativePictureRects';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { createNativeChartProjection } from './nativeProjection';

vi.mock('@shopify/react-native-skia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shopify/react-native-skia')>()),
  LinearGradient: () => null,
}));

const sourceCache = new Map<string, Record<string, unknown>>();
const NATIVE_SERIALIZED_BOUNDARY_TIMEOUT_MS = 90_000;
let nativePlotModule: Record<string, unknown>;
const require = createRequire(import.meta.url);
const babel = require('@babel/core') as { transformSync(source: string, options: unknown): { code: string } };
interface Worklet {
  (...args: unknown[]): unknown;
  name: string;
  __initData?: { code: string };
  __closure?: Record<string, unknown> | unknown[];
}
function materialize(value: unknown, cache = new Map<unknown, unknown>()): unknown {
  if (cache.has(value)) return cache.get(value);
  // Skia factories/font methods are JSI hosts; shared values retain identity.
  if (
    value === SkiaModule.Skia ||
    (value && typeof value === 'object' && Object.keys(value).length === 1 && 'value' in value)
  )
    return value;
  if (typeof value === 'function') {
    const worklet = value as Worklet;
    if (!worklet.__initData)
      return () => {
        throw new Error(`UI called JS-only function ${worklet.name}`);
      };
    const fn = new Function(`return (${worklet.__initData.code})`)() as (
      this: { __closure: Record<string, unknown> | unknown[] },
      ...args: unknown[]
    ) => unknown;
    // Worklets 0.13 serializes closures as arrays; older plugins use objects.
    const closure: Record<string, unknown> | unknown[] = Array.isArray(worklet.__closure) ? [] : {};
    const callable = (...args: unknown[]) => fn.apply({ __closure: closure }, args);
    cache.set(value, callable);
    for (const [key, item] of Object.entries(worklet.__closure ?? {})) {
      const materialized = materialize(item, cache);
      if (Array.isArray(closure)) closure[Number(key)] = materialized;
      else closure[key] = materialized;
    }
    return callable;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    cache.set(value, result);
    for (const item of value) result.push(materialize(item, cache));
    return result;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    cache.set(value, result);
    for (const [key, item] of Object.entries(value)) result[key] = materialize(item, cache);
    return result;
  }
  return value;
}
function loadNativeModule(file: string, cache = new Map<string, Record<string, unknown>>()) {
  if (cache.has(file)) return cache.get(file)!;
  const exports: Record<string, unknown> = {};
  cache.set(file, exports);
  const { code } = babel.transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    configFile: false,
    babelrc: false,
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: file.endsWith('.tsx') }],
      'react-native-worklets/plugin',
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  new Function('require', 'exports', code)((name: string) => {
    if (name === 'react')
      return { ...React, useMemo: (factory: () => unknown) => factory(), memo: (component: unknown) => component };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name === '@shopify/react-native-skia') return SkiaModule;
    if (name === 'react-native-reanimated')
      return {
        useDerivedValue: (factory: Worklet) => {
          expect(factory.__initData, 'derived factory must be serialized by mobile Babel').toBeDefined();
          const onUI = materialize(factory) as () => unknown;
          return Object.defineProperty({}, 'value', { enumerable: true, get: onUI });
        },
      };
    // Formatting is outside the UI path, and chartState owns live stores. The
    // real offset/time resolver is loaded; this unused formatter import is stubbed.
    if (name.endsWith('/state/chartState')) return { getDecimalPlacesFromPrecision: () => 2 };
    if (name.startsWith('.')) {
      const base = resolve(file, '..', name);
      const path = ['.ts', '.tsx', '.js', '/index.ts'].map((ext) => base + ext).find(existsSync);
      if (!path) throw new Error(`Missing native dependency ${name}`);
      return loadNativeModule(path, cache);
    }
    return require(name);
  }, exports);
  return exports;
}
const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 400, height: 420, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
  panes: [
    { id: 'main', type: 'main', top: 0, height: 200, yMin: 0, yMax: 100 },
    { id: 'study', type: 'indicator', top: 200, height: 200, yMin: 0, yMax: 100 },
  ],
});
const bars = [0, 1000, 2000, 3000, 4000].map((time, sourceIndex) => ({
  time,
  sourceIndex,
  interval: 1000,
  x: sourceIndex * 100,
  open: 10,
  close: 15,
  high: 20,
  low: 5,
  volume: 1,
}));
const viewport = { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 };
function plot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return { id: 'p', type: 'plot', title: 'P', values: [10, 20, 30, 40, 50], color: '#12345680', ...overrides };
}
function shared<T>(input: T | { value: T }): T {
  return input && typeof input === 'object' && 'value' in input ? input.value : (input as T);
}
function walk(node: ReactNode, opacity = 1): Array<ReactElement<Record<string, unknown>>> {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap((child) => walk(child, opacity));
  if (typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  opacity *= Number(shared(element.props.opacity ?? 1));
  if (!opacity) return [];
  if (element.type === React.Fragment) return walk(element.props.children as ReactNode, opacity);
  if (
    [
      SkiaModule.Group,
      SkiaModule.Picture,
      SkiaModule.Path,
      SkiaModule.Rect,
      SkiaModule.Text,
      SkiaModule.DashPathEffect,
      SkiaModule.LinearGradient,
    ].includes(element.type as never)
  ) {
    for (const [key, input] of Object.entries(element.props))
      if (key !== 'children' && input && typeof input === 'object' && 'value' in input) void input.value;
    return [element, ...walk(element.props.children as ReactNode, opacity)];
  }
  if (typeof element.type === 'function')
    return walk((element.type as (props: unknown) => ReactNode)(element.props), opacity);
  return [];
}
function harness(plots: PlotOutput[], staticMode = false) {
  const module = nativePlotModule;
  const layer = module.NativeIndicatorPlotLayerImpl as typeof NativeLayer;
  const sharedViewport = {
    startTime: { value: 0 },
    endTime: { value: 4000 },
    priceMin: { value: 0 },
    priceMax: { value: 100 },
  };
  const paneRangeOverrides = { value: {} as Record<string, { yMin: number; yMax: number }> };
  const element = layer({
    bars,
    frame,
    plots,
    visibleBars: bars,
    totalBarCount: 5,
    indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } },
    sharedViewport,
    paneRangeOverrides,
    textFont: SkiaModule.Skia.Font(null, 12),
    staticProjection: staticMode ? createNativeChartProjection({ frame, viewport }) : undefined,
  });
  const nodes = () => walk(element);
  const paths = () =>
    nodes()
      .filter((node) => node.type === SkiaModule.Path)
      .map((node) => shared(node.props.path) as { moveTo: ReturnType<typeof vi.fn>; lineTo: ReturnType<typeof vi.fn> });
  return { nodes, paths, sharedViewport, paneRangeOverrides };
}

describe('native plots across the serialized UI boundary', () => {
  beforeAll(() => {
    nativePlotModule = loadNativeModule(resolve('src/mobile/render/NativeIndicatorPlotLayer.tsx'), sourceCache);
  }, NATIVE_SERIALIZED_BOUNDARY_TIMEOUT_MS);

  it('runs line/area helpers with imported worklets and updates live viewport projection', () => {
    const h = harness([plot({ style: 'areabr', values: [10, 20, null, 40, 50] })]);
    expect(h.paths().some((path) => path.moveTo.mock.calls.some(([x, y]) => x === 0 && y === 180))).toBe(true);
    h.sharedViewport.endTime.value = 2000;
    h.sharedViewport.priceMax.value = 200;
    expect(h.paths().some((path) => path.lineTo.mock.calls.some(([x, y]) => x === 200 && y === 180))).toBe(true);
  });
  it('keeps historical residual tracking after source geometry leaves the viewport', () => {
    const h = harness([plot({ trackprice: true, showLast: 1, offset: -99999 })]);
    expect(h.paths().some((path) => path.lineTo.mock.calls.some(([x, y]) => x === 400 && y === 100))).toBe(true);
  });
  it.each([false, true])('builds hlines without calling JS projection methods from UI (static=%s)', (staticMode) => {
    const h = harness([plot({ type: 'hline', price: 50, scriptId: 's' })], staticMode);
    expect(h.paths().some((path) => path.moveTo.mock.calls.some(([x, y]) => x === 0 && y === 300))).toBe(true);
  });
  it('routes background rectangles through live study clip and pan geometry', () => {
    const h = harness([plot({ type: 'bgcolor', scriptId: 's', showLast: 1 })]);
    const clip = h.nodes().find((node) => node.type === SkiaModule.Group && node.props.clip)!;
    expect(shared(clip.props.clip)).toEqual({ x: 0, y: 200, width: 400, height: 200 });
    const picture = h.nodes().find((node) => node.type === SkiaModule.Picture)!;
    expect(nativePictureRects(picture.props.picture)[0].y).toBe(200);
    expect(nativePictureRects(picture.props.picture)[0].height).toBe(200);
    h.sharedViewport.endTime.value = 8000;
    expect(nativePictureRects(picture.props.picture)[0].width).toBe(50);
    h.sharedViewport.startTime.value = 4500;
    expect(nativePictureRects(picture.props.picture)).toEqual([]);
    expect(shared(clip.props.clip)).toEqual({ x: 0, y: 200, width: 400, height: 200 });
  });
  it.each(['flag', 'labelup', 'cross'] as const)('calls shared %s marker helpers entirely on UI', (shape) => {
    const h = harness([
      plot({ type: 'plotshape', shape, location: 'absolute', values: [null, null, 50, null, null], text: 'A\nB' }),
    ]);
    expect(h.paths().some((path) => path.moveTo.mock.calls.length || path.lineTo.mock.calls.length)).toBe(true);
    const text = h
      .nodes()
      .filter((node) => node.type === SkiaModule.Text)
      .map((node) => shared(node.props.text));
    expect(text).toEqual(['A', 'B']);
  });
  it('runs the plotarrow glyph helper and recomputes magnitude during a historical pan', () => {
    const h = harness([plot({ type: 'plotarrow', values: [5, -10, 0, null, 100], minHeight: 6, maxHeight: 30 })]);
    const before = h.paths().flatMap((path) => path.lineTo.mock.calls);
    h.sharedViewport.endTime.value = 2000;
    const after = h.paths().flatMap((path) => path.lineTo.mock.calls);
    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
    expect(after.flat().every(Number.isFinite)).toBe(true);
  });
  it('executes gradient masks and stop projection in the serialized function body', () => {
    const h = harness([
      plot({ id: 'upper', display: 0, values: [20, 30, 40, 50, 60] }),
      plot({ id: 'lower', display: 0, values: [10, 15, 20, 25, 30] }),
      plot({
        id: 'fill',
        type: 'fill',
        plot1Id: 'upper',
        plot2Id: 'lower',
        values: [],
        gradient: {
          topValues: [80, 80, 80, 80, 80],
          bottomValues: [20, 20, 20, 20, 20],
          topColors: Array(5).fill('#ff000080'),
          bottomColors: Array(5).fill('#0000ff40'),
        },
      }),
    ]);
    expect(h.paths().length).toBeGreaterThan(0);
    const gradients = h.nodes().filter((node) => node.type === SkiaModule.LinearGradient);
    expect(gradients.length).toBeGreaterThan(0);
    expect(shared(gradients[0]!.props.start)).toEqual({ x: 0, y: 40 });
    expect(shared(gradients[0]!.props.end)).toEqual({ x: 0, y: 160 });
    h.sharedViewport.priceMax.value = 200;
    expect(shared(gradients[0]!.props.start)).toEqual({ x: 0, y: 120 });
    expect(shared(gradients[0]!.props.end)).toEqual({ x: 0, y: 180 });
  });
});
