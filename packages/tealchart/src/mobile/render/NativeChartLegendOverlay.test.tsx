import type { ReactElement, ReactNode } from 'react';
import type { Bar } from '../../types';

import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { LOADING_DOT_COUNT } from '../../constants';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeChartLegendOverlayImpl, NativeLegendLoadingDots, NativeLoadingDot, areNativeLegendActionTargetsEqual, resolveNativeLegendActionTargets } from './NativeChartLegendOverlay';

interface TestElementProps {
  children?: ReactNode;
  [key: string]: unknown;
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

const frameWithIndicatorPane = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 520,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [
    { id: 'main', type: 'main', top: 36, height: 300, yMin: 63000, yMax: 64000 },
    { id: 'pane_1', type: 'indicator', top: 336, height: 152, yMin: -10, yMax: 10 },
  ],
});

describe('NativeChartLegendOverlay', () => {
  it('renders symbol, interval, and OHLC values', () => {
    const texts = collectElementsByType(renderLegend(false), Text).map((element) => element.props.children);

    expect(texts).toEqual(
      expect.arrayContaining(['BTC-USD', '15m', 'O', '106.0', 'H', '115.0', 'L', '101.0', 'C', '111.0']),
    );
    expect(texts).not.toContain('...');
  });

  it('shows the animated loading dots while data is loading', () => {
    const loading = collectElementsByType(renderLegend(true), NativeLegendLoadingDots);
    const idle = collectElementsByType(renderLegend(false), NativeLegendLoadingDots);

    expect(loading).toHaveLength(1);
    expect(idle).toHaveLength(0);
    // Three of them, matching web's keyframed trio rather than a text ellipsis.
    expect(collectElementsByType(NativeLegendLoadingDots(loading[0]!.props), NativeLoadingDot)).toHaveLength(
      LOADING_DOT_COUNT,
    );
  });

  it('routes overlay indicator actions through the buttons own onPress', () => {
    const onRemoveIndicator = vi.fn();
    const onToggleIndicator = vi.fn();
    const legend = NativeChartLegendOverlayImpl({
      activeIndicators: [{ id: 'study_1', inputs: { length: 20 }, isVisible: true, name: 'SMA' }],
      bars,
      downColor: '#f04465',
      frame,
      gridColor: '#1f2630',
      indicatorPaneInfo: { study_1: { inputs: { length: 20 }, name: 'SMA', overlay: true } },
      interval: '15',
      isLoading: false,
      leftToolRailLayout: null,
      mutedTextColor: '#8a8f98',
      onRemoveIndicator,
      onToggleIndicator,
      pricePrecision: 0.1,
      symbol: 'BTC-USD',
      textColor: '#f0f3fa',
      upColor: '#12c48b',
    });

    const texts = collectElementsByType(legend, Text).map((element) => element.props.children);
    const buttons = collectElementsByType(legend, Pressable);

    expect(texts).toEqual(expect.arrayContaining(['SMA', '20']));
    const hidePress = buttons.find((button) => button.props.accessibilityLabel === 'Hide SMA')?.props.onPress;
    const removePress = buttons.find((button) => button.props.accessibilityLabel === 'Remove SMA')?.props.onPress;

    // React Native chrome takes its own taps; a derived rect in canvas space
    // would be a second copy of the same geometry, free to drift from the glyph.
    expect(hidePress).toBeInstanceOf(Function);
    expect(removePress).toBeInstanceOf(Function);

    hidePress?.();
    removePress?.();

    expect(onToggleIndicator).toHaveBeenCalledWith('study_1');
    expect(onRemoveIndicator).toHaveBeenCalledWith('study_1');
  });

  it('renders non-overlay indicator legends in their pane', () => {
    const legend = NativeChartLegendOverlayImpl({
      activeIndicators: [{ id: 'study_2', inputs: { fast: 12, slow: 26, signal: 9 }, isVisible: false, name: 'MACD' }],
      bars,
      downColor: '#f04465',
      frame: frameWithIndicatorPane,
      gridColor: '#1f2630',
      indicatorPaneInfo: {
        study_2: { inputs: { fast: 12, slow: 26, signal: 9 }, name: 'MACD', overlay: false, paneId: 'pane_1' },
      },
      interval: '15',
      isLoading: false,
      leftToolRailLayout: null,
      mutedTextColor: '#8a8f98',
      pricePrecision: 0.1,
      symbol: 'BTC-USD',
      textColor: '#f0f3fa',
      upColor: '#12c48b',
    });

    const texts = collectElementsByType(legend, Text).map((element) => element.props.children);

    expect(texts).toEqual(expect.arrayContaining(['MACD', '12 · 26 · 9']));
  });

  it('routes indicator-pane legend actions through onPress too', () => {
    const onRemoveIndicator = vi.fn();
    const onToggleIndicator = vi.fn();
    const legend = NativeChartLegendOverlayImpl({
      activeIndicators: [{ id: 'study_2', inputs: { fast: 12, slow: 26, signal: 9 }, isVisible: false, name: 'MACD' }],
      bars,
      downColor: '#f04465',
      frame: frameWithIndicatorPane,
      gridColor: '#1f2630',
      indicatorPaneInfo: {
        study_2: { inputs: { fast: 12, slow: 26, signal: 9 }, name: 'MACD', overlay: false, paneId: 'pane_1' },
      },
      interval: '15',
      isLoading: false,
      leftToolRailLayout: null,
      mutedTextColor: '#8a8f98',
      onRemoveIndicator,
      onToggleIndicator,
      pricePrecision: 0.1,
      symbol: 'BTC-USD',
      textColor: '#f0f3fa',
      upColor: '#12c48b',
    });

    const buttons = collectElementsByType(legend, Pressable);
    const removePress = buttons.find((button) => button.props.accessibilityLabel === 'Remove MACD')?.props.onPress;
    const hidePress = buttons.find((button) => button.props.accessibilityLabel === 'Show MACD')?.props.onPress;

    expect(removePress).toBeInstanceOf(Function);
    expect(hidePress).toBeInstanceOf(Function);

    removePress?.();
    hidePress?.();

    expect(onRemoveIndicator).toHaveBeenCalledWith('study_2');
    expect(onToggleIndicator).toHaveBeenCalledWith('study_2');
  });

  it('resolves measured action button layouts into absolute overlay hit targets', () => {
    const targets = resolveNativeLegendActionTargets({
      actionLayouts: {
        'main:study_1:removeIndicator': {
          action: 'removeIndicator',
          button: { height: 22, width: 22, x: 74, y: 0 },
          indicatorId: 'study_1',
          rowKey: 'main:study_1',
        },
      },
      actionOrigins: [
        {
          action: 'removeIndicator',
          indicatorId: 'study_1',
          key: 'main:study_1:removeIndicator',
          left: 62,
          top: 42,
        },
      ],
      rowLayouts: {
        'main:study_1': { height: 22, width: 100, x: 0, y: 28 },
      },
    });

    expect(targets).toEqual([
      {
        command: { indicatorId: 'study_1', type: 'removeIndicator' },
        enabled: true,
        x1: 130,
        x2: 164,
        y1: 64,
        y2: 98,
      },
    ]);
  });

  it('compares action target payloads instead of array identity', () => {
    const first = [
      {
        command: { indicatorId: 'study_1', type: 'removeIndicator' as const },
        enabled: true,
        x1: 130,
        x2: 164,
        y1: 64,
        y2: 98,
      },
    ];
    const matching = first.map((target) => ({ ...target, command: { ...target.command } }));
    const changed = [{ ...matching[0], x2: 165 }];

    expect(areNativeLegendActionTargetsEqual(first, matching)).toBe(true);
    expect(areNativeLegendActionTargetsEqual(first, changed)).toBe(false);
  });
});
