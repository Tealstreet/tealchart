import type { ReactElement, ReactNode } from 'react';

import { Pressable, ScrollView, Text, View } from 'react-native';
import { describe, expect, it } from 'vitest';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { createNativeTopBarLayout } from '../utils/topBarLayout';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import {
  areNativeTopBarActionTargetsEqual,
  NativeTopBarOverlayImpl,
  resolveNativeTopBarActionOrigins,
  resolveNativeTopBarActionTargets,
} from './NativeTopBarOverlay';

const textWidth = (text: string) => text.length * 7;

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  name?: string;
  onPress?: () => void;
  pointerEvents?: string;
  scrollEnabled?: boolean;
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
    layoutName: 'Default',
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
      textColor: '#f0f3fa',
      topBarLayout: createLayout(),
    });
    const texts = collectElementsByType(overlay, Text).map((element) => element.props.children);
    const iconNames = collectElementsByType(overlay, NativeDrawingIcon).map((element) => element.props.name);
    const pressables = collectElementsByType(overlay, Pressable);
    const scrollViews = collectElementsByType(overlay, ScrollView);
    const contentViews = collectElementsByType(overlay, View);

    expect(texts).toEqual(expect.arrayContaining(['BTC-USD', '15m', 'Default', 'Indicators']));
    expect(iconNames).toEqual(expect.arrayContaining(['chevronDown', 'indicators', 'undo', 'redo']));
    expect(iconNames.filter((name) => name === 'chevronDown')).toHaveLength(2);
    expect(pressables.length).toBe(createLayout().buttons.length + 1);
    expect(scrollViews).toHaveLength(1);
    expect(scrollViews[0].props.pointerEvents).toBe('none');
    expect(scrollViews[0].props.scrollEnabled).toBe(false);
    expect(contentViews.some((element) => styleWidth(element.props.style) === createLayout().scrollContentWidth)).toBe(
      true,
    );
    expect(pressables.some((element) => element.props.accessibilityLabel === 'Change symbol')).toBe(true);
    expect(pressables.every((element) => element.props.onPress === undefined)).toBe(true);
  });

  it('resolves measured symbol and button layouts into absolute overlay hit targets', () => {
    const layout = createLayout();
    const indicatorsButton = layout.buttons.find((button) => button.type === 'indicators');
    const activeTimeframeButton = layout.buttons.find((button) => button.interval === '15');

    expect(layout.symbolHitRect).toBeDefined();
    expect(indicatorsButton).toBeDefined();
    expect(activeTimeframeButton).toBeDefined();

    const targets = resolveNativeTopBarActionTargets({
      actionLayouts: {
        symbol: {
          command: { type: 'symbol' },
          layout: layout.symbolHitRect!,
        },
        [`button:${activeTimeframeButton!.type}:${activeTimeframeButton!.interval}:${activeTimeframeButton!.x}`]: {
          command: { type: 'timeframe', interval: '15' },
          layout: activeTimeframeButton!,
        },
        [`button:${indicatorsButton!.type}:${indicatorsButton!.text}:${indicatorsButton!.x}`]: {
          command: { type: 'indicators' },
          layout: indicatorsButton!,
        },
      },
      actionOrigins: resolveNativeTopBarActionOrigins(layout),
    });

    expect(targets).toEqual([
      {
        command: { type: 'symbol' },
        enabled: true,
        x1: 0,
        x2: layout.symbolHitRect!.width + 4,
        y1: 0,
        y2: layout.height + 4,
      },
      {
        command: { type: 'timeframe', interval: '15' },
        enabled: true,
        x1: layout.scrollAreaX + activeTimeframeButton!.x - 3,
        x2: layout.scrollAreaX + activeTimeframeButton!.x + activeTimeframeButton!.width + 3,
        y1: activeTimeframeButton!.y - 4,
        y2: activeTimeframeButton!.y + activeTimeframeButton!.height + 4,
      },
      {
        command: { type: 'indicators' },
        enabled: true,
        x1: layout.scrollAreaX + indicatorsButton!.x - 3,
        x2: layout.scrollAreaX + indicatorsButton!.x + indicatorsButton!.width + 3,
        y1: indicatorsButton!.y - 4,
        y2: indicatorsButton!.y + indicatorsButton!.height + 4,
      },
    ]);
  });

  it('marks disabled top-bar buttons as disabled gesture targets', () => {
    const layout = createNativeTopBarLayout({
      width: 390,
      height: 36,
      symbol: 'BTC-USD',
      interval: '15',
      timeframes: AVAILABLE_TIMEFRAMES.filter((timeframe) => ['15'].includes(timeframe.value)),
      textWidth,
      titleTextWidth: textWidth,
      textColor: '#f0f3fa',
      mutedTextColor: '#8a8f98',
      activeTextColor: '#12c48b',
      activeBackgroundColor: '#24312b',
      indicatorsEnabled: false,
      undoEnabled: false,
      redoEnabled: true,
    });
    const indicatorsButton = layout.buttons.find((button) => button.type === 'indicators');
    const undoButton = layout.buttons.find((button) => button.type === 'undo');
    const redoButton = layout.buttons.find((button) => button.type === 'redo');

    expect(indicatorsButton).toBeDefined();
    expect(undoButton).toBeDefined();
    expect(redoButton).toBeDefined();

    const targets = resolveNativeTopBarActionTargets({
      actionLayouts: {
        [`button:${indicatorsButton!.type}:${indicatorsButton!.text}:${indicatorsButton!.x}`]: {
          command: { type: 'indicators' },
          layout: indicatorsButton!,
        },
        [`button:${undoButton!.type}:${undoButton!.text}:${undoButton!.x}`]: {
          command: { type: 'undo' },
          layout: undoButton!,
        },
        [`button:${redoButton!.type}:${redoButton!.text}:${redoButton!.x}`]: {
          command: { type: 'redo' },
          layout: redoButton!,
        },
      },
      actionOrigins: resolveNativeTopBarActionOrigins(layout),
    });

    expect(targets.map((target) => [target.command.type, target.enabled])).toEqual([
      ['indicators', false],
      ['undo', false],
      ['redo', true],
    ]);
  });

  it('compares action target payloads instead of array identity', () => {
    const first = [
      {
        command: { type: 'timeframe' as const, interval: '15' as const },
        enabled: true,
        x1: 80,
        x2: 116,
        y1: 0,
        y2: 36,
      },
    ];
    const matching = first.map((target) => ({ ...target, command: { ...target.command } }));
    const changed = [{ ...matching[0], command: { type: 'timeframe' as const, interval: '30' as const } }];

    expect(areNativeTopBarActionTargetsEqual(first, matching)).toBe(true);
    expect(areNativeTopBarActionTargetsEqual(first, changed)).toBe(false);
  });
});
