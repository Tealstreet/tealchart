import type {
  DrawingCoordinateSpace,
  UserDrawing,
  UserDrawingSelection,
  UserDrawingSelectionActionAnchor,
} from '../../drawings';
import type { NativeGestureControlZone } from './nativeGestureControlZones';

import { getUserDrawingSelectionIds, hitTestUserDrawings } from '../../drawings';
import { NATIVE_USER_DRAWING_EDIT_DRAG_HIT_TEST } from './useNativeUserDrawingRuntime';

const DEFAULT_DRAG_ZONE_RADIUS = 18;
const DEFAULT_DRAG_ZONE_STEP = 20;

export interface NativeUserDrawingEditDragZonesInput {
  anchor: UserDrawingSelectionActionAnchor | null;
  drawings: readonly UserDrawing[];
  radius?: number;
  selection: UserDrawingSelection | null;
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace> | null;
  step?: number;
}

function resolveSampleCoordinates(min: number, max: number, step: number): number[] {
  if (max < min) return [];

  const values = new Set<number>([min, max, (min + max) / 2]);
  for (let value = min; value <= max; value += step) {
    values.add(value);
  }
  return [...values].sort((a, b) => a - b);
}

export function resolveNativeUserDrawingEditDragZones({
  anchor,
  drawings,
  radius = DEFAULT_DRAG_ZONE_RADIUS,
  selection,
  spacesByPaneId,
  step = DEFAULT_DRAG_ZONE_STEP,
}: NativeUserDrawingEditDragZonesInput): readonly NativeGestureControlZone[] {
  if (!anchor || !spacesByPaneId) return [];

  const selectedIds = new Set(getUserDrawingSelectionIds(selection));
  if (selectedIds.size === 0) return [];

  const selectedDrawings = drawings.filter((drawing) => selectedIds.has(drawing.id) && !drawing.locked);
  if (selectedDrawings.length === 0) return [];

  const bounds = anchor.bounds;
  const xValues = resolveSampleCoordinates(bounds.x, bounds.x + bounds.width, step);
  const yValues = resolveSampleCoordinates(bounds.y, bounds.y + bounds.height, step);
  const zones: NativeGestureControlZone[] = [];

  for (const y of yValues) {
    for (const x of xValues) {
      const hit = hitTestUserDrawings(
        selectedDrawings,
        { x, y },
        spacesByPaneId,
        NATIVE_USER_DRAWING_EDIT_DRAG_HIT_TEST,
      );
      if (!hit || !selectedIds.has(hit.drawing.id) || hit.drawing.locked) continue;

      zones.push({
        x1: x - radius,
        x2: x + radius,
        y1: y - radius,
        y2: y + radius,
      });
    }
  }

  return zones;
}
