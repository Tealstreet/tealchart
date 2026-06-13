import type {
  BracketConfig,
  ChartLabelButton,
  ExecutionLineRenderData,
  OrderLineRenderData,
  PositionLineRenderData,
} from '../types';
import type {
  ChartTradingAction,
  ChartTradingIntentHandler,
  ChartTradingLineSide,
  ChartTradingLineStyle,
  ChartTradingOrderLine,
  ChartTradingPositionLine,
  ChartTradingState,
} from './types';

export interface ChartTradingRenderData {
  orderLines: OrderLineRenderData[];
  positionLines: PositionLineRenderData[];
  executionLines: ExecutionLineRenderData[];
}

export function chartTradingLineId(kind: 'order' | 'position' | 'execution', id: string): string {
  return `chart_trading_${kind}_${id}`;
}

export function chartTradingStateToRenderData(
  state: ChartTradingState | undefined,
  onIntent?: ChartTradingIntentHandler,
): ChartTradingRenderData {
  return {
    orderLines: (state?.orders ?? []).map((order) => toOrderLineRenderData(order, onIntent)),
    positionLines: (state?.positions ?? []).map((position) => toPositionLineRenderData(position, onIntent)),
    executionLines: (state?.executions ?? []).map(toExecutionLineRenderData),
  };
}

function toOrderLineRenderData(order: ChartTradingOrderLine, onIntent?: ChartTradingIntentHandler): OrderLineRenderData {
  const lineId = chartTradingLineId('order', order.id);
  const style = order.style;
  const lineColor = style?.lineColor ?? tradingLineColor(order.side, 'order');
  const orderId = order.orderId ?? order.id;
  const cancellable = order.cancellable === true || hasEnabledTradingAction(order.actions, 'cancel');
  const quantity = formatTradingQuantity(order.label?.quantity ?? order.quantity);
  const text = order.label?.primary ?? defaultTradingLabel(order.side, 'Order');
  const textShort = order.label?.secondary ?? text;

  return {
    id: lineId,
    orderId,
    price: order.price,
    quantity,
    quantityShort: quantity,
    text,
    textShort,
    lineColor,
    lineStyle: lineStyleValue(style?.lineStyle) ?? 0,
    lineWidth: style?.lineWidth ?? 1,
    lineLength: style?.lineLength ?? 50,
    extendLeft: style?.extendLeft ?? false,
    editable: order.editable === true,
    cancellable,
    bodyBackgroundColor: style?.bodyBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
    bodyTextColor: style?.bodyTextColor ?? '#FFFFFF',
    bodyBorderColor: style?.bodyBorderColor ?? lineColor,
    quantityBackgroundColor: style?.quantityBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
    quantityTextColor: style?.quantityTextColor ?? '#FFFFFF',
    quantityBorderColor: style?.quantityBorderColor ?? lineColor,
    cancelButtonBackgroundColor: style?.actionBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
    cancelButtonIconColor: style?.actionIconColor ?? '#FFFFFF',
    cancelButtonBorderColor: style?.actionBorderColor ?? lineColor,
    cancelTooltip: 'Cancel order',
    modifyTooltip: 'Modify order',
    brackets: toBracketConfig(order.brackets),
    partialEnabled: order.partialEnabled === true,
    actions: toRenderActions(order.actions, style, 'rgba(33, 150, 243, 0.75)', '#2196F3'),
    callbacks: {
      onMove: order.editable === true
        ? (price) =>
            onIntent?.({
              type: 'order.move.commit',
              orderId,
              lineId,
              price,
              source: 'native-line',
              ...metaField(order.meta),
            })
        : undefined,
      onCancel: cancellable
        ? () =>
            onIntent?.({
              type: 'order.cancel',
              orderId,
              lineId,
              source: 'native-line',
              ...metaField(order.meta),
            })
        : undefined,
      onTPClick: () => emitBracketClick(onIntent, 'order', orderId, lineId, 'bracket.tp.click', order.meta),
      onSLClick: () => emitBracketClick(onIntent, 'order', orderId, lineId, 'bracket.sl.click', order.meta),
      onTPMove: (price, partialPercent = 100) =>
        emitBracketPreview(onIntent, 'order', orderId, lineId, 'bracket.tp.preview', price, partialPercent, order.meta),
      onSLMove: (price, partialPercent = 100) =>
        emitBracketPreview(onIntent, 'order', orderId, lineId, 'bracket.sl.preview', price, partialPercent, order.meta),
      onTPMoveEnd: (price, partialPercent) =>
        emitBracketCommit(onIntent, 'order', orderId, lineId, 'bracket.tp.commit', price, partialPercent, order.meta),
      onSLMoveEnd: (price, partialPercent) =>
        emitBracketCommit(onIntent, 'order', orderId, lineId, 'bracket.sl.commit', price, partialPercent, order.meta),
    },
  };
}

function toPositionLineRenderData(
  position: ChartTradingPositionLine,
  onIntent?: ChartTradingIntentHandler,
): PositionLineRenderData {
  const lineId = chartTradingLineId('position', position.id);
  const style = position.style;
  const lineColor = style?.lineColor ?? tradingLineColor(position.side, 'position');
  const positionId = position.positionId ?? position.id;
  const closeable = position.closeable === true || hasEnabledTradingAction(position.actions, 'close');
  const reversible = position.reversible === true || hasEnabledTradingAction(position.actions, 'reverse');
  const quantity = formatTradingQuantity(position.label?.quantity ?? position.quantity);
  const text = position.label?.primary ?? defaultTradingLabel(position.side, 'Position');
  const textShort = position.label?.secondary ?? text;
  const pnl = position.label?.pnl ?? position.label?.secondary ?? '';
  const isLong = position.side !== 'short' && position.side !== 'sell';

  return {
    id: lineId,
    positionId,
    price: position.price,
    quantity,
    quantityShort: quantity,
    text,
    textShort,
    lineColor,
    lineStyle: lineStyleValue(style?.lineStyle) ?? 0,
    lineWidth: style?.lineWidth ?? 2,
    lineLength: style?.lineLength ?? 100,
    extendLeft: style?.extendLeft ?? false,
    bodyBackgroundColor: style?.bodyBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
    bodyTextColor: style?.bodyTextColor ?? '#FFFFFF',
    bodyBorderColor: style?.bodyBorderColor ?? lineColor,
    quantityBackgroundColor: style?.quantityBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
    quantityTextColor: style?.quantityTextColor ?? '#FFFFFF',
    quantityBorderColor: style?.quantityBorderColor ?? lineColor,
    closeable,
    closeButtonBackgroundColor: style?.actionBackgroundColor ?? 'rgba(244, 67, 54, 0.75)',
    closeButtonIconColor: style?.actionIconColor ?? '#FFFFFF',
    closeButtonBorderColor: style?.actionBorderColor ?? '#F44336',
    reversible,
    reverseButtonBackgroundColor: style?.actionBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
    reverseButtonIconColor: style?.actionIconColor ?? '#FFFFFF',
    reverseButtonBorderColor: style?.actionBorderColor ?? lineColor,
    closeTooltip: 'Close position',
    protectTooltipText: 'Protect position',
    pnl,
    pnlShort: pnl,
    profitState: position.profitState ?? 'neutral',
    brackets: toBracketConfig(position.brackets),
    partialEnabled: position.partialEnabled === true,
    positionData: {
      entryPrice: position.price,
      notional: position.notional ?? 0,
      isLong,
    },
    actions: toRenderActions(position.actions, style, 'rgba(76, 175, 80, 0.75)', '#4CAF50'),
    callbacks: {
      onClose: closeable
        ? () =>
            onIntent?.({
              type: 'position.close',
              positionId,
              lineId,
              source: 'native-line',
              ...metaField(position.meta),
            })
        : undefined,
      onReverse: reversible
        ? () =>
            onIntent?.({
              type: 'position.reverse',
              positionId,
              lineId,
              source: 'native-line',
              ...metaField(position.meta),
            })
        : undefined,
      onTPClick: () => emitBracketClick(onIntent, 'position', positionId, lineId, 'bracket.tp.click', position.meta),
      onSLClick: () => emitBracketClick(onIntent, 'position', positionId, lineId, 'bracket.sl.click', position.meta),
      onTPMove: (price, partialPercent = 100) =>
        emitBracketPreview(
          onIntent,
          'position',
          positionId,
          lineId,
          'bracket.tp.preview',
          price,
          partialPercent,
          position.meta,
        ),
      onSLMove: (price, partialPercent = 100) =>
        emitBracketPreview(
          onIntent,
          'position',
          positionId,
          lineId,
          'bracket.sl.preview',
          price,
          partialPercent,
          position.meta,
        ),
      onTPMoveEnd: (price, partialPercent) =>
        emitBracketCommit(
          onIntent,
          'position',
          positionId,
          lineId,
          'bracket.tp.commit',
          price,
          partialPercent,
          position.meta,
        ),
      onSLMoveEnd: (price, partialPercent) =>
        emitBracketCommit(
          onIntent,
          'position',
          positionId,
          lineId,
          'bracket.sl.commit',
          price,
          partialPercent,
          position.meta,
        ),
    },
  };
}

function toExecutionLineRenderData(execution: NonNullable<ChartTradingState['executions']>[number]): ExecutionLineRenderData {
  const color = execution.style?.lineColor ?? tradingLineColor(execution.direction, 'order');

  return {
    id: chartTradingLineId('execution', execution.id),
    price: execution.price,
    time: execution.time,
    direction: execution.direction,
    text: execution.label?.primary ?? execution.direction.toUpperCase(),
    tooltip: execution.label?.secondary ?? '',
    arrowHeight: 20,
    arrowSpacing: 20,
    font: '11px sans-serif',
    textColor: execution.style?.bodyTextColor ?? '#ffffff',
    arrowColor: color,
  };
}

function toBracketConfig(brackets: ChartTradingOrderLine['brackets']): BracketConfig | null {
  if (!brackets) return null;
  return {
    takeProfit: brackets.takeProfit,
    stopLoss: brackets.stopLoss,
  };
}

function toRenderActions(
  actions: readonly ChartTradingAction[] | undefined,
  style: ChartTradingLineStyle | undefined,
  defaultBackgroundColor: string,
  defaultBorderColor: string,
): ChartLabelButton[] {
  return (actions ?? [])
    .filter((action) => !action.disabled && !isBuiltInTradingAction(action.id))
    .map((action) => ({
      type: 'action',
      actionId: action.id,
      icon: action.icon ?? action.label.slice(0, 2).toUpperCase(),
      backgroundColor: style?.actionBackgroundColor ?? defaultBackgroundColor,
      iconColor: style?.actionIconColor ?? '#FFFFFF',
      borderColor: style?.actionBorderColor ?? style?.lineColor ?? defaultBorderColor,
      tooltip: action.tooltip ?? action.label,
    }));
}

function emitBracketClick(
  onIntent: ChartTradingIntentHandler | undefined,
  ownerType: 'order' | 'position',
  ownerId: string,
  lineId: string,
  type: 'bracket.tp.click' | 'bracket.sl.click',
  meta: unknown,
): void {
  onIntent?.({ type, ownerType, ownerId, lineId, source: 'native-line', ...metaField(meta) });
}

function emitBracketPreview(
  onIntent: ChartTradingIntentHandler | undefined,
  ownerType: 'order' | 'position',
  ownerId: string,
  lineId: string,
  type: 'bracket.tp.preview' | 'bracket.sl.preview',
  price: number,
  partialPercent: number,
  meta: unknown,
): void {
  onIntent?.({ type, ownerType, ownerId, lineId, price, partialPercent, source: 'native-line', ...metaField(meta) });
}

function emitBracketCommit(
  onIntent: ChartTradingIntentHandler | undefined,
  ownerType: 'order' | 'position',
  ownerId: string,
  lineId: string,
  type: 'bracket.tp.commit' | 'bracket.sl.commit',
  price: number,
  partialPercent: number | undefined,
  meta: unknown,
): void {
  onIntent?.({
    type,
    ownerType,
    ownerId,
    lineId,
    price,
    ...(partialPercent === undefined ? {} : { partialPercent }),
    source: 'native-line',
    ...metaField(meta),
  });
}

function metaField(meta: unknown): { meta?: unknown } {
  return meta === undefined ? {} : { meta };
}

function hasEnabledTradingAction(actions: readonly { id: string; disabled?: boolean }[] | undefined, id: string): boolean {
  return actions?.some((action) => action.id === id && !action.disabled) ?? false;
}

function isBuiltInTradingAction(actionId: string): boolean {
  return actionId === 'cancel' || actionId === 'close' || actionId === 'reverse';
}

function formatTradingQuantity(quantity: string | number | undefined): string {
  return quantity === undefined ? '' : String(quantity);
}

function defaultTradingLabel(side: ChartTradingLineSide | undefined, fallback: string): string {
  if (!side) return fallback;
  return side.toUpperCase();
}

function tradingLineColor(side: ChartTradingLineSide | undefined, kind: 'order' | 'position'): string {
  if (side === 'buy' || side === 'long') return '#22c55e';
  if (side === 'sell' || side === 'short') return '#ef4444';
  return kind === 'position' ? '#4CAF50' : '#2196F3';
}

function lineStyleValue(style: ChartTradingLineStyle['lineStyle'] | undefined): number | undefined {
  if (style === undefined) return undefined;
  if (style === 'solid') return 0;
  if (style === 'dotted') return 1;
  if (style === 'dashed') return 2;
  return style;
}

export function isChartTradingLineId(lineId: string): boolean {
  return lineId.startsWith('chart_trading_');
}
