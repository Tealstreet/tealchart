export interface TradingLineRowHitRectInput {
  chartLabelWidth: number;
  chartLabelX: number;
  interactionKind?: 'mouseHover' | 'touch';
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

const MOUSE_POINTER_TIP_VERTICAL_BIAS = 20;

export function resolveTradingLineRowHitRect({
  chartLabelWidth,
  chartLabelX,
  interactionKind = 'touch',
  labelHeight,
  lineStartX,
  lineY,
  rightLineEndX,
}: TradingLineRowHitRectInput): TradingLineRowHitRect {
  const x = Math.min(lineStartX, chartLabelX);
  const right = Math.max(rightLineEndX, chartLabelX + chartLabelWidth);
  const topBias = interactionKind === 'mouseHover' ? MOUSE_POINTER_TIP_VERTICAL_BIAS : 0;
  return {
    x,
    y: lineY - labelHeight / 2 - topBias,
    width: Math.max(0, right - x),
    height: labelHeight + topBias,
  };
}
