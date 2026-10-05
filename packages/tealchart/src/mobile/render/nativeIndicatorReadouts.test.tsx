import type { ReactElement, ReactNode } from 'react';

import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { NativeChartLegendOverlayImpl } from './NativeChartLegendOverlay';

function elements(node: ReactNode): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<any>;
  return [element, ...elements(element.props.children)];
}
function render(sourceIndex?: number, dataWindowIndicatorId?: string) {
  return NativeChartLegendOverlayImpl({
    bars: testBars,
    frame: testFrame,
    downColor: 'red',
    upColor: 'green',
    mutedTextColor: 'gray',
    textColor: 'white',
    interval: '1',
    isLoading: false,
    leftToolRailLayout: null,
    pricePrecision: 0.01,
    symbol: 'TEST',
    activeIndicators: [{ id: 's', name: 'Study', inputs: {}, isVisible: true }],
    indicatorPaneInfo: { s: { overlay: true, format: 'percent', precision: 2 } },
    plots: [
      testPlot({ scriptId: 's', title: 'Status', display: 4, values: [1, 2, 3, 4, 5] }),
      testPlot({
        scriptId: 's',
        id: 'hidden',
        title: 'Window',
        display: 2,
        type: 'plotchar',
        values: [null, null, null, null, null],
        displayValues: [0, 0, 0, 0, 0],
      }),
      testPlot({ scriptId: 's', id: 'no', title: 'Hidden', display: 0 }),
      testPlot({
        scriptId: 's',
        id: 'ohlc',
        title: 'Candles',
        display: 2,
        type: 'plotcandle',
        openValues: [1, 2, 3, 4, 5],
        highValues: [2, 3, 4, 5, 6],
        lowValues: [0, 1, 2, 3, 4],
        closeValues: [1.5, 2.5, 3.5, 4.5, 5.5],
      }),
    ],
    sourceIndex,
    dataWindowIndicatorId,
    onOpenDataWindow: vi.fn(),
    onCloseDataWindow: vi.fn(),
  });
}
describe('native numeric plot surfaces', () => {
  it('shows status-line values with declaration format and precision', () => {
    const nodes = elements(render(1));
    const texts = nodes.filter((e) => e.type === Text).map((e) => e.props.children);
    expect(texts).toContain('2.00%');
    expect(texts).not.toContain('0.00%');
    expect(nodes.some((e) => e.type === Text && e.props.accessibilityLabel === 'Status: 2.00%')).toBe(true);
  });
  it('opens a Data Window showing its own flags and numeric marker/OHLC values', () => {
    const nodes = elements(render(1, 's'));
    const texts = nodes.filter((e) => e.type === Text).map((e) => e.props.children);
    expect(texts).toContain('Data Window');
    expect(texts).toContain('Window');
    expect(texts).toContain('0.00%');
    expect(texts).toContain('2.00% · 3.00% · 1.00% · 2.50%');
    expect(texts).not.toContain('Hidden');
    expect(nodes.some((e) => e.type === Pressable && e.props.accessibilityLabel === 'Open Study Data Window')).toBe(
      true,
    );
  });
  it('uses the latest source values when the crosshair is absent', () => {
    expect(
      elements(render())
        .filter((e) => e.type === Text)
        .map((e) => e.props.children),
    ).toContain('5.00%');
  });
});
