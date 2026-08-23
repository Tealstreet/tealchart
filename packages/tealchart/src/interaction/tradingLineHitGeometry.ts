export interface TradingLineRowHitRectInput {
  chartLabelWidth: number;
  chartLabelX: number;
  labelHeight: number;
  lineStartX: number;
  lineY: number;
  rightLineEndX: number;
}

export interface TradingLineRowHitRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function resolveTradingLineRowHitRect({
  chartLabelWidth,
  chartLabelX,
  labelHeight,
  lineStartX,
  lineY,
  rightLineEndX,
}: TradingLineRowHitRectInput): TradingLineRowHitRect {
  const x = Math.min(lineStartX, chartLabelX);
  const right = Math.max(rightLineEndX, chartLabelX + chartLabelWidth);
  return {
    x,
    y: lineY - labelHeight / 2,
    width: Math.max(0, right - x),
    height: labelHeight,
  };
}

