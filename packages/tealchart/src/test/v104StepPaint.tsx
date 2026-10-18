import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { StepEntry } from '../../../tealscript/tests/fixtures/v104Step';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { NativeViewportSharedValues } from '../mobile/render/nativeSharedViewport';

import { createCanvas } from '@napi-rs/canvas';
import { Children, Fragment } from 'react';

import { DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';

import { executeStep } from '../../../tealscript/tests/fixtures/v104Step';
import { TealchartRenderer } from '../TealchartRenderer';
import { createNativeChartFrameFromPanes } from '../mobile/render/nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from '../mobile/render/NativeIndicatorPlotLayer';
import { createNativeChartProjection } from '../mobile/render/nativeProjection';
import { resolved } from './nativePlotPaintHarness';

export type StepChannel = 'web' | 'web-pane' | 'web-unified' | 'web-index' | 'native' | 'native-static';
export interface StepCommand { op: string; x: number; y: number }
export interface StepPaint { kind: 'stroke' | 'fill'; color: string; commands: StepCommand[]; dash: number[] }
export function traceStep(entry: StepEntry, channel: StepChannel, variant: Partial<PlotOutput> = {}) {
  const { result, bars } = executeStep(entry);
  const plot = { ...result.plots.find(p => p.title === 'STEP')!, ...variant, scriptId: 's' } as PlotOutput;
  const viewport = { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: 0, priceMax: 100 };
  const paints: StepPaint[] = [];
  const canvas = createCanvas(1000, 100);
  const ink = canvas.getContext('2d');
  if (channel.startsWith('web')) {
    let commands: StepCommand[] = [];
    const ctx = new Proxy(ink, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        return (...args: any[]) => {
          if (key === 'beginPath') commands = [];
          if (key === 'moveTo' || key === 'lineTo') commands.push({ op: key === 'moveTo' ? 'M' : 'L', x: args[0], y: args[1] });
          if (key === 'closePath') commands.push({ op: 'Z', x: 0, y: 0 });
          if (key === 'stroke' || key === 'fill') paints.push({
            kind: key, color: String(key === 'stroke' ? target.strokeStyle : target.fillStyle),
            commands: [...commands], dash: target.getLineDash(),
          });
          return value.apply(target, args);
        };
      },
      set(target, key, value) { return Reflect.set(target, key, value); },
    }) as unknown as CanvasContext;
    const renderer = new TealchartRenderer(ctx, { width: 1000, height: 100, showVolume: false, devicePixelRatio: 1, backgroundColor: '#00000000', gridColor: '#00000000', textColor: '#00000000' }, { left: 0, right: 0, top: 0, bottom: 0 });
    if (channel === 'web') renderer.renderPlots([plot], bars, viewport);
    else if (channel === 'web-pane') renderer.renderPlots([plot], bars, viewport, {
      mainPaneHeight: 0, volumePaneHeight: 0, indicatorPanes: [{ id: 'study', indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100 }],
    }, { s: { overlay: false } });
    else if (channel === 'web-index') renderer.renderExternalOverlayContent({ bars, viewport, plots: [plot],
      projection: { panes: [{ id: 'main', type: 'main', heightRatio: 1, fixedRange: true, top: 0, bottom: 100, height: 100, yMin: 0, yMax: 100 }],
        barSpacingPx: 1000 / (bars.length - 1),
        barIndexToX: i => i * 1000 / (bars.length - 1),
        timeToX: t => (t - viewport.startTime) * 1000 / (viewport.endTime - viewport.startTime),
        valueToY: v => 100 - v }, indicatorPaneInfo: { s: { overlay: true } },
    });
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
    const paintNode = (node: ReactNode): void => {
      if (Array.isArray(node)) { node.forEach(paintNode); return; }
      if (!node || typeof node !== 'object' || !('props' in node)) return;
      const element = node as ReactElement<Record<string, any>>;
      if (element.type === Fragment) { paintNode(element.props.children); return; }
      if (typeof element.type === 'function' && element.type !== Group && element.type !== Path) {
        paintNode((element.type as (props: any) => ReactNode)(element.props)); return;
      }
      const props = element.props;
      const supported = ['children', 'opacity', 'clip', 'invertClip', 'transform', ...(element.type === Path
        ? ['path', 'style', 'color', 'strokeWidth', 'strokeCap', 'strokeJoin'] : [])];
      const unsupported = Object.keys(props).filter(key => !supported.includes(key));
      if (unsupported.length) throw new Error(`Unsupported native step paint fields: ${unsupported.join(', ')}`);
      ink.save();
      ink.globalAlpha *= Number(resolved(props.opacity ?? 1));
      for (const transform of resolved<any[]>(props.transform ?? [])) {
        if ('translateX' in transform) ink.translate(transform.translateX, 0);
        else if ('translateY' in transform) ink.translate(0, transform.translateY);
        else if ('scale' in transform) ink.scale(transform.scale, transform.scale);
        else throw new Error(`Unsupported native step transform: ${JSON.stringify(transform)}`);
      }
      if (props.clip) {
        const clip = resolved<any>(props.clip);
        if (!['x', 'y', 'width', 'height'].every(key => typeof clip[key] === 'number')) throw new Error('Unsupported native step clip');
        ink.beginPath();
        if (props.invertClip) ink.rect(-10000, -10000, 20000, 20000);
        ink.rect(clip.x, clip.y, clip.width, clip.height);
        ink.clip(props.invertClip ? 'evenodd' : 'nonzero');
      }
      if (element.type === Path) {
        const path = resolved<any>(props.path);
        const commands = (['moveTo', 'lineTo', 'close', 'addCircle'] as const).flatMap(name =>
          path[name].mock.calls.map((args: number[], i: number) => ({ order: path[name].mock.invocationCallOrder[i], op: { moveTo: 'M', lineTo: 'L', close: 'Z', addCircle: 'C' }[name], x: args[0] ?? 0, y: args[1] ?? 0 })))
          .sort((a, b) => a.order - b.order);
        const effects = Children.toArray(props.children);
        if (effects.length > 1 || effects.some(effect => typeof effect !== 'object' || !('type' in effect) || effect.type !== DashPathEffect)) throw new Error('Unsupported native step path effect');
        const effect = effects[0] as ReactElement<Record<string, any>> | undefined;
        if (effect && Object.keys(effect.props).some(key => !['intervals', 'phase'].includes(key))) throw new Error('Unsupported native step dash effect');
        ink.strokeStyle = ink.fillStyle = resolved<string>(props.color);
        ink.lineWidth = Number(resolved(props.strokeWidth ?? 1));
        ink.lineCap = props.strokeCap ?? 'butt';
        ink.lineJoin = props.strokeJoin ?? 'miter';
        ink.setLineDash(resolved<number[]>(effect?.props.intervals ?? []));
        ink.lineDashOffset = Number(resolved(effect?.props.phase ?? 0));
        ink.beginPath();
        for (const point of commands) {
          if (point.op === 'M') ink.moveTo(point.x, point.y);
          else if (point.op === 'L') ink.lineTo(point.x, point.y);
          else if (point.op === 'Z') ink.closePath();
          else throw new Error('Unsupported native step path command');
        }
        if (props.style === 'stroke') ink.stroke(); else ink.fill();
        paints.push({ kind: props.style === 'stroke' ? 'stroke' : 'fill', color: resolved<string>(props.color), commands, dash: ink.getLineDash() });
      } else if (element.type === Group) paintNode(props.children);
      else throw new Error('Unsupported native step paint node');
      ink.restore();
    };
    paintNode(tree);
  }
  const x = (row: number) => (Number(entry.csv.raw(row, 'time')) * 1000 - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000;
  const colors = new Set((Array.isArray(plot.color) ? plot.color : [plot.color]).filter((c): c is string => typeof c === 'string').map(c => c.slice(0, 7)));
  return { ink: ink.getImageData(0, 0, 1000, 100), paints: paints.filter(p => colors.has(p.color?.slice(0, 7))), x, result, bars, plot };
}

export function stepSegments(paints: StepPaint[]) {
  return paints.flatMap(paint => {
    let previous: StepCommand | undefined;
    return paint.commands.flatMap(point => {
      const segment = point.op === 'L' && previous ? [[previous, point]] : [];
      previous = point.op === 'Z' ? undefined : point;
      return segment;
    });
  });
}
