import type { ReactElement, ReactNode } from 'react';
import type { ChartSettings } from '../../state/chartState';
import type { ChartSettingsControlContext } from '../../settings/chartSettingsControls';

import { Switch, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHART_SETTINGS } from '../../state/chartState';
import { NativeChartSettingsButtonImpl, NativeChartSettingsOverlayViewImpl } from './NativeChartSettingsOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
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

  it('exposes a labelled gear button', () => {
    const onPress = vi.fn();
    const button = NativeChartSettingsButtonImpl({
      backgroundColor: '#101418',
      bottomInset: 24,
      gridColor: '#222831',
      onPress,
      rightInset: 56,
      textColor: '#8a8f98',
    });

    expect(button.props.accessibilityLabel).toBe('Chart settings');
    button.props.onPress?.();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(collectByType(button, Text)).toHaveLength(1);
    // Inset past the axes, or it lands under the two-line last-price tag.
    expect(button.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ bottom: 30, right: 62 })]),
    );
  });
});
