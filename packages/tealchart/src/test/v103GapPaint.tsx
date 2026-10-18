import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { GapEntry } from '../../../tealscript/tests/fixtures/v103Gap';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { NativeViewportSharedValues } from '../mobile/render/nativeSharedViewport';

import { DashPathEffect, Path, Skia } from '@shopify/react-native-skia';

import { executeGap } from '../../../tealscript/tests/fixtures/v103Gap';
import { TealchartRenderer } from '../TealchartRenderer';
import { createNativeChartFrameFromPanes } from '../mobile/render/nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from '../mobile/render/NativeIndicatorPlotLayer';
import { createNativeChartProjection } from '../mobile/render/nativeProjection';
import { nativePrimitives, resolved } from './nativePlotPaintHarness';

export type GapChannel = 'web' | 'web-pane' | 'web-unified' | 'native' | 'native-static';
export interface GapCommand { op: string; x: number; y: number }
export interface GapPaint { kind: 'stroke' | 'fill'; color: string; commands: GapCommand[]; dash: number[] }
export function traceGap(entry: GapEntry, title: string, channel: GapChannel) {
  const { result, bars } = executeGap(entry);
  const plot = { ...result.plots.find(p => p.title === title)!, scriptId: 's' } as PlotOutput;
  const viewport = { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: 0, priceMax: 100 };
  const paints: GapPaint[] = [];
  if (channel.startsWith('web')) {
    let commands: GapCommand[] = [];
    let dash: number[] = [];
    const states: any[] = [];
    const noop = () => {};
    const ctx: CanvasContext = {
      fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top', lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
      beginPath: () => { commands = []; }, moveTo: (x, y) => { commands.push({ op: 'M', x, y }); }, lineTo: (x, y) => { commands.push({ op: 'L', x, y }); },
      arc: (x, y) => { commands.push({ op: 'C', x, y }); }, closePath: () => { commands.push({ op: 'Z', x: 0, y: 0 }); },
      fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle), commands: [...commands], dash: [...dash] }),
      stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), commands: [...commands], dash: [...dash] }),
      rect: noop, roundRect: noop, quadraticCurveTo: noop, bezierCurveTo: noop, clip: noop, scale: noop, translate: noop, fillRect: noop, strokeRect: noop, fillText: noop,
      save: () => { states.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, dash: [...dash] }); },
      restore: () => { const state = states.pop(); if (state) { Object.assign(ctx, state); dash = state.dash; } },
      setLineDash: values => { dash = [...values]; }, getLineDash: () => [...dash], measureText: s => ({ width: s.length * 7 }) as TextMetrics,
    };
    const renderer = new TealchartRenderer(ctx, { width: 1000, height: 100, showVolume: false, devicePixelRatio: 1 }, { left: 0, right: 0, top: 0, bottom: 0 });
    if (channel === 'web') renderer.renderPlots([plot], bars, viewport);
    else if (channel === 'web-pane') renderer.renderPlots([plot], bars, viewport, {
      mainPaneHeight: 0, volumePaneHeight: 0, indicatorPanes: [{ id: 'study', indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100 }],
    }, { s: { overlay: false } });
    else renderer.renderWithLayoutPasses({ bars, viewport, plots: [plot],
      layout: { timeAxisHeight: 0, panes: [{ id: 'main', type: 'main', heightRatio: 1, yMin: 0, yMax: 100, fixedRange: true }] },
      indicatorPaneInfo: { s: { overlay: true } }, passes: ['main-overlay-content'],
    });
  } else {
    const frame = createNativeChartFrameFromPanes({ dimensions: { width: 1000, height: 120, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
      panes: [{ id: 'main', type: 'main', top: 0, height: 0, yMin: 0, yMax: 100 }, { id: 'study', type: 'indicator', top: 0, height: 100, yMin: 0, yMax: 100 }] });
    const sharedViewport = { startTime: { value: viewport.startTime }, endTime: { value: viewport.endTime }, priceMin: { value: 0 }, priceMax: { value: 100 } } as NativeViewportSharedValues;
    const visibleBars = bars.map((bar, sourceIndex) => ({ ...bar, sourceIndex, interval: sourceIndex ? bar.time - bars[sourceIndex - 1].time : bars[1].time - bar.time, x: sourceIndex / (bars.length - 1) * 1000 }));
    const tree = NativeIndicatorPlotLayerImpl({ frame, bars, plots: [plot], visibleBars, totalBarCount: bars.length,
      indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } }, sharedViewport,
      paneRangeOverrides: { value: {} } as SharedValue<any>, textFont: Skia.Font(undefined, 12),
      staticProjection: channel === 'native-static' ? createNativeChartProjection({ frame, viewport }) : undefined });
    for (const node of nativePrimitives(tree).filter(p => p.type === Path)) {
      const path = resolved<any>(node.props.path);
      const commands = (['moveTo', 'lineTo', 'close', 'addCircle'] as const).flatMap(name =>
        path[name].mock.calls.map((args: number[], i: number) => ({ order: path[name].mock.invocationCallOrder[i], op: { moveTo: 'M', lineTo: 'L', close: 'Z', addCircle: 'C' }[name], x: args[0] ?? 0, y: args[1] ?? 0 })))
        .sort((a, b) => a.order - b.order);
      const effect = nativePrimitives(node.props.children).find(p => p.type === DashPathEffect);
      paints.push({ kind: node.props.style === 'stroke' ? 'stroke' : 'fill', color: node.props.color, commands, dash: effect?.props.intervals ?? [] });
    }
  }
  const x = (row: number) => (Number(entry.csv.raw(row, 'time')) * 1000 - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000;
  const colors = new Set((Array.isArray(plot.color) ? plot.color : [plot.color]).filter((c): c is string => typeof c === 'string').map(c => c.slice(0, 7)));
  return { paints: paints.filter(p => colors.has(p.color?.slice(0, 7))), x, result, bars, plot };
}

export function gapSegments(paints: GapPaint[]) {
  return paints.flatMap(paint => {
    let previous: GapCommand | undefined;
    return paint.commands.flatMap(point => {
      const segment = point.op === 'L' && previous ? [[previous, point]] : [];
      previous = point.op === 'Z' ? undefined : point;
      return segment;
    });
  });
}
