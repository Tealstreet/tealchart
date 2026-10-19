import type { PlotOutput } from '@tealstreet/tealscript';
import type { CanvasContext } from './CanvasContext';
import type { NativeViewportSharedValues } from '../mobile/render/nativeSharedViewport';

import { createCanvas } from '@napi-rs/canvas';
import { Path, Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { TealchartRenderer } from '../TealchartRenderer';
import { NativeIndicatorPlotLayerImpl } from '../mobile/render/NativeIndicatorPlotLayer';
import { createNativeChartFrameFromPanes } from '../mobile/render/nativeChartFrame';
import { createNativeChartProjection } from '../mobile/render/nativeProjection';
import { nativePrimitives, resolved } from '../test/nativePlotPaintHarness';
import { stepSegments, type StepCommand, type StepPaint } from '../test/v104StepPaint';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));

const viewport = { startTime: 0, endTime: 12000, priceMin: 0, priceMax: 100 };
const pane = { id: 'main', type: 'main' as const, heightRatio: 1, fixedRange: true, top: 0, bottom: 100, height: 100, yMin: 0, yMax: 100 };
const routes = ['web', 'web-pane', 'web-unified', 'web-index', 'native', 'native-static', 'native-projected'] as const;

for (const [gap, times] of Object.entries({ first: [0, 6000, 7000, 8000, 9000], later: [0, 1000, 7000, 8000, 9000] })) {
  for (const route of routes) for (const series of [false, true]) describe(`${gap} interval gap ${route} ${series ? 'series' : 'scalar'}`, () => {
    it('binds every own turn and both arms to the midpoint of adjacent projected source points', () => {
      const bars = times.map(time => ({ time, open: 10, high: 20, low: 5, close: 15, volume: 1 }));
      const plot: PlotOutput = { id: 'step', scriptId: 's', type: 'plot', title: 'Step', style: 'stepline',
        values: [10, 30, 20, 60, 40], color: series ? ['#2962ff', '#00aa00', '#ff8800', '#2962ff', '#00aa00'] : '#2962ff' };
      const projectedX = (time: number) => route === 'native-projected' ? (time / 1000) ** 2 * 10 : time / 10;
      const sampleX = (i: number) => route === 'web-index' ? i * 100 : projectedX(times[i]);
      const paints: StepPaint[] = [];
      if (route.startsWith('web')) {
        let commands: StepCommand[] = [];
        const ink = createCanvas(1200, 100).getContext('2d');
        const ctx = new Proxy(ink, {
          get(target, key) {
            const value = Reflect.get(target, key);
            if (typeof value !== 'function') return value;
            return (...args: any[]) => {
              if (key === 'beginPath') commands = [];
              if (key === 'moveTo' || key === 'lineTo') commands.push({ op: key === 'moveTo' ? 'M' : 'L', x: args[0], y: args[1] });
              if (key === 'stroke') paints.push({ kind: 'stroke', color: String(target.strokeStyle), dash: [], commands: [...commands] });
              return value.apply(target, args);
            };
          },
          set(target, key, value) { return Reflect.set(target, key, value); },
        }) as unknown as CanvasContext;
        const renderer = new TealchartRenderer(ctx, { width: 1200, height: 100, showVolume: false, devicePixelRatio: 1 }, { left: 0, right: 0, top: 0, bottom: 0 });
        if (route === 'web') renderer.renderPlots([plot], bars, viewport);
        else if (route === 'web-pane') renderer.renderPlots([plot], bars, viewport, {
          mainPaneHeight: 0, volumePaneHeight: 0, indicatorPanes: [{ id: 'study', indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100 }],
        }, { s: { overlay: false } });
        else if (route === 'web-index') renderer.renderExternalOverlayContent({ bars, viewport, plots: [plot],
          projection: { panes: [pane], barSpacingPx: 100, barIndexToX: i => i * 100, timeToX: projectedX, valueToY: v => 100 - v },
          indicatorPaneInfo: { s: { overlay: true } },
        });
        else renderer.renderWithLayoutPasses({ bars, viewport, plots: [plot], layout: { timeAxisHeight: 0, panes: [pane] },
          indicatorPaneInfo: { s: { overlay: true } }, passes: ['main-overlay-content'] });
      } else {
        const frame = createNativeChartFrameFromPanes({ dimensions: { width: 1200, height: 120, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
          panes: [{ id: 'main', type: 'main', top: 0, height: 0, yMin: 0, yMax: 100 }, { id: 'study', type: 'indicator', top: 0, height: 100, yMin: 0, yMax: 100 }] });
        const projection = createNativeChartProjection({ frame, viewport });
        const tree = NativeIndicatorPlotLayerImpl({ frame, bars, plots: [plot], totalBarCount: bars.length,
          visibleBars: bars.map((bar, sourceIndex) => ({ ...bar, sourceIndex, interval: 1000, x: projectedX(bar.time) })),
          indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } },
          sharedViewport: { startTime: { value: 0 }, endTime: { value: 12000 }, priceMin: { value: 0 }, priceMax: { value: 100 } } as NativeViewportSharedValues,
          textFont: Skia.Font(undefined, 12),
          staticProjection: route === 'native' ? undefined : route === 'native-projected' ? { ...projection, timeToX: projectedX } : projection,
        });
        for (const node of nativePrimitives(tree).filter(node => node.type === Path && node.props.style === 'stroke')) {
          const path = resolved<any>(node.props.path);
          const commands = (['moveTo', 'lineTo'] as const).flatMap(name => path[name].mock.calls.map((args: number[], i: number) => ({
            order: path[name].mock.invocationCallOrder[i], op: name === 'moveTo' ? 'M' : 'L', x: args[0], y: args[1],
          }))).sort((a, b) => a.order - b.order);
          paints.push({ kind: 'stroke', color: resolved<string>(node.props.color), dash: [], commands });
        }
      }
      const ownedSegments = paints.flatMap(paint => stepSegments([paint]).map(segment => ({ paint, segment })));
      const verticals = ownedSegments.filter(({ segment: [a, b] }) => a.x === b.x && a.y !== b.y);
      expect(verticals).toHaveLength(4);
      for (let i = 1; i < times.length; i++) {
        const expectedX = (sampleX(i - 1) + sampleX(i)) / 2;
        const previousY = 100 - plot.values[i - 1]!, ownY = 100 - plot.values[i]!;
        const own = verticals.filter(({ segment: [a, b] }) => a.y === previousY && b.y === ownY);
        expect(own).toHaveLength(1);
        expect(own[0].segment.map(point => point.x), `source${i} own midpoint`).toEqual([expectedX, expectedX]);
        expect(own[0].paint.color.toLowerCase()).toBe(series ? plot.color![i] : plot.color);
        const samePaint = stepSegments([own[0].paint]);
        expect(samePaint.some(([a, b]) => a.x === sampleX(i - 1) && a.y === previousY && b.x === expectedX && b.y === previousY)).toBe(true);
        expect(samePaint.some(([a, b]) => a.x === expectedX && a.y === ownY && b.x === sampleX(i) && b.y === ownY)).toBe(true);
        expect(expectedX).toBeGreaterThan(sampleX(i - 1));
        expect(expectedX).toBeLessThan(sampleX(i));
      }
    });
  });
}
