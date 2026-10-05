import type { SharedValue } from 'react-native-reanimated';
import type { NativeCrosshairSharedValues } from '../interaction/nativeCrosshair';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { NativeChartLegendOverlay } from './NativeChartLegendOverlay';

const { reactions } = vi.hoisted(() => ({
  reactions: [] as Array<{
    prepare: () => number | undefined;
    react: (next: number | undefined, previous: number | undefined | null) => void;
  }>,
}));
vi.mock('react-native-reanimated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-native-reanimated')>()),
  useAnimatedReaction: (
    prepare: () => number | undefined,
    react: (next: number | undefined, previous: number | undefined | null) => void,
  ) => reactions.push({ prepare, react }),
}));
const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;
describe('native crosshair numeric readouts', () => {
  it('updates the overlay at the selected bar and restores latest without rerendering its owner', () => {
    const crosshair: NativeCrosshairSharedValues = {
      visible: shared(true),
      x: shared(100),
      y: shared(50),
      dragOriginX: shared(0),
      dragOriginY: shared(0),
    };
    const sharedViewport: NativeViewportSharedValues = {
      startTime: shared(0),
      endTime: shared(4000),
      priceMin: shared(0),
      priceMax: shared(100),
    };
    let ownerRenders = 0;
    function Owner() {
      ownerRenders++;
      return (
        <NativeChartLegendOverlay
          bars={testBars}
          frame={testFrame}
          plots={[
            testPlot({
              scriptId: 's',
              title: 'Status',
              display: 6,
              format: 'percent',
              precision: 2,
              values: [1, 2, 3, 4, 5],
            }),
          ]}
          crosshair={crosshair}
          sharedViewport={sharedViewport}
          activeIndicators={[{ id: 's', name: 'Study', isVisible: true, inputs: {} }]}
          downColor="red"
          upColor="green"
          textColor="white"
          mutedTextColor="gray"
          interval="1"
          symbol="TEST"
          pricePrecision={0.01}
          isLoading={false}
          leftToolRailLayout={null}
        />
      );
    }
    render(<Owner />);
    const reaction = reactions[0];
    act(() => reaction.react(reaction.prepare(), null));
    expect(screen.getByText('2.00%')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Open Study Data Window'));
    expect(screen.getByText('Data Window')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    fireEvent.click(screen.getByText('Close'));
    crosshair.visible.value = false;
    act(() => reaction.react(reaction.prepare(), 1));
    expect(screen.getByText('5.00%')).toBeDefined();
    expect(ownerRenders).toBe(1);
  });
});
