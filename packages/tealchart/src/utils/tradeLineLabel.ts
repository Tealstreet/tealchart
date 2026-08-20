import type {
  ChartLabelButton,
  ChartLabelSegment,
  ChartLineLabel,
  OrderLineRenderData,
  PositionLineRenderData,
} from '../types';

import {
  STOP_LOSS_COLOR,
  TRADE_LINE_SEGMENT_TINT_ALPHA,
  TRADE_LINE_WARM_SEGMENT_TINT_ALPHA,
} from '../constants';
import { tintOver } from './colorAlpha';

/**
 * Puts the line's side color on the leading edge of the assembled label.
 *
 * Positions only - the rail is what tells a position label apart from an order
 * label at a glance, so orders deliberately go without it.
 *
 * Deliberately applied after assembly rather than inside buildBodySegments: a
 * line with no body text contributes no segment, and the rail belongs to
 * whichever segment ends up first.
 */
function withLeadingAccent(segments: ChartLabelSegment[], accentColor: string): ChartLabelSegment[] {
  if (!segments.length || !accentColor) return segments;
  return [{ ...segments[0], accentColor }, ...segments.slice(1)];
}

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
  const takeProfitTextColor = order.brackets?.takeProfitTextColor ?? takeProfitColor;
  const stopLossColor = order.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = order.brackets?.stopLossTextColor ?? stopLossColor;

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
        order.bodyBackgroundColor,
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
  const takeProfitTextColor = position.brackets?.takeProfitTextColor ?? takeProfitColor;
  const stopLossColor = position.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = position.brackets?.stopLossTextColor ?? stopLossColor;

  return {
    offsetPercent: position.lineLength,
    segments: withLeadingAccent([
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
              backgroundColor: tintOver(
                position.bodyBackgroundColor,
                pnlStateColor ?? position.lineColor,
                TRADE_LINE_SEGMENT_TINT_ALPHA,
              ),
              textColor: pnlStateColor ?? position.bodyTextColor,
              // Same outline as the segments beside it: a hairline here broke
              // the pill's top and bottom edge, which read as the neighbouring
              // segments being brighter rather than as PnL being quieter.
              borderColor: position.bodyBorderColor,
            },
          ]
        : []),
    ], position.lineColor),
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
        position.bodyBackgroundColor,
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
  labelBackgroundColor: string,
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
      backgroundColor: tintOver(labelBackgroundColor, takeProfitColor, TRADE_LINE_SEGMENT_TINT_ALPHA),
      accentColor: takeProfitColor,
      iconColor: takeProfitTextColor,
      // Outlined in its own ink rather than a hairline, so the bracket pair
      // reads as two coloured chips instead of one grey block.
      borderColor: takeProfitTextColor,
      tooltip: 'Drag to set Take Profit',
    },
    {
      type: 'sl',
      icon: 'SL',
      backgroundColor: tintOver(labelBackgroundColor, stopLossColor, TRADE_LINE_WARM_SEGMENT_TINT_ALPHA),
      accentColor: stopLossColor,
      iconColor: stopLossTextColor,
      borderColor: stopLossTextColor,
      tooltip: 'Drag to set Stop Loss',
    },
  ];
}
