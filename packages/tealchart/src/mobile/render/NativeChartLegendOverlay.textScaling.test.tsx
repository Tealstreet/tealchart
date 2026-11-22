import type { Bar } from '../../types';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dimensions } from '../../test/reactNativeMock';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeChartLegendOverlay } from './NativeChartLegendOverlay';

// The shared mock runs a reaction during render, where the crosshair readout's setState loops;
// this suite renders the runtime for its text, so the crosshair reaction stays idle.
vi.mock('react-native-reanimated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-native-reanimated')>()),
  useAnimatedReaction: () => undefined,
}));

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 352, yMin: 63000, yMax: 64000 }],
});

const bars: Bar[] = [
  { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 10 },
  { time: 2, open: 106, high: 115, low: 101, close: 111, volume: 12 },
];

afterEach(() => {
  act(() => Dimensions.setFontScale(1));
  cleanup();
});

describe('NativeChartLegendOverlay system text size changes', () => {
  it('re-measures its text when the text size changes, without the chart remounting', () => {
    render(
      <NativeChartLegendOverlay
        bars={bars}
        downColor="#f04465"
        frame={frame}
        interval="15"
        isLoading={false}
        leftToolRailLayout={null}
        mutedTextColor="#8a8f98"
        pricePrecision={0.1}
        symbol="BTC-USD"
        textColor="#f0f3fa"
        upColor="#12c48b"
      />,
    );
    const atDefault = screen.getByText('BTC-USD');

    // AGT-154: text whose content did not change kept its old measurement, so the legend
    // stayed stretched after the size went back down, until the app relaunched.
    act(() => Dimensions.setFontScale(3.1));
    const atLargest = screen.getByText('BTC-USD');
    expect(atLargest).not.toBe(atDefault);

    act(() => Dimensions.setFontScale(1));
    expect(screen.getByText('BTC-USD')).not.toBe(atLargest);
  });
});
