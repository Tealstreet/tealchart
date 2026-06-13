export type ChartTradingLineSide = 'buy' | 'sell' | 'long' | 'short';

export type ChartTradingLineStatus = 'live' | 'pending' | 'rejected' | 'filled' | 'cancelled';

export type ChartTradingIntentSource = 'native-line' | 'tradingview-bridge' | 'programmatic';

export type ChartTradingBracketOwnerType = 'order' | 'position';

export interface ChartTradingBracketConfig {
  takeProfit?: number;
  stopLoss?: number;
}

export interface ChartTradingAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  tooltip?: string;
  meta?: unknown;
}

export interface ChartTradingLabel {
  primary?: string;
  secondary?: string;
  quantity?: string;
  pnl?: string;
}

export interface ChartTradingLineBase {
  id: string;
  price: number;
  side?: ChartTradingLineSide;
  status?: ChartTradingLineStatus;
  label?: ChartTradingLabel;
  actions?: readonly ChartTradingAction[];
  meta?: unknown;
}

export interface ChartTradingOrderLine extends ChartTradingLineBase {
  kind: 'order';
  orderId?: string;
  quantity?: string | number;
  editable?: boolean;
  cancellable?: boolean;
  brackets?: ChartTradingBracketConfig | null;
  partialEnabled?: boolean;
}

export interface ChartTradingPositionLine extends ChartTradingLineBase {
  kind: 'position';
  positionId?: string;
  quantity?: string | number;
  closeable?: boolean;
  reversible?: boolean;
  brackets?: ChartTradingBracketConfig | null;
  partialEnabled?: boolean;
}

export interface ChartTradingExecutionLine extends ChartTradingLineBase {
  kind: 'execution';
  time: number;
  direction: 'buy' | 'sell';
}

export interface ChartTradingCustomLine extends ChartTradingLineBase {
  kind: 'custom';
  type?: string;
}

export interface ChartTradingState {
  orders?: readonly ChartTradingOrderLine[];
  positions?: readonly ChartTradingPositionLine[];
  executions?: readonly ChartTradingExecutionLine[];
  custom?: readonly ChartTradingCustomLine[];
}

export interface ChartTradingIntentBase {
  source: ChartTradingIntentSource;
  meta?: unknown;
}

export interface ChartTradingOrderMovePreviewIntent extends ChartTradingIntentBase {
  type: 'order.move.preview';
  orderId: string;
  lineId?: string;
  price: number;
}

export interface ChartTradingOrderMoveCommitIntent extends ChartTradingIntentBase {
  type: 'order.move.commit';
  orderId: string;
  lineId?: string;
  price: number;
}

export interface ChartTradingOrderCancelIntent extends ChartTradingIntentBase {
  type: 'order.cancel';
  orderId: string;
  lineId?: string;
}

export interface ChartTradingPositionCloseIntent extends ChartTradingIntentBase {
  type: 'position.close';
  positionId: string;
  lineId?: string;
}

export interface ChartTradingPositionReverseIntent extends ChartTradingIntentBase {
  type: 'position.reverse';
  positionId: string;
  lineId?: string;
}

export interface ChartTradingBracketIntentBase extends ChartTradingIntentBase {
  ownerType: ChartTradingBracketOwnerType;
  ownerId: string;
  lineId?: string;
}

export interface ChartTradingBracketPreviewIntent extends ChartTradingBracketIntentBase {
  type: 'bracket.tp.preview' | 'bracket.sl.preview';
  price: number;
  partialPercent: number;
}

export interface ChartTradingBracketCommitIntent extends ChartTradingBracketIntentBase {
  type: 'bracket.tp.commit' | 'bracket.sl.commit';
  price: number;
  partialPercent?: number;
}

export interface ChartTradingBracketClickIntent extends ChartTradingBracketIntentBase {
  type: 'bracket.tp.click' | 'bracket.sl.click';
}

export interface ChartTradingLineActionIntent extends ChartTradingIntentBase {
  type: 'line.action';
  lineId: string;
  actionId: string;
}

export type ChartTradingIntent =
  | ChartTradingOrderMovePreviewIntent
  | ChartTradingOrderMoveCommitIntent
  | ChartTradingOrderCancelIntent
  | ChartTradingPositionCloseIntent
  | ChartTradingPositionReverseIntent
  | ChartTradingBracketPreviewIntent
  | ChartTradingBracketCommitIntent
  | ChartTradingBracketClickIntent
  | ChartTradingLineActionIntent;

export type ChartTradingIntentHandler = (intent: ChartTradingIntent) => void;

export interface ChartTradingApi {
  setState(state: ChartTradingState): void;
  getState(): ChartTradingState;
  onIntent(handler: ChartTradingIntentHandler): void;
}
