import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { LinearGradient, Path, Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePrimitives, resolved, testBars } from '../../test/nativePlotPaintHarness';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';
import { createNativeChartProjection } from './nativeProjection';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock('@shopify/react-native-skia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shopify/react-native-skia')>()),
  LinearGradient: () => null,
}));

// CF011 source conflicts-batch-8-v1.pine (c13a7d65b50656d9dbed1e90aa3d85b9b89ddf942dbcf73127b05b7b92014aa6)
// and captures/v2/evidence/conflicts-batch-8-v1-attempt1-visual.png establish
// red at hline(100), blue at hline(0), with ink bounded by the two lines.
// This checks native shader/mask commands, not a pixel-exact screenshot match.
describe('captured CF011 native hline gradient', () => {
  it.each([false, true])('paints the captured stops within the hline mask (static=%s)', (staticMode) => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 400, height: 420, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
      panes: [
        { id: 'main', type: 'main', top: 0, height: 200, yMin: 0, yMax: 100 },
        { id: 'study', type: 'indicator', top: 200, height: 200, yMin: -50, yMax: 150 },
      ],
    });
    const bars = testBars.slice(0, 4);
    const upper: PlotOutput = { type: 'hline', id: 'top', scriptId: 's', price: 100, values: [], display: 0 };
    const lower: PlotOutput = { type: 'hline', id: 'bottom', scriptId: 's', price: 0, values: [], display: 0 };
    const fill: PlotOutput = {
      type: 'fill',
      id: 'gradient',
      scriptId: 's',
      values: [],
      color: [],
      plot1Id: upper.id,
      plot2Id: lower.id,
      gradient: {
        topValues: [100, 100, 100, 100],
        bottomValues: [0, 0, 0, 0],
        topColors: ['#F23645', '#F23645', '#F23645', '#F23645'],
        bottomColors: ['#2962FF', '#2962FF', '#2962FF', '#2962FF'],
      },
    };
    const viewport = { startTime: 0, endTime: 3000, priceMin: 0, priceMax: 100 };
    const sharedViewport = {
      startTime: { value: 0 },
      endTime: { value: 3000 },
      priceMin: { value: 0 },
      priceMax: { value: 100 },
    } as unknown as NativeViewportSharedValues;
    const nodes = nativePrimitives(
      NativeIndicatorPlotLayerImpl({
        frame,
        bars,
        plots: [upper, lower, fill],
        visibleBars: bars,
        totalBarCount: 4,
        indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } },
        sharedViewport,
        paneRangeOverrides: { value: {} } as unknown as SharedValue<NativePaneRangeOverrides>,
        staticProjection: staticMode ? createNativeChartProjection({ frame, viewport }) : undefined,
        textFont: Skia.Font(undefined, 12),
      }),
    );
    const shaders = nodes.filter((node) => node.type === LinearGradient);
    expect(shaders).toHaveLength(1);
    expect(resolved(shaders[0]!.props.start)).toEqual({ x: 0, y: 250 });
    expect(resolved(shaders[0]!.props.end)).toEqual({ x: 0, y: 350 });
    expect(shaders[0]!.props.colors).toEqual(['#F23645', '#2962FF']);
    expect(shaders[0]!.props.positions).toEqual([0, 1]);
    const paths = nodes.filter((node) => node.type === Path);
    expect(paths).toHaveLength(1); // Hidden own hlines still bound the fill.
    const path = resolved<ReturnType<typeof Skia.Path.Make>>(paths[0]!.props.path);
    expect(path.close).toHaveBeenCalledTimes(3);
    expect(vi.mocked(path.moveTo).mock.calls.map(([, y]) => y)).toEqual([250, 250, 250]);
    expect(vi.mocked(path.lineTo).mock.calls.map(([, y]) => y)).toEqual([250, 350, 350, 250, 350, 350, 250, 350, 350]);
    vi.mocked(path.moveTo).mock.calls.forEach(([x], index) => expect(x).toBeCloseTo((index * 400) / 3, 10));
    expect(vi.mocked(path.lineTo).mock.calls.at(-1)?.[0]).toBeCloseTo(800 / 3, 10);
    expect(vi.mocked(path.lineTo).mock.calls.at(-1)?.[1]).toBe(350);
  });
});
