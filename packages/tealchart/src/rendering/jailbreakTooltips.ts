import type { CrossHairTooltip } from '../jailbreak/types';
import type { CanvasContext } from './CanvasContext';

export interface JailbreakTooltipRenderOptions {
  cursorX: number;
  cursorY: number;
  chartWidth: number;
  rightMargin: number;
  font: string;
  backgroundColor?: string;
  textColor?: string;
}

/** Existing Tealchart jailbreak tooltip grouping, style and placement, shared with external hosts. */
export function drawJailbreakTooltipGroups(
  ctx: CanvasContext,
  groups: CrossHairTooltip[][],
  options: JailbreakTooltipRenderOptions,
): void {
  if (groups.length === 0) return;
  const leftGroups: CrossHairTooltip[][] = [];
  const hoverGroups: CrossHairTooltip[][] = [];
  for (const group of groups) {
    const position = group[0]?.position ?? 'left';
    if (position === 'hover') hoverGroups.push(group);
    else leftGroups.push(group); // Both left and right retain the existing TradingView behavior.
  }
  const bgColor = options.backgroundColor || '#131722';
  const textColor = options.textColor || '#888888';
  if (leftGroups.length) drawTooltipGroups(ctx, leftGroups, options, bgColor, textColor, 'left');
  if (hoverGroups.length) drawTooltipGroups(ctx, hoverGroups, options, bgColor, textColor, 'hover');
}

function drawTooltipGroups(
  ctx: CanvasContext,
  groups: CrossHairTooltip[][],
  options: JailbreakTooltipRenderOptions,
  bgColor: string,
  defaultTextColor: string,
  alignment: 'left' | 'hover',
): void {
  const { cursorX, cursorY, chartWidth, rightMargin, font } = options;
  const flat = groups.flat();
  if (flat.length === 0) return;

  const fontSize = 12;
  ctx.font = `${fontSize}px ${font}`;

  // Measure max text width
  let maxTextWidth = 0;
  for (const t of flat) {
    const w = ctx.measureText(t.text).width;
    if (w > maxTextWidth) maxTextWidth = w;
  }

  const textHeight = 15;
  const padding = 5;
  const groupPadding = 0.2;

  // Calculate total height including group separators
  const totalRows = flat.length + (groups.length - 1) * groupPadding * 2;
  const tooltipHeight = textHeight * totalRows + padding;
  const tooltipWidth = maxTextWidth + padding * 2;

  // Position the tooltip
  let rectX: number;
  if (alignment === 'left') {
    rectX = 20;
  } else {
    // hover: position near cursor, flip side if too close to edge
    const fitsRight = cursorX + 15 + tooltipWidth < chartWidth - rightMargin;
    rectX = fitsRight ? cursorX + 15 : cursorX - tooltipWidth - 15;
  }
  const rectY = cursorY - tooltipHeight / 2;

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(rectX, rectY, tooltipWidth, tooltipHeight, 3);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Draw border
  ctx.strokeStyle = defaultTextColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(rectX, rectY, tooltipWidth, tooltipHeight);
  ctx.globalAlpha = 1.0;

  // Draw text rows
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let rowOffset = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    for (const tooltip of group) {
      ctx.fillStyle = tooltip.color || defaultTextColor;
      ctx.fillText(tooltip.text, rectX + padding, rectY + rowOffset * textHeight + padding / 1.2);
      rowOffset++;
    }

    // Draw separator line between groups (not after last)
    if (gi < groups.length - 1) {
      rowOffset += groupPadding;
      ctx.beginPath();
      ctx.strokeStyle = defaultTextColor;
      ctx.globalAlpha = 0.3;
      ctx.moveTo(rectX, rectY + rowOffset * textHeight + padding / 2);
      ctx.lineTo(rectX + tooltipWidth, rectY + rowOffset * textHeight + padding / 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      rowOffset += groupPadding;
    }
  }
}
