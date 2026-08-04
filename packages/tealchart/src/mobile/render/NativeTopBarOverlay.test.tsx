import type { ReactElement, ReactNode } from 'react';

import { Pressable, ScrollView, Text, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { createNativeTopBarLayout } from '../utils/topBarLayout';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import { NativeTopBarOverlayImpl } from './NativeTopBarOverlay';

const textWidth = (text: string) => text.length * 7;

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  name?: string;
  onPress?: () => void;
  style?: { width?: number } | Array<{ width?: number }>;
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

function styleWidth(style: TestElementProps['style']): number | undefined {
  if (Array.isArray(style)) {
    return style.find((item) => item.width !== undefined)?.width;
  }
  return style?.width;
}

function createLayout() {
  return createNativeTopBarLayout({
    width: 390,
    height: 36,
    symbol: 'BTC-USD',
    interval: '15',
    timeframes: AVAILABLE_TIMEFRAMES.filter((timeframe) => ['1', '5', '15', '30', '60'].includes(timeframe.value)),
    textWidth,
    titleTextWidth: textWidth,
    textColor: '#f0f3fa',
    mutedTextColor: '#8a8f98',
    activeTextColor: '#12c48b',
    activeBackgroundColor: '#24312b',
    indicatorsEnabled: true,
    layoutName: 'tealstreet',
    layoutSelectorEnabled: true,
    undoEnabled: true,
    redoEnabled: true,
  });
}

describe('NativeTopBarOverlay', () => {
  it('renders top-bar chrome as React Native controls', () => {
    const overlay = NativeTopBarOverlayImpl({
      backgroundColor: '#101418',
      gridColor: '#222831',
      mutedTextColor: '#8a8f98',
      onAction: vi.fn(),
      textColor: '#f0f3fa',
      topBarLayout: createLayout(),
    });
    const texts = collectElementsByType(overlay, Text).map((element) => element.props.children);
    const iconNames = collectElementsByType(overlay, NativeDrawingIcon).map((element) => element.props.name);
    const pressables = collectElementsByType(overlay, Pressable);
    const scrollViews = collectElementsByType(overlay, ScrollView);
    const contentViews = collectElementsByType(overlay, View);

    expect(texts).toEqual(expect.arrayContaining(['BTC-USD', '15m', 'tealstreet', 'Indicators']));
    expect(iconNames).toEqual(expect.arrayContaining(['chevronDown', 'indicators', 'undo', 'redo']));
    expect(iconNames.filter((name) => name === 'chevronDown')).toHaveLength(2);
    expect(pressables.length).toBe(createLayout().buttons.length + 1);
    expect(scrollViews).toHaveLength(1);
    expect(contentViews.some((element) => styleWidth(element.props.style) === createLayout().scrollContentWidth)).toBe(
      true,
    );
    expect(pressables.some((element) => element.props.accessibilityLabel === 'Change symbol')).toBe(true);
  });

  it('dispatches the symbol command from the symbol header', () => {
    const onAction = vi.fn();
    const overlay = NativeTopBarOverlayImpl({
      backgroundColor: '#101418',
      gridColor: '#222831',
      mutedTextColor: '#8a8f98',
      onAction,
      textColor: '#f0f3fa',
      topBarLayout: createLayout(),
    });
    const symbolPressable = collectElementsByType(overlay, Pressable).find(
      (element) => element.props.accessibilityLabel === 'Change symbol',
    );

    expect(symbolPressable).toBeDefined();
    symbolPressable!.props.onPress!();
    expect(onAction).toHaveBeenCalledWith({ type: 'symbol' });
  });

  it('dispatches the selected button command directly', () => {
    const onAction = vi.fn();
    const layout = createLayout();
    const overlay = NativeTopBarOverlayImpl({
      backgroundColor: '#101418',
      gridColor: '#222831',
      mutedTextColor: '#8a8f98',
      onAction,
      textColor: '#f0f3fa',
      topBarLayout: layout,
    });
    const activeButton = layout.buttons.find((button) => button.interval === '15');
    const activePressable = collectElementsByType(overlay, Pressable).find(
      (element) => element.props.accessibilityLabel === '15m timeframe',
    );

    expect(activeButton).toBeDefined();
    expect(activePressable).toBeDefined();
    activePressable!.props.onPress!();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'timeframe', interval: '15' }));
  });

  it('dispatches the layout selector command from the layout button', () => {
    const onAction = vi.fn();
    const overlay = NativeTopBarOverlayImpl({
      backgroundColor: '#101418',
      gridColor: '#222831',
      mutedTextColor: '#8a8f98',
      onAction,
      textColor: '#f0f3fa',
      topBarLayout: createLayout(),
    });
    const layoutPressable = collectElementsByType(overlay, Pressable).find(
      (element) => element.props.accessibilityLabel === 'Chart layouts',
    );

    expect(layoutPressable).toBeDefined();
    layoutPressable!.props.onPress!();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'layout' }));
  });
});
