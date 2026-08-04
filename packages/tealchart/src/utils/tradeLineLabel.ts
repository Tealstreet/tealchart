import type {
  ChartLabelButton,
  ChartLabelSegment,
  ChartLineLabel,
  OrderLineRenderData,
  PositionLineRenderData,
} from '../types';

import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
  STOP_LOSS_COLOR,
} from '../constants';

export interface OrderedTradeLineButtons<T extends ChartLabelButton> {
  inlineButtons: T[];
  tpslButtons: T[];
  orderedButtons: T[];
}

export function splitTradeLineButtonsForDisplay<T extends ChartLabelButton>(
  buttons: readonly T[] = [],
): OrderedTradeLineButtons<T> {
  const inlineButtons = buttons.filter((button) => button.type !== 'tp' && button.type !== 'sl');
  const tpslButtons = buttons.filter((button) => button.type === 'tp' || button.type === 'sl');
  return {
    inlineButtons,
    tpslButtons,
    orderedButtons: [...inlineButtons, ...tpslButtons],
  };
}

export function orderTradeLineButtonsForDisplay<T extends ChartLabelButton>(buttons: readonly T[] = []): T[] {
  return splitTradeLineButtonsForDisplay(buttons).orderedButtons;
}

export function resolveOrderTradeLineLabel(order: OrderLineRenderData, positiveColor: string): ChartLineLabel {
  const takeProfitColor = order.brackets?.takeProfitColor ?? positiveColor;
  const takeProfitTextColor = order.brackets?.takeProfitTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  const stopLossColor = order.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = order.brackets?.stopLossTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;

  return {
    offsetPercent: order.lineLength,
    segments: [
      ...buildBodySegments(
        order.text,
        order.textShort,
        order.bodyBackgroundColor,
        order.bodyTextColor,
        order.bodyBorderColor,
      ),
      ...buildBodySegments(
        order.quantity,
        order.quantityShort,
        order.quantityBackgroundColor,
        order.quantityTextColor,
        order.quantityBorderColor,
      ),
    ],
    buttons: [
      ...buildBracketButtons(
        order.brackets !== null,
        takeProfitColor,
        takeProfitTextColor,
        stopLossColor,
        stopLossTextColor,
      ),
      ...(order.cancellable
        ? [
            {
              type: 'cancel' as const,
              icon: order.cancelAsSubmit ? '✓' : '×',
              backgroundColor: order.cancelButtonBackgroundColor,
              iconColor: order.cancelButtonIconColor,
              borderColor: order.cancelButtonBorderColor,
              tooltip: order.cancelTooltip,
            },
          ]
        : []),
    ],
  };
}

export function resolvePositionTradeLineLabel(
  position: PositionLineRenderData,
  positiveColor: string,
  negativeColor: string,
): ChartLineLabel {
  const pnlStateColor =
    position.profitState === 'positive'
      ? positiveColor
      : position.profitState === 'negative'
        ? negativeColor
        : undefined;
  const takeProfitColor = position.brackets?.takeProfitColor ?? positiveColor;
  const takeProfitTextColor = position.brackets?.takeProfitTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  const stopLossColor = position.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = position.brackets?.stopLossTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;

  return {
    offsetPercent: position.lineLength,
    segments: [
      ...buildBodySegments(
        position.text,
        position.textShort,
        position.bodyBackgroundColor,
        position.bodyTextColor,
        position.bodyBorderColor,
      ),
      ...buildBodySegments(
        position.quantity,
        position.quantityShort,
        position.quantityBackgroundColor,
        position.quantityTextColor,
        position.quantityBorderColor,
      ),
      ...(position.pnl
        ? [
            {
              text: position.pnl,
              textShort: position.pnlShort || undefined,
              backgroundColor: pnlStateColor ?? position.lineColor,
              textColor: pnlStateColor ? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR : position.bodyTextColor,
              borderColor: position.lineColor,
            },
          ]
        : []),
    ],
    buttons: [
      ...(position.reversible
        ? [
            {
              type: 'reverse' as const,
              icon: '⇄',
              backgroundColor: position.reverseButtonBackgroundColor,
              iconColor: position.reverseButtonIconColor,
              borderColor: position.reverseButtonBorderColor,
              tooltip: position.reverseTooltip,
            },
          ]
        : []),
      ...(position.closeable
        ? [
            {
              type: 'close' as const,
              icon: '×',
              backgroundColor: position.closeButtonBackgroundColor,
              iconColor: position.closeButtonIconColor,
              borderColor: position.closeButtonBorderColor,
              tooltip: position.closeTooltip,
            },
          ]
        : []),
      ...buildBracketButtons(
        position.brackets !== null,
        takeProfitColor,
        takeProfitTextColor,
        stopLossColor,
        stopLossTextColor,
      ),
    ],
  };
}

function buildBodySegments(
  text: string,
  textShort: string,
  backgroundColor: string,
  textColor: string,
  borderColor: string,
): ChartLabelSegment[] {
  if (!text) return [];
  return [
    {
      text,
      textShort: textShort || undefined,
      backgroundColor,
      textColor,
      borderColor,
    },
  ];
}

function buildBracketButtons(
  enabled: boolean,
  takeProfitColor: string,
  takeProfitTextColor: string,
  stopLossColor: string,
  stopLossTextColor: string,
): ChartLabelButton[] {
  if (!enabled) return [];
  return [
    {
      type: 'tp',
      icon: 'TP',
      backgroundColor: takeProfitColor,
      iconColor: takeProfitTextColor,
      borderColor: DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
      tooltip: 'Drag to set Take Profit',
    },
    {
      type: 'sl',
      icon: 'SL',
      backgroundColor: stopLossColor,
      iconColor: stopLossTextColor,
      borderColor: DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
      tooltip: 'Drag to set Stop Loss',
    },
  ];
}
