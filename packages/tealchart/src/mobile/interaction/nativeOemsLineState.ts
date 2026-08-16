import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { OemsActionManager } from '../../interaction/oemsActionManager';
import type { OemsTradingLineState } from '../../interaction/oemsLineState';

import {
  applyOemsOrderActionState,
  applyOemsPositionActionState,
  confirmOemsOrderLineSnapshots,
  confirmOemsPositionLineSnapshots,
  getOemsOrderLineState,
  getOemsPositionLineState,
} from '../../interaction/oemsLineState';

/**
 * The native face of the shared OEMS line adapter.
 *
 * The bodies used to live here in full, duplicated character for character from
 * `ChartCore`, and drifted. They are shared now - but these stay real functions
 * rather than collapsing into re-exports, because consumers of the mirror pin
 * them here to assert that native OEMS state lives in passive helpers rather
 * than inside `SkiaTealchart`. That guard is worth more than the eight lines.
 */

export type { OemsTradingLineState as NativeOemsTradingLineState } from '../../interaction/oemsLineState';

export function getNativeOrderLineState(line: OrderLineRenderData): OemsTradingLineState {
  return getOemsOrderLineState(line);
}

export function getNativePositionLineState(line: PositionLineRenderData): OemsTradingLineState {
  return getOemsPositionLineState(line);
}

export function applyNativeOrderActionState(
  line: OrderLineRenderData,
  manager: OemsActionManager<OemsTradingLineState>,
): OrderLineRenderData {
  return applyOemsOrderActionState(line, manager);
}

export function applyNativePositionActionState(
  line: PositionLineRenderData,
  manager: OemsActionManager<OemsTradingLineState>,
): PositionLineRenderData {
  return applyOemsPositionActionState(line, manager);
}

export function confirmNativeOrderLineSnapshots(
  manager: OemsActionManager<OemsTradingLineState>,
  lines: readonly OrderLineRenderData[],
): void {
  confirmOemsOrderLineSnapshots(manager, lines);
}

export function confirmNativePositionLineSnapshots(
  manager: OemsActionManager<OemsTradingLineState>,
  lines: readonly PositionLineRenderData[],
): void {
  confirmOemsPositionLineSnapshots(manager, lines);
}

export function isNativeOrderLineRenderData(
  line: OrderLineRenderData | PositionLineRenderData,
): line is OrderLineRenderData {
  return 'cancellable' in line;
}
