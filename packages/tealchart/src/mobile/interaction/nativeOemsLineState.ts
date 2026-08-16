import type { OrderLineRenderData, PositionLineRenderData } from '../../types';

/**
 * Native aliases over the shared OEMS line adapter.
 *
 * The bodies used to live here in full, duplicated character for character from
 * `ChartCore`. They are shared now; this file keeps the native names so call
 * sites did not have to move with them.
 */
export {
  applyOemsOrderActionState as applyNativeOrderActionState,
  applyOemsPositionActionState as applyNativePositionActionState,
  confirmOemsOrderLineSnapshots as confirmNativeOrderLineSnapshots,
  confirmOemsPositionLineSnapshots as confirmNativePositionLineSnapshots,
  getOemsOrderLineState as getNativeOrderLineState,
  getOemsPositionLineState as getNativePositionLineState,
  type OemsTradingLineState as NativeOemsTradingLineState,
} from '../../interaction/oemsLineState';

export function isNativeOrderLineRenderData(
  line: OrderLineRenderData | PositionLineRenderData,
): line is OrderLineRenderData {
  return 'cancellable' in line;
}
