import type { ReactElement, ReactNode } from 'react';
import type { UserDrawingObjectTreeDispatchAction } from '../../drawings';

import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  createUserDrawingState,
  DEFAULT_USER_DRAWING_STYLE,
  resolveUserDrawingObjectTreeModel,
} from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import {
  NativeUserDrawingObjectTreePanelView,
  resolveNativeUserDrawingObjectTreeRowActions,
  resolveNativeUserDrawingObjectTreeSections,
} from './NativeUserDrawingObjectTreePanel';

interface TestElementProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  label?: string;
  name?: string;
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

function collectByType(root: ReactNode, type: unknown): TestElement[] {
  const elements: TestElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

/** Action buttons are their own component, so they are found by prop, not type. */
function findAction(root: ReactNode, label: string): TestElement | undefined {
  let found: TestElement | undefined;
  walkElements(root, (element) => {
    if (!found && element.props.label === label) found = element;
  });
  return found;
}

function drawing(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    kind: 'horizontalLine' as const,
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    price: 50,
    style: DEFAULT_USER_DRAWING_STYLE,
    ...overrides,
  };
}

function modelFor(...drawings: ReturnType<typeof drawing>[]) {
  return resolveUserDrawingObjectTreeModel(createUserDrawingState({ drawings }));
}

function renderPanel(
  model = modelFor(drawing('a'), drawing('b')),
  onDispatch: (action: UserDrawingObjectTreeDispatchAction) => boolean = () => true,
) {
  return NativeUserDrawingObjectTreePanelView({
    backgroundColor: '#16171a',
    gridColor: '#202124',
    model,
    mutedTextColor: '#9ca3af',
    onClose: vi.fn(),
    onDispatch,
    onRenameValueChange: vi.fn(),
    onRenamingDrawingIdChange: vi.fn(),
    renameValue: '',
    renamingDrawingId: null,
    textColor: '#d1d4dc',
  });
}

describe('resolveNativeUserDrawingObjectTreeSections', () => {
  it('follows group order and resolves every row id', () => {
    const model = modelFor(drawing('a'), drawing('b'));
    const sections = resolveNativeUserDrawingObjectTreeSections(model);

    expect(sections.length).toBe(model.groups?.length);
    expect(sections.flatMap((section) => section.rows.map((row) => row.drawingId)).sort()).toEqual(['a', 'b']);
    expect(sections.every((section) => section.rows.every(Boolean))).toBe(true);
  });

  it('returns nothing to render for an empty tree', () => {
    expect(resolveNativeUserDrawingObjectTreeSections(modelFor())).toEqual([]);
  });
});

describe('resolveNativeUserDrawingObjectTreeRowActions', () => {
  // The model reports show/hide and lock/unlock as a pair where only the one
  // that applies is enabled, so rendering both would draw a dead button.
  it('keeps only the enabled half of each toggle pair', () => {
    const [visibleRow] = modelFor(drawing('a')).rows;
    const actions = resolveNativeUserDrawingObjectTreeRowActions(visibleRow);

    expect(actions).toContain('hide');
    expect(actions).not.toContain('show');

    const [hiddenRow] = modelFor(drawing('a', { visible: false })).rows;
    const hiddenActions = resolveNativeUserDrawingObjectTreeRowActions(hiddenRow);

    expect(hiddenActions).toContain('show');
    expect(hiddenActions).not.toContain('hide');
  });

  it('never offers rename here, which the panel renders separately', () => {
    const [row] = modelFor(drawing('a')).rows;
    expect(resolveNativeUserDrawingObjectTreeRowActions(row)).not.toContain('rename');
  });

  // A lone drawing has nothing to reorder against, so the model reports the
  // z-order actions present but disabled. Rendering them would draw dead buttons.
  it('drops actions the model reports as disabled', () => {
    const [lone] = modelFor(drawing('a')).rows;
    expect(lone.actions?.some((action) => action.type === 'bringForward' && !action.enabled)).toBe(true);
    expect(resolveNativeUserDrawingObjectTreeRowActions(lone)).not.toContain('bringForward');

    const rows = modelFor(drawing('a'), drawing('b')).rows;
    const reorderable = rows.find((row) => row.actions?.some((a) => a.type === 'bringForward' && a.enabled));
    expect(reorderable).toBeDefined();
    expect(resolveNativeUserDrawingObjectTreeRowActions(reorderable!)).toContain('bringForward');
  });
});

describe('NativeUserDrawingObjectTreePanelView', () => {
  it('renders a row per drawing and reports the count', () => {
    const tree = renderPanel(modelFor(drawing('a'), drawing('b')));
    const labels = collectByType(tree, Pressable)
      .map((element) => element.props.accessibilityLabel)
      .filter((label): label is string => Boolean(label));

    expect(labels.filter((label) => label.startsWith('Select ')).length).toBe(2);
    const texts = collectByType(tree, Text).map((element) => element.props.children);
    expect(texts).toContain('Drawings (2)');
  });

  it('shows an empty state rather than a bare panel', () => {
    const texts = collectByType(renderPanel(modelFor()), Text).map((element) => element.props.children);
    expect(texts).toContain('No drawings');
  });

  // row.icon is a unicode glyph such as "╱"; the package icon rule requires the
  // shared vector registry on native, keyed by the tool.
  it('draws row icons from the shared registry, not the glyph field', () => {
    const model = modelFor(drawing('a', { kind: 'trendLine', points: [] }));
    const iconNames = collectByType(renderPanel(model), NativeDrawingIcon).map((element) => element.props.name);

    expect(iconNames).toContain(model.rows[0].tool);
    expect(iconNames).not.toContain(model.rows[0].icon);
  });

  it('selects a drawing when its row is pressed', () => {
    const onDispatch = vi.fn(() => true);
    const tree = renderPanel(modelFor(drawing('a')), onDispatch);
    const row = collectByType(tree, Pressable).find(
      (element) => element.props.accessibilityLabel?.startsWith('Select '),
    );

    row?.props.onPress?.();

    expect(onDispatch).toHaveBeenCalledWith({ type: 'select', drawingId: 'a' });
  });

  it('dispatches the row action a button stands for', () => {
    const onDispatch = vi.fn(() => true);
    const tree = renderPanel(modelFor(drawing('a')), onDispatch);
    const hide = findAction(tree, 'Hide');
    expect(hide).toBeDefined();

    hide?.props.onPress?.();

    expect(onDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'hide', drawingIds: ['a'] }));
  });
});
