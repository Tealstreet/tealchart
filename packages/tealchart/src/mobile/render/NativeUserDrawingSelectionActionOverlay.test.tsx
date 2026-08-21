import type { ReactElement, ReactNode } from 'react';
import type { UserDrawingSelectionActionAnchor, UserDrawingState } from '../../drawings';
import type { NativeUserDrawingSelectionActionOverlayProps } from './NativeUserDrawingSelectionActionOverlay';

import { Pressable, ScrollView, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { createUserDrawingState, DEFAULT_USER_DRAWING_STYLE } from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import {
  findNativeSelectedDrawingActionHitTarget,
  NativeUserDrawingSelectionActionOverlayImpl,
  resolveNativeSelectedDrawingActionHitTargets,
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

function createOverlayStateProps(
  state: UserDrawingState,
): Pick<
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
    const overlay = renderOverlay();
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
    // React Native chrome takes its own taps rather than exporting a rect for
    // the canvas gesture layer to hit-test.
    expect(deleteButton?.props.onPress).toBeInstanceOf(Function);
    expect(icons.some((icon) => icon.props.name === 'trash')).toBe(true);
  });

  it('renders nothing without a selected drawing', () => {
    const overlay = renderOverlay({}, createUserDrawingState());

    expect(overlay).toBeNull();
  });

  it('resolves no action model without a selected drawing', () => {
    expect(resolveNativeSelectedDrawingActionOverlayModel(createOverlayProps({}, createUserDrawingState()))).toBeNull();
  });

  it('renders the active shared style popover group', () => {
    const overlay = renderOverlay({ openPopoverGroupId: 'style' });
    const scrollViews = collectElementsByType(overlay, ScrollView);
    const lineWidthButton = collectElementsByType(overlay, Pressable).find(
      (pressable) => pressable.props.accessibilityLabel === '3 pixel line width',
    );

    expect(
      scrollViews.some((scrollView) => scrollView.props.accessibilityLabel === 'Selected drawing style controls'),
    ).toBe(true);
    expect(lineWidthButton).not.toBeUndefined();
  });

  it('resolves the active popover group in the action model', () => {
    const model = resolveNativeSelectedDrawingActionOverlayModel(createOverlayProps({ openPopoverGroupId: 'style' }));

    expect(model?.activePopoverGroup?.id).toBe('style');
    expect(model?.surfaceWidth).toBeGreaterThan(0);
    expect(model?.surfaceHeight).toBeGreaterThan(0);
    expect(model?.position.left).toBeGreaterThanOrEqual(0);
  });

  it('lets touches reach the action controls while staying transparent elsewhere', () => {
    const overlay = renderOverlay();
    const views = collectElementsByType(overlay, View);
    const scrollViews = collectElementsByType(overlay, ScrollView);
    const deleteButton = collectElementsByType(overlay, Pressable).find(
      (pressable) => pressable.props.accessibilityLabel === 'Delete selected drawing',
    );

    expect(views[0].props.style).toEqual(expect.arrayContaining([expect.objectContaining({ height: 36 })]));
    expect(views[0].props.style).toEqual(expect.arrayContaining([expect.objectContaining({ zIndex: 70 })]));
    // box-none, not none: the surface itself is not a target, but the buttons
    // inside it must still receive their own presses.
    expect(views[0].props.pointerEvents).toBe('box-none');
    expect(deleteButton?.props.onPress).toBeInstanceOf(Function);
    expect(scrollViews[0].props.canCancelContentTouches).toBe(false);
    // delaysContentTouches is gone from React Native's ScrollView types as of
    // 0.81 — both RCTScrollView.m and the Fabric component set it to NO
    // unconditionally at init, so it is no longer passed and must not be
    // asserted. The behaviour it encoded is now the platform default.
    expect(scrollViews[0].props.delaysContentTouches).toBeUndefined();
    expect(scrollViews[0].props.keyboardShouldPersistTaps).toBe('always');
    expect(deleteButton?.props.hitSlop).toEqual({ left: 8, right: 8, top: 8, bottom: 8 });
  });

  it('resolves native tap targets for selected drawing actions', () => {
    const model = resolveNativeSelectedDrawingActionOverlayModel(createOverlayProps());
    const targets = resolveNativeSelectedDrawingActionHitTargets(model);
    const deleteTarget = targets.find(
      (target) =>
        target.command.type === 'command' &&
        target.command.command.type === 'toolbarAction' &&
        target.command.command.action === 'deleteSelected',
    );

    expect(deleteTarget).not.toBeUndefined();
    expect(deleteTarget?.enabled).toBe(true);
    expect(
      findNativeSelectedDrawingActionHitTarget(
        targets,
        ((deleteTarget?.x1 ?? 0) + (deleteTarget?.x2 ?? 0)) / 2,
        ((deleteTarget?.y1 ?? 0) + (deleteTarget?.y2 ?? 0)) / 2,
      ),
    ).toBe(deleteTarget);
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
    const commandTypes = model?.groups.flatMap((group) => group.items.map((item) => item.command.type)) ?? [];

    expect(commandTypes).not.toContain('editText');
    expect(commandTypes).not.toContain('openProperties');
    // Native has a drawing object tree now, so this one is no longer filtered.
    expect(commandTypes).toContain('openObjectTree');
    expect(commandTypes).toContain('toolbarAction');
  });
});
