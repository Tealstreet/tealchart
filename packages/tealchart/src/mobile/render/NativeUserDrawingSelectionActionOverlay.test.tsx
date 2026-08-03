import type { ReactElement, ReactNode } from 'react';
import type { UserDrawingSelectionActionAnchor, UserDrawingState } from '../../drawings';
import type { NativeUserDrawingSelectionActionOverlayProps } from './NativeUserDrawingSelectionActionOverlay';

import { describe, expect, it, vi } from 'vitest';
import { Pressable, ScrollView } from 'react-native';

import {
  DEFAULT_USER_DRAWING_STYLE,
  createUserDrawingState,
} from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import {
  NativeUserDrawingSelectionActionOverlayImpl,
  resolveNativeSelectedDrawingActionOverlayModel,
} from './NativeUserDrawingSelectionActionOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  name?: string;
  onPress?: () => void;
  style?: unknown;
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

const selectedAnchor: UserDrawingSelectionActionAnchor = {
  anchor: { x: 160, y: 100 },
  bounds: { x: 80, y: 90, width: 160, height: 20 },
  drawingIds: ['line'],
  paneIds: ['main'],
  primaryPaneId: 'main',
};

function createSelectedDrawingState() {
  return createUserDrawingState({
    selection: { drawingId: 'line' },
    drawings: [
      {
        id: 'line',
        kind: 'horizontalLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        price: 50,
        style: DEFAULT_USER_DRAWING_STYLE,
      },
    ],
  });
}

function createSelectedTextDrawingState() {
  return createUserDrawingState({
    selection: { drawingId: 'text' },
    drawings: [
      {
        id: 'text',
        kind: 'textLabel',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        point: { time: 1, price: 50 },
        text: 'Note',
        textAlign: 'left',
        style: DEFAULT_USER_DRAWING_STYLE,
      },
    ],
  });
}

function createOverlayStateProps(state: UserDrawingState): Pick<
  NativeUserDrawingSelectionActionOverlayProps,
  | 'userDrawingDefaultStylesByKind'
  | 'userDrawingDraft'
  | 'userDrawingDrawings'
  | 'userDrawingSelection'
  | 'userDrawingTextEdit'
> {
  return {
    userDrawingDefaultStylesByKind: state.defaultStylesByKind,
    userDrawingDraft: state.draft,
    userDrawingDrawings: state.drawings,
    userDrawingSelection: state.selection,
    userDrawingTextEdit: state.textEdit,
  };
}

function createOverlayProps(
  overrides: Partial<NativeUserDrawingSelectionActionOverlayProps> = {},
  state: UserDrawingState = createSelectedDrawingState(),
): NativeUserDrawingSelectionActionOverlayProps {
  return {
    activeBackgroundColor: '#20242a',
    activeTextColor: '#12c48b',
    anchor: selectedAnchor,
    backgroundColor: '#101418',
    gridColor: '#222831',
    mutedTextColor: '#8a8f98',
    onAction: vi.fn(),
    onPopoverGroupChange: vi.fn(),
    textColor: '#eef2f8',
    ...createOverlayStateProps(state),
    viewportHeight: 300,
    viewportWidth: 400,
    ...overrides,
  };
}

function renderOverlay(
  overrides: Partial<NativeUserDrawingSelectionActionOverlayProps> = {},
  state: UserDrawingState = createSelectedDrawingState(),
) {
  return NativeUserDrawingSelectionActionOverlayImpl(createOverlayProps(overrides, state));
}

describe('NativeUserDrawingSelectionActionOverlay', () => {
  it('renders selected drawing actions from the shared action surface', () => {
    const onAction = vi.fn();
    const overlay = renderOverlay({ onAction });
    const pressables = collectElementsByType(overlay, Pressable);
    const icons = collectElementsByType(overlay, NativeDrawingIcon);

    const duplicateButton = pressables.find(
      (pressable) => pressable.props.accessibilityLabel === 'Duplicate selected drawing',
    );
    const deleteButton = pressables.find(
      (pressable) => pressable.props.accessibilityLabel === 'Delete selected drawing',
    );

    expect(duplicateButton).not.toBeUndefined();
    expect(deleteButton).not.toBeUndefined();
    expect(icons.some((icon) => icon.props.name === 'trash')).toBe(true);

    deleteButton?.props.onPress!();
    expect(onAction).toHaveBeenCalledWith({ type: 'toolbarAction', action: 'deleteSelected' });
  });

  it('renders nothing without a selected drawing', () => {
    const overlay = renderOverlay({}, createUserDrawingState());

    expect(overlay).toBeNull();
  });

  it('resolves no action model without a selected drawing', () => {
    expect(
      resolveNativeSelectedDrawingActionOverlayModel(createOverlayProps({}, createUserDrawingState())),
    ).toBeNull();
  });

  it('can open the shared style popover group', () => {
    const overlay = renderOverlay({ openPopoverGroupId: 'style' });
    const scrollViews = collectElementsByType(overlay, ScrollView);
    const lineWidthButton = collectElementsByType(overlay, Pressable).find(
      (pressable) => pressable.props.accessibilityLabel === '3 pixel line width',
    );

    expect(
      scrollViews.some(
        (scrollView) => scrollView.props.accessibilityLabel === 'Selected drawing style controls',
      ),
    ).toBe(true);
    expect(lineWidthButton).not.toBeUndefined();
  });

  it('resolves the active popover group in the action model', () => {
    const model = resolveNativeSelectedDrawingActionOverlayModel(
      createOverlayProps({ openPopoverGroupId: 'style' }),
    );

    expect(model?.activePopoverGroup?.id).toBe('style');
    expect(model?.surfaceWidth).toBeGreaterThan(0);
    expect(model?.position.left).toBeGreaterThanOrEqual(0);
  });

  it('does not expose native text edit without a native text editor', () => {
    const overlay = renderOverlay({}, createSelectedTextDrawingState());
    const editButton = collectElementsByType(overlay, Pressable).find(
      (pressable) => pressable.props.accessibilityLabel === 'Edit text',
    );

    expect(editButton).toBeUndefined();
  });

  it('filters unsupported native selected action commands in the action model', () => {
    const model = resolveNativeSelectedDrawingActionOverlayModel(
      createOverlayProps({}, createSelectedTextDrawingState()),
    );
    const commandTypes = model?.groups.flatMap((group) =>
      group.items.map((item) => item.command.type),
    ) ?? [];

    expect(commandTypes).not.toContain('editText');
    expect(commandTypes).not.toContain('openObjectTree');
    expect(commandTypes).toContain('toolbarAction');
  });
});
