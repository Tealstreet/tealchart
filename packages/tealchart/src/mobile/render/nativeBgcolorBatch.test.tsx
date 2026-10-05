import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testBars, testPlot } from '../../test/nativePlotPaintHarness';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock('react-native-reanimated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native-reanimated')>();
  return { ...actual, useDerivedValue: vi.fn(actual.useDerivedValue) };
});

describe('native background batching', () => {
  it.each([false, true])('clips backgrounds before the 60px price axis (static=%s)', (staticMode) => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 400, height: 420, margins: { left: 0, right: 60, top: 0, bottom: 20 } },
      panes: [{ id: 'main', type: 'main', top: 0, height: 400, yMin: 0, yMax: 100 }],
    });
    const nodes = nativePlotHarness([testPlot({ type: 'bgcolor' })], staticMode, testBars, frame).primitives();
    const clips = nodes
      .filter((node) => node.type === Group && node.props.clip)
      .map((node) => resolved<any>(node.props.clip));
    expect(frame.priceAxisLeft).toBe(340);
    expect(clips).toHaveLength(1);
    expect(clips[0].width).toBe(frame.priceAxisLeft - frame.contentLeft);
    const rects = nodes.filter((node) => node.type === Rect);
    expect(rects).toHaveLength(5);
    for (const rect of rects) {
      const paintedRight = Math.min(rect.props.x + rect.props.width, clips[0].x + clips[0].width);
      expect(paintedRight).toBeLessThanOrEqual(frame.priceAxisLeft);
    }
  });

  it.each([false, true])('keeps mapper count constant with 1000 colored bars (static=%s)', (staticMode) => {
    const bars = Array.from({ length: 1000 }, (_, sourceIndex) => ({
      sourceIndex,
      time: sourceIndex * 4,
      interval: 4,
      x: 0,
      open: 1,
      high: 2,
      low: 0,
      close: 1,
      volume: 1,
    }));
    const plot = testPlot({ type: 'bgcolor', values: Array(1000).fill(1), color: '#12345680' });
    const rects = nativePlotHarness([plot], staticMode, bars)
      .primitives()
      .filter((node) => node.type === Rect);
    expect(rects).toHaveLength(1000);
    expect(rects[0].props).toMatchObject({ width: 1, color: '#12345680' });
    expect(rects[1].props.x - rects[0].props.x).toBeCloseTo(0.4);
    expect(vi.mocked(useDerivedValue).mock.calls.length).toBe(staticMode ? 1 : 2);
  });
});
