import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../types';

import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  STOP_LOSS_COLOR,
} from '../constants';

export function tradingLineToBracketLines(
  line: OrderLineRenderData | PositionLineRenderData,
  formatPrice: (price: number) => string,
  positiveColor: string,
): PriceLine[] {
  const bracketLines: PriceLine[] = [];
  const brackets = line.brackets;

  if (!brackets) return bracketLines;

  const takeProfitColor = brackets.takeProfitColor ?? positiveColor;
  const takeProfitTextColor = brackets.takeProfitTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  const stopLossColor = brackets.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = brackets.stopLossTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  // Only a host that declared the brackets editable gets draggable lines; the
  // drag ends through the same TP/SL move-end callback as the tag handle.
  const editable = 'bracketsEditable' in line && line.bracketsEditable === true;

  if (brackets.takeProfit !== undefined && brackets.takeProfit > 0) {
    bracketLines.push({
      id: `${line.id}-tp`,
      price: brackets.takeProfit,
      bracketOf: { lineId: line.id, bracketType: 'tp' },
      draggable: editable && !!line.callbacks?.onTPMoveEnd,
      lineStyle: 'dashed',
      color: takeProfitColor,
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
      label: {
        primaryText: formatPrice(brackets.takeProfit),
        backgroundColor: takeProfitColor,
        textColor: takeProfitTextColor,
        filled: true,
      },
    });
  }

  if (brackets.stopLoss !== undefined && brackets.stopLoss > 0) {
    bracketLines.push({
      id: `${line.id}-sl`,
      price: brackets.stopLoss,
      bracketOf: { lineId: line.id, bracketType: 'sl' },
      draggable: editable && !!line.callbacks?.onSLMoveEnd,
      lineStyle: 'dashed',
      color: stopLossColor,
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
      label: {
        primaryText: formatPrice(brackets.stopLoss),
        backgroundColor: stopLossColor,
        textColor: stopLossTextColor,
        filled: true,
      },
    });
  }

  return bracketLines;
}
