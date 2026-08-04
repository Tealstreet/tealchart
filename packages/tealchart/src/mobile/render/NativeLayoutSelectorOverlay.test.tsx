import type { ReactElement, ReactNode } from 'react';

import { Pressable, TextInput } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { NativeLayoutSelectorOverlayViewImpl } from './NativeLayoutSelectorOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  onChangeText?: (value: string) => void;
  onPress?: () => void;
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

function renderOverlay(overrides: Partial<Parameters<typeof NativeLayoutSelectorOverlayViewImpl>[0]> = {}) {
  return NativeLayoutSelectorOverlayViewImpl({
    backgroundColor: '#101418',
    currentLayout: { layoutId: 'layout-1', layoutName: 'Default' },
    gridColor: '#222831',
    layouts: [
      { id: 'layout-1', name: 'Default', symbol: 'BTC', isTealchart: true },
      { id: 'layout-2', name: 'Scalps', symbol: 'ETH', isTealchart: true },
    ],
    mutedTextColor: '#8a8f98',
    onClose: vi.fn(),
    onDelete: vi.fn(),
    onLoad: vi.fn(),
    onRefresh: vi.fn(),
    onRename: vi.fn(),
    onRenameValueChange: vi.fn(),
    onRenamingLayoutIdChange: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onSaveAsNameChange: vi.fn(),
    renameValue: '',
    renamingLayoutId: null,
    saveStatus: 'idle',
    saveAsName: '',
    textColor: '#f0f3fa',
    ...overrides,
  });
}

function pressByLabel(root: ReactNode, label: string): void {
  const pressable = collectElementsByType(root, Pressable).find(
    (element) => element.props.accessibilityLabel === label,
  );
  expect(pressable).toBeDefined();
  pressable!.props.onPress!();
}

describe('NativeLayoutSelectorOverlay', () => {
  it('dispatches load, delete, save, refresh, and close actions', () => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    const onLoad = vi.fn();
    const onRefresh = vi.fn();
    const onSave = vi.fn();
    const overlay = renderOverlay({ onClose, onDelete, onLoad, onRefresh, onSave });

    pressByLabel(overlay, 'Load Scalps');
    pressByLabel(overlay, 'Delete Scalps');
    pressByLabel(overlay, 'Save');
    pressByLabel(overlay, 'Refresh chart layouts');
    pressByLabel(overlay, 'Close chart layouts');

    expect(onLoad).toHaveBeenCalledWith('layout-2');
    expect(onDelete).toHaveBeenCalledWith('layout-2');
    expect(onSave).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('saves a new layout from the save-as input', () => {
    const onSaveAs = vi.fn();
    const overlay = renderOverlay({ onSaveAs, saveAsName: 'Breakout' });
    pressByLabel(overlay, 'Save as new layout');

    expect(onSaveAs).toHaveBeenCalledWith('Breakout');
  });

  it('renames a layout from the inline rename input', () => {
    const onRename = vi.fn();
    const secondOverlay = renderOverlay({ onRename, renameValue: 'ETH Scalp', renamingLayoutId: 'layout-2' });
    const renameInput = collectElementsByType(secondOverlay, TextInput).find(
      (element) => element.props.accessibilityLabel === 'Rename layout',
    );
    expect(renameInput).toBeDefined();
    pressByLabel(secondOverlay, 'Confirm rename layout');

    expect(onRename).toHaveBeenCalledWith('layout-2', 'ETH Scalp');
  });
});
