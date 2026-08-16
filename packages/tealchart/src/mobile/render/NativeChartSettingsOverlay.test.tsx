import type { ReactElement, ReactNode } from 'react';
import type { ChartSettings } from '../../state/chartState';
import type { ChartSettingsControlContext } from '../../settings/chartSettingsControls';

import { Switch, Text } from 'react-native';

import { NativeDrawingIcon } from './NativeDrawingIcon';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHART_SETTINGS } from '../../state/chartState';
import {
  NativeChartSettingsButtonImpl,
  NativeChartSettingsOverlayViewImpl,
  resolveNativeChartSettingsActionTargets,
} from './NativeChartSettingsOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  onLayout?: (event: { nativeEvent: { layout: { height: number; width: number; x: number; y: number } } }) => void;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  pointerEvents?: string;
  value?: boolean;
}

type TestElement = ReactElement<TestElementProps>;

function walk(node: ReactNode, visit: (element: TestElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;
  const element = node as TestElement;
  visit(element);
  walk(element.props.children as ReactNode, visit);
}

function collectByType(root: ReactNode, type: unknown): TestElement[] {
  const found: TestElement[] = [];
  walk(root, (element) => {
    if (element.type === type) found.push(element);
  });
  return found;
}

function findByLabel(root: ReactNode, label: string): TestElement | undefined {
  let found: TestElement | undefined;
  walk(root, (element) => {
    if (!found && element.props.accessibilityLabel === label) found = element;
  });
  return found;
}

function createContext(overrides: Partial<ChartSettings> = {}) {
  let settings: ChartSettings = { ...DEFAULT_CHART_SETTINGS, ...overrides };
  const markLayoutDirty = vi.fn();
  const context: ChartSettingsControlContext = {
    getSettings: () => settings,
    setSetting: (key, value) => {
      settings = { ...settings, [key]: value };
    },
    setChartProperties: (properties) => {
      settings = { ...settings, chartProperties: properties };
    },
    markLayoutDirty,
  };
  return { context, markLayoutDirty, getSettings: () => settings };
}

function renderOverlay(context: ChartSettingsControlContext, onClose = vi.fn()) {
  return NativeChartSettingsOverlayViewImpl({
    activeBackgroundColor: '#20242a',
    activeTabId: 'symbol',
    backgroundColor: '#101418',
    context,
    gridColor: '#222831',
    mutedTextColor: '#8a8f98',
    onActiveTabIdChange: vi.fn(),
    onClose,
    onControlWritten: vi.fn(),
    textColor: '#eef2f8',
  });
}

describe('NativeChartSettingsOverlay', () => {
  it('renders a row per registered control from the shared registry', () => {
    const { context } = createContext();
    const overlay = renderOverlay(context);

    expect(findByLabel(overlay, 'Chart setting showVolume')).not.toBeUndefined();
    expect(collectByType(overlay, Switch)).toHaveLength(1);
  });

  it('reflects the stored value', () => {
    const { context } = createContext({ showVolume: false });
    const overlay = renderOverlay(context);

    expect(collectByType(overlay, Switch)[0]?.props.value).toBe(false);
  });

  it('writes through the control and marks the layout dirty', () => {
    const { context, markLayoutDirty, getSettings } = createContext({ showVolume: true });
    const overlay = renderOverlay(context);

    collectByType(overlay, Switch)[0]?.props.onValueChange?.(false);

    expect(getSettings().showVolume).toBe(false);
    expect(markLayoutDirty).toHaveBeenCalledTimes(1);
  });

  it('closes from the scrim and the close control', () => {
    const onClose = vi.fn();
    const { context } = createContext();
    const overlay = renderOverlay(context, onClose);

    findByLabel(overlay, 'Dismiss chart settings')?.props.onPress?.();
    findByLabel(overlay, 'Close chart settings')?.props.onPress?.();

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('takes its own tap and reports its box for gesture suppression', () => {
    const onLayoutRectChange = vi.fn();
    const onPress = vi.fn();
    const button = NativeChartSettingsButtonImpl({
      backgroundColor: '#101418',
      axisHeight: 24,
      onLayoutRectChange,
      onPress,
      textColor: '#8a8f98',
    });

    expect(button.props.accessibilityLabel).toBe('Chart settings');
    // The gear is a React Native node, so it takes its own tap.
    button.props.onPress?.();
    expect(onPress).toHaveBeenCalledTimes(1);

    // The measured box is still reported, but only so canvas pan/crosshair fail
    // their start underneath it — the gear sits where those gestures are live.
    button.props.onLayout?.({ nativeEvent: { layout: { height: 24, width: 24, x: 378, y: 600 } } });
    expect(onLayoutRectChange).toHaveBeenCalledWith({ height: 24, width: 24, x: 378, y: 600 });

    // Square on the axis intersection, and drawn with the shared icon set
    // rather than a system emoji glyph.
    expect(button.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 24, width: 24 })]),
    );
    expect(collectByType(button, Text)).toHaveLength(0);
    expect(collectByType(button, NativeDrawingIcon)).toHaveLength(1);
  });

  it('derives the gear hit target from the measured box, grown inward only', () => {
    const [target] = resolveNativeChartSettingsActionTargets({ height: 24, width: 24, x: 378, y: 600 });

    expect(target?.command).toEqual({ type: 'openChartSettings' });
    // Right and bottom stay flush: outside the canvas there is nothing to tap.
    expect(target?.x2).toBe(402);
    expect(target?.y2).toBe(624);
    expect(target?.x1).toBe(368);
    expect(target?.y1).toBe(590);
  });

  it('publishes no gear target before the button has been measured', () => {
    // An unmeasured rect would reserve (0,0) and swallow taps in the top-left.
    expect(resolveNativeChartSettingsActionTargets(null)).toEqual([]);
    expect(resolveNativeChartSettingsActionTargets({ height: 0, width: 0, x: 0, y: 0 })).toEqual([]);
  });
});
