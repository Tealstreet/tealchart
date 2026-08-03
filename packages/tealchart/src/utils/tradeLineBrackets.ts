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

  if (brackets.takeProfit !== undefined && brackets.takeProfit > 0) {
    bracketLines.push({
      id: `${line.id}-tp`,
      price: brackets.takeProfit,
      lineStyle: 'dashed',
      color: takeProfitColor,
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
      label: {
        primaryText: formatPrice(brackets.takeProfit),
        secondaryText: 'TP',
        backgroundColor: takeProfitColor,
        textColor: takeProfitTextColor,
      },
    });
  }

  if (brackets.stopLoss !== undefined && brackets.stopLoss > 0) {
    bracketLines.push({
      id: `${line.id}-sl`,
      price: brackets.stopLoss,
      lineStyle: 'dashed',
      color: stopLossColor,
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
      label: {
        primaryText: formatPrice(brackets.stopLoss),
        secondaryText: 'SL',
        backgroundColor: stopLossColor,
        textColor: stopLossTextColor,
      },
    });
  }

  return bracketLines;
}
