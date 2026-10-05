import { Skia } from '@shopify/react-native-skia';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { NativeIndicatorPlotLayer } from './NativeIndicatorPlotLayer';
import { getNativeOffsetPlotBars } from './nativeOffsetPlotBars';
import { createNativeChartProjection } from './nativeProjection';

describe('native plot projection memoization', () => {
  it('shares the original visible bars at offset zero', () => {
    expect(getNativeOffsetPlotBars(testBars, testBars, 0, 0, 4000)).toBe(testBars);
  });

  it.each([0, 1])('retains plot paths across unrelated renders at offset %s', (offset) => {
    const viewport = { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 };
    const props = {
      bars: testBars,
      frame: testFrame,
      plots: [testPlot({ offset })],
      visibleBars: testBars,
      totalBarCount: testBars.length,
      indicatorPaneInfo: {},
      sharedViewport: {
        startTime: { value: 0 },
        endTime: { value: 4000 },
        priceMin: { value: 0 },
        priceMax: { value: 100 },
      },
      staticProjection: createNativeChartProjection({ frame: testFrame, viewport }),
      textFont: Skia.Font(undefined, 12),
    };
    const { rerender } = render(<NativeIndicatorPlotLayer {...props} />);
    const paths = vi.mocked(Skia.Path.Make).mock.calls.length;
    expect(paths).toBeGreaterThan(0);
    rerender(<NativeIndicatorPlotLayer {...props} textFont={{ ...props.textFont }} />);
    expect(vi.mocked(Skia.Path.Make).mock.calls.length).toBe(paths);
    rerender(<NativeIndicatorPlotLayer {...props} plots={[testPlot({ offset, values: [9, 8, 7, 6, 5] })]} />);
    expect(vi.mocked(Skia.Path.Make).mock.calls.length).toBeGreaterThan(paths);
  });
});
