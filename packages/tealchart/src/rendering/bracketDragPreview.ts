import type { BracketPnlCalculatorResult, PositionData } from '../types';

import {
  PARTIAL_BRACKET_MARKER_INTERVAL,
  PARTIAL_BRACKET_PERCENTS,
  PARTIAL_BRACKET_ZONE_HALF_WIDTH,
  resolvePartialBracketMarkers,
} from '../interaction/partialBrackets';
import { safeToFixed } from '../utils/safeNumber';

export interface BracketDragPreviewState {
  type: 'tp' | 'sl';
  positionId: string;
  price: number;
  entryPrice: number;
  partialPercent: number;
  partialEnabled: boolean;
  dragStartX: number;
  dragCurrentX: number;
  positionData: PositionData;
  color: string;
  /** Hosted callback result; null suppresses PnL while its current reply is pending. */
  pnlResult?: BracketPnlCalculatorResult | null;
}

export interface BracketDragPreviewOptions {
  chartWidth: number;
  font: string;
  priceToY: (price: number) => number;
  drawPriceAxisLabel?: (ctx: CanvasRenderingContext2D, price: number, y: number, color: string) => void;
}

/** Existing ChartCore bracket preview draw pass; the host supplies projection and its price-axis lane. */
export function drawBracketDragPreview(
  ctx: CanvasRenderingContext2D,
  state: BracketDragPreviewState,
  options: BracketDragPreviewOptions,
): void {
  const chartWidth = options.chartWidth;
  const color = state.color;
  const bracketType = state.type === 'tp' ? 'TP' : 'SL';
  const isPartialMode = state.partialEnabled;

  // Convert prices to Y coordinates
  const bracketY = options.priceToY(state.price);
  const entryY = options.priceToY(state.entryPrice);

  // Compute PnL inline (only when notional > 0, i.e. for positions)
  const pd = state.positionData;
  const hasPnl = state.pnlResult === null ? false : state.pnlResult !== undefined || pd.notional > 0;
  const priceDiff = pd.isLong ? state.price - state.entryPrice : state.entryPrice - state.price;
  const pnl =
    state.pnlResult?.pnl ??
    (hasPnl ? ((priceDiff * pd.notional) / state.entryPrice) * (state.partialPercent / 100) : 0);
  const percentDistance =
    state.pnlResult?.percentDistance ?? ((state.price - state.entryPrice) / state.entryPrice) * 100;

  // Format values
  const pnlText = hasPnl ? (pnl >= 0 ? '+' : '-') + '$' + safeToFixed(Math.abs(pnl), 2) : '';
  const pctSign = percentDistance >= 0 ? '+' : '';
  const percentText = pctSign + safeToFixed(percentDistance, 2) + '%';

  // Build type label
  const typeLabel =
    isPartialMode && state.partialPercent < 100 ? state.partialPercent + '% Partial ' + bracketType : bracketType;

  ctx.save();

  // ========= Zone visualization =========
  const centerX = state.dragStartX;
  // The zone follows the arm being dragged, like the marker ladder above it.
  // A two-sided zone under a one-sided ladder reads as a bug.
  const armEdge =
    state.dragCurrentX < centerX
      ? Math.max(0, centerX - PARTIAL_BRACKET_ZONE_HALF_WIDTH)
      : Math.min(chartWidth, centerX + PARTIAL_BRACKET_ZONE_HALF_WIDTH);
  const leftEdge = Math.min(centerX, armEdge);
  const rightEdge = Math.max(centerX, armEdge);

  const top = Math.min(entryY, bracketY);
  const bottom = Math.max(entryY, bracketY);
  const height = bottom - top;
  const isDraggingUp = bracketY < entryY;

  const bgColor = '#1e222d';
  const borderColor = '#363a45';

  if (isPartialMode && height > 0) {
    // Fill rectangle with low opacity
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(leftEdge, top, rightEdge - leftEdge, height);

    // Dashed rectangle border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(leftEdge, top, rightEdge - leftEdge, height);

    // V-shape diagonal lines from center to corners
    ctx.beginPath();
    if (isDraggingUp) {
      ctx.moveTo(leftEdge, top);
      ctx.lineTo(centerX, bottom);
      ctx.lineTo(rightEdge, top);
    } else {
      ctx.moveTo(leftEdge, bottom);
      ctx.lineTo(centerX, top);
      ctx.lineTo(rightEdge, bottom);
    }
    ctx.stroke();

    // Boundary lines sit under their own markers, on the dragged arm only.
    ctx.globalAlpha = 0.3;
    const boundaryDirection = state.dragCurrentX < centerX ? -1 : 1;
    for (let index = 1; index < PARTIAL_BRACKET_PERCENTS.length; index += 1) {
      const boundaryX = centerX + boundaryDirection * index * PARTIAL_BRACKET_MARKER_INTERVAL;
      ctx.beginPath();
      ctx.moveTo(boundaryX, top);
      ctx.lineTo(boundaryX, bottom);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    ctx.setLineDash([]);

    // Partial % labels
    ctx.font = `10px ${options.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padding = 3;
    const boxHeight = 14;
    const labelBoxY = isDraggingUp ? top - 4 - boxHeight : bottom + 4;
    const labelTextY = labelBoxY + boxHeight / 2;

    // Same ladder native draws: one arm, dimmed rather than overlapping, and
    // shifted as a piece to stay inside the zone. Canvas measures per string
    // while native approximates from one character, so the shared resolver
    // takes a character width - '%' and the digits are close enough at this
    // size, and the box is padded either way.
    const characterWidth = ctx.measureText('0').width;
    const markers = resolvePartialBracketMarkers({
      dragStartX: centerX,
      currentX: state.dragCurrentX,
      zoneLeft: leftEdge,
      zoneRight: rightEdge,
      characterWidth,
      paddingX: padding,
      minGap: 8,
    });

    for (const marker of markers) {
      const boxX = marker.centerX - marker.width / 2;
      const isHighlighted = marker.isActive;

      ctx.globalAlpha = marker.opacity;
      if (isHighlighted) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3 * marker.opacity;
        ctx.fillRect(boxX, labelBoxY, marker.width, boxHeight);
        ctx.globalAlpha = marker.opacity;
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(boxX, labelBoxY, marker.width, boxHeight);
      ctx.strokeStyle = isHighlighted ? color : borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, labelBoxY, marker.width, boxHeight);
      ctx.fillStyle = isHighlighted ? color : '#787b86';
      ctx.fillText(marker.text, marker.centerX, labelTextY);
      ctx.globalAlpha = 1.0;
    }
  }

  // ========= Horizontal dashed line =========
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1.0;
  const roundedBracketY = Math.round(bracketY);
  const lineStartX = !isPartialMode ? state.dragStartX : 0;
  ctx.beginPath();
  ctx.moveTo(lineStartX, roundedBracketY);
  ctx.lineTo(chartWidth, roundedBracketY);
  ctx.stroke();

  options.drawPriceAxisLabel?.(ctx, state.price, roundedBracketY, color);

  // ========= Main label (PnL | type | %) =========
  const labelParts = [pnlText, typeLabel, percentText].filter(Boolean);

  // Position label
  const cornerY = isPartialMode
    ? isDraggingUp
      ? top + 20
      : bottom - 20
    : isDraggingUp
      ? bracketY - 14
      : bracketY + 14;

  let cornerX: number;
  if (isPartialMode) {
    // The ladder was written out a second time here; it comes from the same
    // resolver as the markers now, so the pill cannot point somewhere no
    // marker sits.
    const activeMarker = resolvePartialBracketMarkers({
      dragStartX: centerX,
      currentX: state.dragCurrentX,
      zoneLeft: Math.max(0, centerX - PARTIAL_BRACKET_ZONE_HALF_WIDTH),
      zoneRight: Math.min(chartWidth, centerX + PARTIAL_BRACKET_ZONE_HALF_WIDTH),
      characterWidth: 0,
      paddingX: 0,
      minGap: 0,
    }).find((marker) => marker.isActive);
    cornerX = activeMarker ? activeMarker.centerX : centerX;
  } else {
    cornerX = state.dragStartX;
  }

  ctx.font = `11px ${options.font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.setLineDash([]);

  const sectionPadding = 10;
  const dividerWidth = 1;
  let totalWidth = 0;
  const sectionWidths = labelParts.map((part) => {
    const w = ctx.measureText(part).width + sectionPadding * 2;
    totalWidth += w;
    return w;
  });
  totalWidth += (labelParts.length - 1) * dividerWidth;

  const labelBoxHeight = 20;
  const labelBoxX = cornerX - totalWidth / 2;
  const mainLabelBoxY = cornerY - labelBoxHeight / 2;

  // Label background
  ctx.fillStyle = bgColor;
  ctx.fillRect(labelBoxX, mainLabelBoxY, totalWidth, labelBoxHeight);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(labelBoxX, mainLabelBoxY, totalWidth, labelBoxHeight);

  // Draw each section with dividers
  let xOffset = labelBoxX;
  for (let i = 0; i < labelParts.length; i++) {
    const sectionWidth = sectionWidths[i];

    if (i > 0) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(xOffset, mainLabelBoxY + 3);
      ctx.lineTo(xOffset, mainLabelBoxY + labelBoxHeight - 3);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      xOffset += dividerWidth;
    }

    ctx.fillStyle = color;
    ctx.fillText(labelParts[i], xOffset + sectionWidth / 2, cornerY);
    xOffset += sectionWidth;
  }

  // ========= Vertical line and price offset labels =========
  if (state.entryPrice && state.price && height > 0) {
    const vertLineX = !isPartialMode ? state.dragStartX : rightEdge;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(vertLineX, top);
    ctx.lineTo(vertLineX, bottom);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.setLineDash([]);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `10px ${options.font}`;
    const rightLabelX = vertLineX + 6;

    const priceRange = state.price - state.entryPrice;
    const rightLabels = [
      { percent: 10, yRatio: 0.1 },
      { percent: 25, yRatio: 0.25 },
      { percent: 50, yRatio: 0.5 },
      { percent: 75, yRatio: 0.75 },
      { percent: 100, yRatio: 1.0 },
    ];

    for (const label of rightLabels) {
      let labelYPos = isDraggingUp ? bottom - height * label.yRatio : top + height * label.yRatio;

      if (label.percent === 100) {
        labelYPos += isDraggingUp ? 8 : -8;
      }

      const priceAtLevel = state.entryPrice + priceRange * label.yRatio;
      const percentOffset = ((priceAtLevel - state.entryPrice) / state.entryPrice) * 100;
      const sign = percentOffset >= 0 ? '' : '-';
      const text = sign + safeToFixed(Math.abs(percentOffset), 1) + '%';

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fillText(text, rightLabelX, labelYPos);
    }
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();
}
