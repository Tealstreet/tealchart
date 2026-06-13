import type { UserDrawing, UserDrawingKind, UserDrawingState, UserDrawingTool } from './types';

import { getUserDrawingSelectionIds } from './input';
import { getUserDrawingToolDescriptor } from './toolbar';

export type UserDrawingObjectTreeOrder = 'frontToBack' | 'backToFront';

export interface UserDrawingObjectTreeOptions {
  order?: UserDrawingObjectTreeOrder;
}

export interface UserDrawingObjectTreeRow {
  id: string;
  drawingId: string;
  kind: UserDrawingKind;
  tool: UserDrawingTool;
  label: string;
  defaultLabel: string;
  customName: string | null;
  icon: string;
  paneId: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  editable: boolean;
  zIndex: number;
  orderIndex: number;
  groupIds: readonly string[];
}

export interface UserDrawingObjectTreeModel {
  rows: readonly UserDrawingObjectTreeRow[];
  selectedIds: readonly string[];
  drawingCount: number;
}

function resolveUserDrawingObjectTreeRow(
  drawing: UserDrawing,
  drawingIndex: number,
  orderIndex: number,
  selectedIds: ReadonlySet<string>,
): UserDrawingObjectTreeRow {
  const descriptor = getUserDrawingToolDescriptor(drawing.kind);

  return {
    id: drawing.id,
    drawingId: drawing.id,
    kind: drawing.kind,
    tool: drawing.kind,
    label: descriptor.label,
    defaultLabel: descriptor.label,
    customName: null,
    icon: descriptor.icon,
    paneId: drawing.paneId,
    visible: drawing.visible,
    locked: drawing.locked,
    selected: selectedIds.has(drawing.id),
    editable: !drawing.locked,
    zIndex: drawingIndex,
    orderIndex,
    groupIds: [],
  };
}

export function resolveUserDrawingObjectTreeModel(
  state: UserDrawingState,
  options: UserDrawingObjectTreeOptions = {},
): UserDrawingObjectTreeModel {
  const selectedIds = getUserDrawingSelectionIds(state.selection);
  const selectedIdSet = new Set(selectedIds);
  const indexedDrawings = state.drawings.map((drawing, drawingIndex) => ({ drawing, drawingIndex }));
  const orderedDrawings = options.order === 'backToFront' ? indexedDrawings : [...indexedDrawings].reverse();

  return {
    rows: orderedDrawings.map(({ drawing, drawingIndex }, orderIndex) =>
      resolveUserDrawingObjectTreeRow(drawing, drawingIndex, orderIndex, selectedIdSet),
    ),
    selectedIds,
    drawingCount: state.drawings.length,
  };
}
