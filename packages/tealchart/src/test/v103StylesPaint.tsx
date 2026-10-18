import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { StyleEntry } from '../../../tealscript/tests/fixtures/v103Styles';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { NativeViewportSharedValues } from '../mobile/render/nativeSharedViewport';

import { DashPathEffect, Path, Skia, Text } from '@shopify/react-native-skia';

import { executeStyle } from '../../../tealscript/tests/fixtures/v103Styles';
import { TealchartRenderer } from '../TealchartRenderer';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { createNativeChartFrameFromPanes } from '../mobile/render/nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from '../mobile/render/NativeIndicatorPlotLayer';
import { createNativeChartProjection } from '../mobile/render/nativeProjection';
import { nativePrimitives, resolved } from './nativePlotPaintHarness';
import { DEFAULT_RENDER_OPTIONS } from '../types';

export type StyleChannel = 'web' | 'web-pane' | 'web-unified' | 'native' | 'native-static';
export interface StyleCommand { op: string; x: number; y: number; w?: number; h?: number; text?: string; anchorX?: number; anchorY?: number; anchorOffsetX?: number; anchorOffsetY?: number }
export interface StylePaint { kind: 'stroke' | 'fill' | 'text'; color: string; commands: StyleCommand[]; dash: number[]; globalAlpha?: number; lineWidth?: number; font?: string; textAlign?: CanvasTextAlign; textBaseline?: CanvasTextBaseline }
export function traceStyles(entry: StyleEntry, channel: StyleChannel) {
  const { result, bars } = executeStyle(entry);
  const plots = result.plots.map(p => ({ ...p, scriptId: 's' })) as PlotOutput[];
  const arrow = entry.id.includes('plotarrow');
  const height = arrow ? 1000 : 100;
  const min = arrow ? Math.min(...bars.map(b => b.low)) - 100 : 0;
  const max = arrow ? Math.max(...bars.map(b => b.high)) + 100 : 100;
  const viewport = { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: min, priceMax: max };
  const paints: StylePaint[] = [];
  let commands: StyleCommand[] = [], dash: number[] = [];
  const states: any[] = [];
  const noop = () => {};
  const ctx: CanvasContext = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top', lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath: () => { commands = []; }, moveTo: (x, y) => { commands.push({ op: 'M', x, y }); }, lineTo: (x, y) => { commands.push({ op: 'L', x, y }); },
    arc: (x, y, r) => { commands.push({ op: 'C', x, y, w: r }); }, closePath: () => { commands.push({ op: 'Z', x: 0, y: 0 }); },
    fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle), commands: [...commands], dash: [...dash], globalAlpha: ctx.globalAlpha, lineWidth: ctx.lineWidth }),
    stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), commands: [...commands], dash: [...dash], globalAlpha: ctx.globalAlpha, lineWidth: ctx.lineWidth }),
    rect: (x, y, w, h) => { commands.push({ op: 'R', x, y, w, h }); }, roundRect: noop, quadraticCurveTo: noop, bezierCurveTo: noop, clip: noop, scale: noop, translate: noop,
    fillRect: (x, y, w, h) => paints.push({ kind: 'fill', color: String(ctx.fillStyle), commands: [{ op: 'R', x, y, w, h }], dash: [], globalAlpha: ctx.globalAlpha, lineWidth: ctx.lineWidth }), strokeRect: noop,
    fillText: (text, x, y) => paints.push({ kind: 'text', color: String(ctx.fillStyle), commands: [{ op: 'T', text, x, y, anchorX: ctx.textAlign === 'center' ? x : undefined, anchorY: ctx.textBaseline === 'middle' ? y : undefined, anchorOffsetX: ctx.textAlign === 'center' ? 0 : undefined, anchorOffsetY: ctx.textBaseline === 'middle' ? 0 : undefined }], dash: [], globalAlpha: ctx.globalAlpha, lineWidth: ctx.lineWidth, font: ctx.font, textAlign: ctx.textAlign, textBaseline: ctx.textBaseline }),
    save: () => { states.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha, font: ctx.font, textAlign: ctx.textAlign, textBaseline: ctx.textBaseline, dash: [...dash] }); },
    restore: () => { const state = states.pop(); if (state) { Object.assign(ctx, state); dash = state.dash; } },
    setLineDash: values => { dash = [...values]; }, getLineDash: () => [...dash], measureText: s => ({ width: s.length * 7 }) as TextMetrics,
  };
  const margins = { left: 0, right: 0, top: 0, bottom: 0 };
  const pane = { id: 'study', type: 'indicator' as const, indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: min, yMax: max, top: 0, bottom: height, height };
  const drawings = result.drawings.map(d => ({ ...d, scriptId: 's' }));
  if (entry.id.includes('polyline')) {
    if (channel.startsWith('web')) new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width: 1000 }, margins, font: 'sans-serif',
      coordinateResolvers: { timeToX: time => (time - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000, valueToY: value => 100 - value },
      getTextWidth: (active, text) => active.measureText(text).width }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
    else paintNativeTealScriptDrawings({ ctx, drawings, bars, viewport, panes: [pane], width: 1000, margins });
  } else if (channel.startsWith('web')) {
    const renderer = new TealchartRenderer(ctx, { width: 1000, height, showVolume: false, devicePixelRatio: 1 }, margins);
    if (channel === 'web') renderer.renderPlots(plots, bars, viewport);
    else if (channel === 'web-pane') renderer.renderPlots(plots, bars, viewport, {
      mainPaneHeight: 0, volumePaneHeight: 0, indicatorPanes: [{ id: 'study', indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: min, yMax: max }],
    }, { s: { overlay: false } });
    else renderer.renderWithLayoutPasses({ bars, viewport, plots,
      layout: { timeAxisHeight: 0, panes: [{ id: 'main', type: 'main', heightRatio: 1, yMin: min, yMax: max, fixedRange: true }] },
      indicatorPaneInfo: { s: { overlay: true } }, passes: ['main-overlay-content'] });
  } else {
    const frame = createNativeChartFrameFromPanes({ dimensions: { width: 1000, height: height + 20, margins: { ...margins, bottom: 20 } },
      panes: [{ id: 'main', type: 'main', top: 0, height: arrow ? height : 0, yMin: min, yMax: max }, { id: 'study', type: 'indicator', top: 0, height: arrow ? 0 : height, yMin: min, yMax: max }] });
    const sharedViewport = { startTime: { value: viewport.startTime }, endTime: { value: viewport.endTime }, priceMin: { value: min }, priceMax: { value: max } } as NativeViewportSharedValues;
    const visibleBars = bars.map((bar, sourceIndex) => ({ ...bar, sourceIndex, interval: sourceIndex ? bar.time - bars[sourceIndex - 1].time : bars[1].time - bar.time, x: sourceIndex / (bars.length - 1) * 1000 }));
    const tree = NativeIndicatorPlotLayerImpl({ frame, bars, plots, visibleBars, totalBarCount: bars.length,
      indicatorPaneInfo: { s: { overlay: arrow, paneId: arrow ? 'main' : 'study' } }, sharedViewport, paneRangeOverrides: { value: {} } as SharedValue<any>, textFont: Skia.Font(undefined, 12),
      staticProjection: channel === 'native-static' ? createNativeChartProjection({ frame, viewport }) : undefined });
    for (const node of nativePrimitives(tree)) {
      if (node.type === Text) {
        const text = resolved<string>(node.props.text), font = node.props.font, metrics = font.getMetrics();
        const x = resolved<number>(node.props.x), y = resolved<number>(node.props.y);
        paints.push({ kind: 'text', color: resolved(node.props.color), commands: [{ op: 'T', x, y, text,
          anchorX: x + font.measureText(text).width / 2, anchorY: y - (-metrics.ascent - metrics.descent) / 2,
          anchorOffsetX: font.measureText(text).width / 2, anchorOffsetY: -(-metrics.ascent - metrics.descent) / 2 }], dash: [], globalAlpha: node.opacity, font: `${font.getSize()}px sans-serif`, textAlign: 'left', textBaseline: 'alphabetic' });
      }
      if (node.type !== Path) continue;
      const path = resolved<any>(node.props.path);
      const commands = (['moveTo', 'lineTo', 'close', 'addCircle', 'addRect'] as const).flatMap(name =>
        path[name].mock.calls.map((args: any[], i: number) => ({ order: path[name].mock.invocationCallOrder[i], op: { moveTo: 'M', lineTo: 'L', close: 'Z', addCircle: 'C', addRect: 'R' }[name],
          x: name === 'addRect' ? args[0].x : args[0] ?? 0, y: name === 'addRect' ? args[0].y : args[1] ?? 0, w: name === 'addRect' ? args[0].width : args[2], h: name === 'addRect' ? args[0].height : undefined })))
        .sort((a, b) => a.order - b.order);
      const effect = nativePrimitives(node.props.children).find(p => p.type === DashPathEffect);
      paints.push({ kind: node.props.style === 'stroke' ? 'stroke' : 'fill', color: resolved(node.props.color), commands, dash: resolved<number[]>(effect?.props.intervals ?? []), globalAlpha: node.opacity, lineWidth: resolved<number>(node.props.strokeWidth ?? 1) });
    }
  }
  const x = (row: number) => (Number(entry.csv.raw(row, 'time')) * 1000 - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000;
  return { paints, x, result, bars, viewport, height };
}
export function segments(paints: StylePaint[]) {
  return paints.flatMap(p => p.commands.flatMap((point, i) => point.op === 'L' && i ? [[p.commands[i - 1], point]] : []));
}

export function stylePaintGlyphs(paint: StylePaint): StylePaint[] {
  const glyphs: StylePaint[] = [];
  let commands: StyleCommand[] = [];
  const flush = () => {
    if (commands.some(c => c.op === 'L')) glyphs.push({ ...paint, commands });
    commands = [];
  };
  for (const command of paint.commands) {
    if (['C', 'R', 'T'].includes(command.op)) {
      flush();
      glyphs.push({ ...paint, commands: [command] });
    } else if (command.op === 'M') {
      flush();
      commands.push(command);
    } else commands.push(command);
  }
  flush();
  return glyphs;
}
