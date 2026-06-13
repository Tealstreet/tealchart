import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitTestOptions } from './hitTesting';
import type { UserDrawingState } from './types';
import type {
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroupId,
  UserDrawingSelectedActionSurfaceItem,
} from './toolbar';

import { resolveUserDrawingSelectionAtPoint } from './input';
import { resolveUserDrawingSelectedActionSurface } from './toolbar';

export interface UserDrawingContextActionItem {
  id: UserDrawingSelectedActionSurfaceItem['id'];
  groupId: UserDrawingSelectedActionSurfaceGroupId;
  label: string;
  enabled: boolean;
  destructive?: boolean;
  command: UserDrawingSelectedActionSurfaceCommand;
}

export interface ResolveUserDrawingContextActionsAtPointOptions {
  hitTest?: UserDrawingHitTestOptions;
}

export interface UserDrawingContextActionsAtPointResult {
  state: UserDrawingState;
  hit: boolean;
  changed: boolean;
  drawingId: string | null;
  items: readonly UserDrawingContextActionItem[];
}

export function resolveUserDrawingContextActionsAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: ResolveUserDrawingContextActionsAtPointOptions = {},
): UserDrawingContextActionsAtPointResult {
  const selection = resolveUserDrawingSelectionAtPoint(state, point, spacesByPaneId, {
    hitTest: options.hitTest,
  });
  if (!selection.hit) {
    return {
      state,
      hit: false,
      changed: false,
      drawingId: null,
      items: [],
    };
  }

  const surface = resolveUserDrawingSelectedActionSurface(selection.state);
  return {
    state: selection.state,
    hit: true,
    changed: selection.changed,
    drawingId: surface.selectedDrawing?.id ?? null,
    items: surface.groups.flatMap((group) =>
      group.items.map((item) => ({
        id: item.id,
        groupId: group.id,
        label: item.label,
        enabled: item.enabled,
        destructive: item.destructive,
        command: item.command,
      })),
    ),
  };
}
