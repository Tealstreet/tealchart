import type { ReactElement, ReactNode } from 'react';
import type { Bar } from '../../types';

import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeChartLegendOverlayImpl } from './NativeChartLegendOverlay';

interface TestElementProps {
  children?: ReactNode;
}

type TestElement = ReactElement<TestElementProps>;

function walkElements(node: ReactNode, visitor: (element: TestElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as TestElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): TestElement[] {
  const elements: TestElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

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

function renderLegend(isLoading: boolean) {
  return NativeChartLegendOverlayImpl({
    bars,
    downColor: '#f04465',
    frame,
    interval: '15',
    isLoading,
    leftToolRailLayout: null,
    mutedTextColor: '#8a8f98',
    pricePrecision: 0.1,
    symbol: 'BTC-USD',
    textColor: '#f0f3fa',
    upColor: '#12c48b',
  });
}

describe('NativeChartLegendOverlay', () => {
  it('renders symbol, interval, and OHLC values', () => {
    const texts = collectElementsByType(renderLegend(false), Text).map((element) => element.props.children);

    expect(texts).toEqual(
      expect.arrayContaining(['BTC-USD', '15m', 'O', '106.0', 'H', '115.0', 'L', '101.0', 'C', '111.0']),
    );
    expect(texts).not.toContain('...');
  });

  it('shows the loading marker while data is loading', () => {
    const texts = collectElementsByType(renderLegend(true), Text).map((element) => element.props.children);

    expect(texts).toContain('...');
  });
});
