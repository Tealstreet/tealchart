import type { RenderOptions } from '../../types';

import { Path } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePrimitives, resolved, testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { NativeCandleVolumeLayerImpl } from './NativeCandleVolumeLayer';
import { createNativeChartProjection } from './nativeProjection';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
describe('native barcolor full-history show_last', () => {
  it('paints a destination candle using the offset source color and show_last', () => {
    const tree = NativeCandleVolumeLayerImpl({
      frame: testFrame,
      options: { upColor: 'green', downColor: 'red' } as RenderOptions,
      sharedViewport: {
        startTime: { value: 0 },
        endTime: { value: 4000 },
        priceMin: { value: 0 },
        priceMax: { value: 100 },
      },
      visibleBars: testBars.slice(0, 1),
      totalBarCount: 5,
      volumeHeight: 0,
      barColorPlots: [testPlot({ type: 'barcolor', offset: -4, showLast: 1, color: [null, null, null, null, 'blue'] })],
    });
    const overrides = nativePrimitives(tree).filter((p) => p.type === Path && p.props.color === 'blue');
    expect(overrides.some((p) => vi.mocked(resolved<any>(p.props.path).moveTo).mock.calls.length > 0)).toBe(true);
  });

  it.each([false, true])('does not recolor historical candles (static=%s)', (staticMode) => {
    const sharedViewport = {
      startTime: { value: 0 },
      endTime: { value: 4000 },
      priceMin: { value: 0 },
      priceMax: { value: 100 },
    };
    const tree = NativeCandleVolumeLayerImpl({
      frame: testFrame,
      options: { upColor: 'green', downColor: 'red' } as RenderOptions,
      sharedViewport,
      visibleBars: testBars.slice(0, 3),
      totalBarCount: 5,
      volumeHeight: 0,
      barColorPlots: [testPlot({ type: 'barcolor', showLast: 1, color: ['blue', 'blue', 'blue', 'blue', 'blue'] })],
      staticProjection: staticMode
        ? createNativeChartProjection({
            frame: testFrame,
            viewport: { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 },
          })
        : undefined,
    });
    const overrides = nativePrimitives(tree).filter((p) => p.type === Path && p.props.color === 'blue');
    expect(overrides.every((p) => vi.mocked(resolved<any>(p.props.path).moveTo).mock.calls.length === 0)).toBe(true);
  });
});
