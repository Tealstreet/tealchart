import { describe, expect, it, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import type { CanvasContext } from './CanvasContext';

import { entries } from '../../../tealscript/tests/fixtures/v103Styles';
import { segments, traceStyles, type StyleChannel, type StylePaint } from '../test/v103StylesPaint';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));
const entry = (name: string) => entries.find(e => e.id === `v103-${name}`)!;
const color = (paints: StylePaint[], hex: string) => paints.filter(p => p.color?.slice(0, 7).toLowerCase() === hex);
const blue = (paints: StylePaint[]) => color(paints, '#2962ff');
const near = (a: number, b: number) => Math.abs(a - b) < 1e-8;
const expectVisiblePaint = (paint: StylePaint) => {
  expect(paint.color).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
  const colorAlpha = Number.parseInt(paint.color.slice(7) || 'ff', 16) / 255;
  expect(paint.globalAlpha).toBeGreaterThan(0);
  expect(paint.globalAlpha).toBeLessThanOrEqual(1);
  expect(colorAlpha * paint.globalAlpha!).toBeGreaterThan(0);
  if (paint.kind === 'stroke') expect(paint.lineWidth).toBeGreaterThan(0);
  // Rasterize each emitted primitive independently; another subject cannot supply its ink.
  const padding = 32;
  const minX = Math.floor(Math.min(...paint.commands.map(c => c.x - (c.w ?? 0))) - padding);
  const minY = Math.floor(Math.min(...paint.commands.map(c => c.y - (c.h ?? c.w ?? 0))) - padding);
  const maxX = Math.ceil(Math.max(...paint.commands.map(c => c.x + (c.w ?? 0))) + padding);
  const maxY = Math.ceil(Math.max(...paint.commands.map(c => c.y + (c.h ?? c.w ?? 0))) + padding);
  const ctx = createCanvas(maxX - minX, maxY - minY).getContext('2d');
  ctx.translate(-minX, -minY);
  ctx.fillStyle = paint.color; ctx.strokeStyle = paint.color;
  ctx.globalAlpha = paint.globalAlpha!; ctx.lineWidth = paint.lineWidth ?? 1;
  ctx.setLineDash(paint.dash);
  ctx.beginPath();
  for (const c of paint.commands) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'Z') ctx.closePath();
    else if (c.op === 'R') ctx.rect(c.x, c.y, c.w!, c.h!);
    else if (c.op === 'C') { ctx.moveTo(c.x + c.w!, c.y); ctx.arc(c.x, c.y, c.w!, 0, Math.PI * 2); }
    else if (c.op === 'T') {
      ctx.font = paint.font!; ctx.textAlign = paint.textAlign!; ctx.textBaseline = paint.textBaseline!;
      ctx.fillText(c.text!, c.x, c.y);
    }
  }
  if (paint.kind === 'stroke') ctx.stroke();
  else if (paint.kind === 'fill') ctx.fill();
  const pixels = ctx.getImageData(0, 0, maxX - minX, maxY - minY).data;
  expect(pixels.some((value, i) => i % 4 === 3 && value > 0), JSON.stringify(paint)).toBe(true);
};
const expectVisibleColors = (trace: ReturnType<typeof traceStyles>, ...hexes: string[]) => {
  for (const hex of hexes) for (const paint of color(trace.paints, hex)) {
    if (paint.commands.some(c => ['L', 'C', 'R', 'T'].includes(c.op))) expectVisiblePaint(paint);
  }
};
const drawingInk = (trace: ReturnType<typeof traceStyles>, channel: StyleChannel) => {
  const ctx = createCanvas(1000, 100).getContext('2d');
  const drawingContext = ctx as unknown as CanvasContext;
  const margins = { left: 0, right: 0, top: 0, bottom: 0 };
  const pane = { id: 'study', type: 'indicator' as const, indicatorIds: ['s'], heightRatio: 1,
    fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: 100, height: 100 };
  const drawings = trace.result.drawings.map(d => ({ ...d, scriptId: 's' }));
  if (channel === 'web') {
    new TealScriptDrawingRenderer({ ctx: drawingContext, options: { ...DEFAULT_RENDER_OPTIONS, width: 1000 },
      margins, font: 'sans-serif', coordinateResolvers: {
        timeToX: time => (time - trace.viewport.startTime) / (trace.viewport.endTime - trace.viewport.startTime) * 1000,
        valueToY: value => 100 - value,
      }, getTextWidth: (active, text) => active.measureText(text).width,
    }).render(partitionTealScriptDrawings(drawings), trace.bars, trace.viewport, pane);
  } else {
    paintNativeTealScriptDrawings({ ctx: drawingContext, drawings, bars: trace.bars,
      viewport: trace.viewport, panes: [pane], width: 1000, margins });
  }
  return (x: number, y: number) => ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
};
const facet = (name: string, id: string) => {
  const f = entry(name).regions.facets.find((f: any) => f.facetId.endsWith(':' + id));
  expect(f.outcome).toBe('SUPPORTED_A');
  return f;
};
for (const channel of ['web', 'web-pane', 'web-unified', 'native', 'native-static'] as StyleChannel[]) {
  describe(`v103 original PNG/map-bound style facets ${channel}`, () => {
    if (channel === 'web' || channel === 'native') {
      it('fills and closes both dashed triangles, copies the supplied apex and deletes only the red control', () => {
        const name = 'polyline-fill-style-v6';
        for (const id of ['fill-and-closed-edge', 'dashed-border', 'copied-point-fields', 'deleted-control']) facet(name, id);
        const e = entry(name), trace = traceStyles(e, channel);
        const ink = drawingInk(trace, channel);
        const fills = color(trace.paints, '#ff9800').filter(p => p.kind === 'fill');
        const strokes = blue(trace.paints).filter(p => p.kind === 'stroke');
        expect(fills).toHaveLength(2); expect(strokes).toHaveLength(2);
        for (const shift of [0, 50]) {
          const points = [{ x: trace.x(e.anchor - 95 + shift), y: 80 }, { x: trace.x(e.anchor - 75 + shift), y: 15 }, { x: trace.x(e.anchor - 55 + shift), y: 80 }];
          for (const candidates of [fills, strokes]) {
            const atSubject = candidates.filter(p => near(Math.min(...p.commands.filter(c => c.op !== 'Z').map(c => c.x)), points[0].x));
            expect(atSubject).toHaveLength(1);
            const paint = atSubject[0];
            expect(paint.commands.filter(c => c.op !== 'Z').map(c => ({ x: c.x, y: c.y })).sort((a, b) => a.x - b.x)).toEqual(points);
            expect(paint.commands.at(-1)?.op).toBe('Z');
            expectVisiblePaint(paint);
            if (paint.kind === 'stroke') {
              expect(paint.dash.length).toBeGreaterThanOrEqual(2);
              expect(paint.dash.length % 2).toBe(0);
              expect(paint.dash.every(length => Number.isFinite(length) && length > 0)).toBe(true);
              const edge = Array.from({ length: Math.floor(points[2].x) - Math.ceil(points[0].x) - 15 },
                (_, i) => ink(Math.ceil(points[0].x) + 8 + i, 80));
              const isBlue = edge.map(pixel => pixel[3] > 0 && pixel[2] > pixel[0] && pixel[2] > pixel[1]);
              expect(isBlue.some(Boolean)).toBe(true);
              expect(isBlue.some(value => !value)).toBe(true);
              expect(isBlue.slice(1).filter((value, i) => value !== isBlue[i]).length).toBeGreaterThan(1);
            } else {
              const pixel = ink(points[1].x, (80 + 15 + 80) / 3);
              expect(pixel[3]).toBeGreaterThan(0);
              expect(pixel[0]).toBeGreaterThan(pixel[1]);
              expect(pixel[1]).toBeGreaterThan(pixel[2]);
            }
          }
        }
        expect(trace.paints.some(p => p.color?.slice(0, 7).toLowerCase() === '#f23645' || p.color?.slice(0, 7).toLowerCase() === '#ff0000')).toBe(false);
      });
      for (const version of [5, 6]) it(`v${version} paints open chevrons only on the requested supplied polyline endpoints`, () => {
        const name = `polyline-arrows-v${version}`, e = entry(name), trace = traceStyles(e, channel);
        const ink = drawingInk(trace, channel);
        for (const id of ['arrow_left-head-topology', 'arrow_left-endpoint', 'arrow_right-head-topology', 'arrow_right-endpoint', 'arrow_both-head-topology', 'both-heads-present']) facet(name, id);
        const paints = trace.paints.filter(p => p.color?.slice(0, 7).toLowerCase() === '#2962ff');
        expect(paints.every(p => p.kind === 'stroke')).toBe(true);
        expect(paints).toHaveLength(7);
        const left = trace.x(e.anchor - 85), right = trace.x(e.anchor - 15);
        const shafts = paints.filter(p => near(Math.min(...p.commands.map(c => c.x)), left) && near(Math.max(...p.commands.map(c => c.x)), right));
        expect(shafts).toHaveLength(3);
        const heads = paints.filter(p => !shafts.includes(p));
        expect(heads.every(p => p.commands.every(c => c.op !== 'Z'))).toBe(true);
        expect(segments(heads)).toHaveLength(8);
        for (const [value, ends] of [[20, ['left']], [50, ['right']], [80, ['left', 'right']]] as [number, string[]][]) {
          const shaft = shafts.filter(p => p.commands.some(c => near(c.x, left) && near(c.y, 100 - value)));
          expect(shaft).toHaveLength(1);
          expectVisiblePaint(shaft[0]);
          for (const [a, b] of segments(shaft)) {
            const pixel = ink((a.x + b.x) / 2, (a.y + b.y) / 2);
            expect(pixel[3]).toBeGreaterThan(0);
            expect(pixel[2]).toBeGreaterThan(pixel[0]);
            expect(pixel[2]).toBeGreaterThan(pixel[1]);
          }
          expect(shaft[0].commands.map(c => ({ x: c.x, y: c.y })).sort((a, b) => a.x - b.x)).toEqual([
            { x: left, y: 100 - value }, { x: trace.x(e.anchor - 50), y: 95 - value }, { x: right, y: 100 - value },
          ]);
          for (const [name, x] of [['left', left], ['right', right]] as const) {
            const connected = segments(heads).filter(([a, b]) => (near(a.x, x) && near(a.y, 100 - value)) || (near(b.x, x) && near(b.y, 100 - value)));
            expect(connected).toHaveLength(ends.includes(name) ? 2 : 0);
            if (!ends.includes(name)) continue;
            const tip = { x, y: 100 - value };
            const atTip = (p: { x: number; y: number }) => near(p.x, tip.x) && near(p.y, tip.y);
            const head = heads.filter(p => segments([p]).some(([a, b]) => atTip(a) || atTip(b)));
            expect(head).toHaveLength(1);
            expectVisiblePaint(head[0]);
            expect(head[0].lineWidth).toBeGreaterThan(0);
            const interior = shaft[0].commands[1];
            const tangent = { x: interior.x - tip.x, y: interior.y - tip.y };
            const tangentLength = Math.hypot(tangent.x, tangent.y);
            const wings = connected.map(([a, b]) => atTip(a) ? b : a);
            const vectors = wings.map(wing => ({ x: wing.x - tip.x, y: wing.y - tip.y }));
            for (const wing of vectors) {
              // Reject local heads shorter than their stroke; exact native head metrics remain unscored.
              expect(Math.hypot(wing.x, wing.y)).toBeGreaterThan(head[0].lineWidth!);
              expect(wing.x * tangent.x + wing.y * tangent.y).toBeGreaterThan(0);
              const pixel = ink(tip.x + wing.x * 0.75, tip.y + wing.y * 0.75);
              expect(pixel[3]).toBeGreaterThan(0);
              expect(pixel[2]).toBeGreaterThan(pixel[0]);
              expect(pixel[2]).toBeGreaterThan(pixel[1]);
            }
            const sides = vectors.map(wing => (tangent.x * wing.y - tangent.y * wing.x) / tangentLength);
            for (const side of sides) expect(Math.abs(side)).toBeGreaterThan(head[0].lineWidth!);
            expect(sides[0] * sides[1]).toBeLessThan(0);
            expect(vectors[0].x * vectors[1].y - vectors[0].y * vectors[1].x).not.toBe(0);
          }
        }
      });
    }
    it('keeps yellow phase3/4 fill holes while aqua bridges and the hline purple band stays positive', () => {
      const name = 'fillgaps-overloads-v6';
      for (const id of ['plot-fill-false', 'plot-fill-true', 'hline-fill-positive']) facet(name, id);
      const e = entry(name), trace = traceStyles(e, channel);
      expectVisibleColors(trace, '#fdd835', '#00bcd4', '#9c27b0');
      const polygons = (hex: string) => color(trace.paints, hex).filter(p => p.kind === 'fill').flatMap(p => {
        const islands: { x: number; y: number }[][] = [];
        for (const c of p.commands) {
          if (c.op === 'M') islands.push([]);
          if (c.op === 'M' || c.op === 'L') islands.at(-1)?.push(c);
        }
        return islands;
      });
      const yellow = polygons('#fdd835'), aqua = polygons('#00bcd4'), purple = polygons('#9c27b0');
      expect(yellow.length).toBeGreaterThan(0); expect(aqua.length).toBeGreaterThan(0); expect(purple.length).toBeGreaterThan(0);
      expect(yellow.flat().every(c => near(c.y, 60) || near(c.y, 80))).toBe(true);
      expect(aqua.flat().every(c => near(c.y, 20) || near(c.y, 40))).toBe(true);
      const covers = (polys: { x: number; y: number }[][], x: number) => polys.some(p => Math.min(...p.map(c => c.x)) < x && Math.max(...p.map(c => c.x)) > x);
      for (const row of e.primary.filter(r => e.csv.raw(r, 'CASE_ID') === '3' && r + 2 <= e.anchor)) {
        const x = (trace.x(row) + trace.x(row + 1)) / 2;
        expect(covers(yellow, x)).toBe(false); expect(covers(aqua, x)).toBe(true); expect(covers(purple, x)).toBe(true);
      }
      expect(purple.flat().every(c => near(c.y, 4) || near(c.y, 10))).toBe(true);
    });
    it('joins adjacent blue circles without crossing holes, leaving aqua isolated', () => {
      facet('plot-controls-v6', 'circle-join');
      const e = entry('plot-controls-v6'), trace = traceStyles(e, channel);
      expectVisibleColors(trace, '#2962ff', '#00bcd4');
      const joins = segments(blue(trace.paints).filter(p => p.kind === 'stroke'));
      for (const [title, hex] of [['JOIN', '#2962ff'], ['NOJOIN', '#00bcd4']]) {
        const circles = color(trace.paints, hex).flatMap(p => p.commands.filter(c => c.op === 'C'));
        for (const row of e.primary) {
          const raw = e.csv.raw(row, title), points = circles.filter(c => near(c.x, trace.x(row)));
          expect(points).toHaveLength(raw === '' ? 0 : 1);
          if (raw !== '') expect(near(points[0].y, 100 - Number(raw))).toBe(true);
        }
      }
      expect(joins.length).toBeGreaterThan(0);
      for (const row of e.primary) {
        const phase = Number(e.csv.raw(row, 'CASE_ID'));
        if (phase % 4 === 0 && row < e.anchor) expect(joins.some(([a, b]) => near(a.x, trace.x(row)) && near(b.x, trace.x(row + 1)) && near(a.y, 100 - Number(e.csv.raw(row, 'JOIN'))) && near(b.y, 100 - Number(e.csv.raw(row + 1, 'JOIN'))))).toBe(true);
        if (phase % 4 === 2 && row + 2 <= e.anchor) expect(joins.some(([a, b]) => a.x < trace.x(row) && b.x > trace.x(row + 1))).toBe(false);
      }
      expect(segments(color(trace.paints, '#00bcd4').filter(p => p.kind === 'stroke'))).toHaveLength(0);
    });
    it('suppresses historical orange markers while preserving a positive tail and the long red tracker', () => {
      for (const id of ['show-last', 'trackprice']) facet('plot-controls-v6', id);
      const e = entry('plot-controls-v6'), trace = traceStyles(e, channel);
      expectVisibleColors(trace, '#ff9800', '#f23645');
      const orange = color(trace.paints, '#ff9800').flatMap(p => p.commands.filter(c => c.op === 'C'));
      expect(orange).toHaveLength(4);
      expect(orange.every(c => c.x > trace.x(e.anchor - 10) && near(c.y, 35))).toBe(true);
      for (let row = e.anchor - 3; row <= e.anchor; row++) expect(orange.some(c => near(c.x, trace.x(row)))).toBe(true);
      const tracker = segments(color(trace.paints, '#f23645').filter(p => p.kind === 'stroke'));
      expect(tracker.some(([a, b]) => a.x < trace.x(e.anchor - 95) && b.x > trace.x(e.anchor - 10) && near(a.y, 10) && near(b.y, 10))).toBe(true);
    });
    it('places upper squares at value80, makes the lower squares larger and paints the literal X', () => {
      for (const id of ['shape-size', 'shape-absolute-location', 'literal-char']) facet('markers-v6', id);
      const e = entry('markers-v6'), trace = traceStyles(e, channel);
      expectVisibleColors(trace, '#2962ff', '#ff9800');
      const squares = blue(trace.paints).flatMap(p => p.commands.filter(c => c.op === 'R'));
      const small = squares.filter(c => near(c.y + (c.h ?? 0) / 2, 20));
      const large = squares.filter(c => near(c.y + (c.h ?? 0) / 2, 40));
      expect(small.length).toBeGreaterThan(4); expect(large.length).toBeGreaterThan(4);
      expect(Math.min(...large.map(c => c.w!))).toBeGreaterThan(Math.max(...small.map(c => c.w!)));
      for (const [title, rectangles] of [['SMALL_SQUARE', small], ['LARGE_SQUARE', large]] as const) {
        for (const row of e.primary) {
          const match = rectangles.filter(c => near(c.x + c.w! / 2, trace.x(row)));
          expect(match).toHaveLength(e.csv.raw(row, title) === '' ? 0 : 1);
        }
      }
      const chars = color(trace.paints, '#ff9800').filter(p => p.kind === 'text').flatMap(p => p.commands);
      expect(chars.length).toBeGreaterThan(4); expect(chars.every(c => c.text === 'X')).toBe(true);
      for (const row of e.primary) {
        const match = chars.filter(c => c.anchorX !== undefined && near(c.anchorX, trace.x(row)));
        expect(match).toHaveLength(e.csv.raw(row, 'CHAR_X') === '' ? 0 : 1);
        if (match.length) expect(near(match[0].anchorY!, 100 - Number(e.csv.raw(row, 'CHAR_X')))).toBe(true);
      }
    });
    it('varies positive plotarrow heights with magnitude while sign-direction remains held', () => {
      const name = 'plotarrow-height-v6', e = entry(name), trace = traceStyles(e, channel);
      facet(name, 'relative-height');
      expectVisibleColors(trace, '#2962ff');
      expect(e.regions.facets.find((f: any) => f.facetId.endsWith(':sign-direction')).verdict).toBe('UNDECIDED');
      const height = (row: number) => {
        const x = trace.x(row);
        const islands: typeof trace.paints[number]['commands'][] = [];
        for (const p of blue(trace.paints)) for (const c of p.commands) {
          if (c.op === 'M') islands.push([]);
          if (c.op === 'M' || c.op === 'L') islands.at(-1)?.push(c);
        }
        const points = islands.find(p => near(p[0].x, x)) ?? [];
        expect(points.length).toBeGreaterThan(1);
        expect(points.every(p => p.y > 0 && p.y < trace.height)).toBe(true);
        return Math.max(...points.map(c => c.y)) - Math.min(...points.map(c => c.y));
      };
      const rows = [0, 8, 16].map(phase => e.primary.find(r => e.csv.raw(r, 'ARROW_PHASE') === String(phase))!);
      const heights = rows.map(height);
      expect(heights.every(h => h >= 8 && h <= 24)).toBe(true);
      expect(heights[0]).toBeLessThan(heights[1]); expect(heights[1]).toBeLessThan(heights[2]);
    });
  });
}
