import type { LabelBounds } from '../utils/labelCollision';
import type { CanvasContext } from './CanvasContext';

import { resolveLabelCollisionsWithinBounds } from '../utils/labelCollision';

/** Value tags from a host's native price-axis views, already projected in CSS pixels.
 * Numeric scale ticks are deliberately not part of this contract. */
export interface ExternalAxisDescriptor {
  id: string;
  side: 'left' | 'right';
  left: number;
  top: number;
  width: number;
  height: number;
  font: string;
  fontSize: number;
  /** Native currency/unit header and scale controls retain their reserved bands. */
  visibleTop?: number;
  visibleBottom?: number;
}
export interface ExternalAxisLabel {
  id: string;
  axisId: string;
  textLines: readonly string[];
  textColors?: readonly string[];
  backgroundColor: string;
  color: string;
  valueY: number;
  height: number;
  /** Native ordinary tags sit below trading geometry; last price and crosshair
   * retain their separate foreground presentation priorities. */
  layer?: 'static' | 'last-trade' | 'floating';
  borderColor?: string;
  font?: string;
  fontSize?: number;
  width?: number;
  /** Fixed anchors de-overlap other tags; floating tags bypass collisions. */
  fixed?: boolean;
}
export interface ExternalAxisLabelLayout extends ExternalAxisLabel {
  y: number;
  x: number;
  width: number;
  font: string;
  fontSize: number;
}
export interface ExternalAxisObstacle {
  axisId: string;
  /** The existing OEMS label bound is updated in place so drawing/hit tests agree. */
  bound: LabelBounds;
}

/** Reuses the same collision pass as indicator output and OEMS axis tags. */
export function layoutExternalAxisLabels(
  axes: readonly ExternalAxisDescriptor[],
  labels: readonly ExternalAxisLabel[],
  obstacles: readonly ExternalAxisObstacle[] = [],
): ExternalAxisLabelLayout[] {
  const result: ExternalAxisLabelLayout[] = [];
  for (const axis of axes) {
    if (![axis.left, axis.top, axis.width, axis.height].every(Number.isFinite) || axis.width <= 0 || axis.height <= 0)
      continue;
    const owned = labels.filter(
      (label) =>
        label.axisId === axis.id && Number.isFinite(label.valueY) && label.height > 0 && Number.isFinite(label.height),
    );
    const collision = owned
      .filter((label) => label.layer !== 'floating')
      .map((label) => ({
        id: `external-axis:${axis.id}:${label.id}`,
        originalY: label.valueY,
        adjustedY: label.valueY,
        height: label.height + 2,
        fixed: label.fixed,
        priority: label.fixed ? 10_000 : 0,
        label,
      }));
    const floating = owned
      .filter((label) => label.layer === 'floating')
      .map((label) => ({
        label,
        adjustedY: label.valueY,
      }));
    const blocked = obstacles
      .filter((obstacle) => obstacle.axisId === axis.id)
      .map(({ bound }) => ({
        ...bound,
        // Anonymous bounds use the collision cache's positional fallback.
        // Giving them all an empty ID aliases distinct OEMS tags on cache hits.
        id: bound.id ? `external-obstacle:${axis.id}:${bound.id}` : undefined,
        height: bound.height + 2,
        source: bound,
      }));
    resolveLabelCollisionsWithinBounds(
      [...blocked, ...collision],
      axis.visibleTop ?? axis.top,
      axis.visibleBottom ?? axis.top + axis.height,
    );
    for (const obstacle of blocked) if (!obstacle.source.fixed) obstacle.source.adjustedY = obstacle.adjustedY;
    for (const item of [...collision, ...floating]) {
      const width = item.label.width ?? axis.width;
      result.push({
        ...item.label,
        y: item.adjustedY,
        x: axis.side === 'left' ? axis.left + axis.width - width : axis.left,
        width,
        font: item.label.font ?? axis.font,
        fontSize: item.label.fontSize ?? axis.fontSize,
      });
    }
  }
  return result;
}

export function renderExternalAxisLabels(ctx: CanvasContext, labels: readonly ExternalAxisLabelLayout[]): void {
  ctx.save();
  try {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of labels) {
      ctx.font = label.font;
      ctx.fillStyle = label.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(label.x, label.y - label.height / 2, label.width, label.height, 2);
      ctx.fill();
      if (label.borderColor) {
        ctx.beginPath();
        ctx.strokeStyle = label.borderColor;
        ctx.lineWidth = 1;
        ctx.roundRect(label.x, label.y - label.height / 2, label.width, label.height, 2);
        ctx.stroke();
      }
      ctx.fillStyle = label.color;
      const lineHeight = label.fontSize + 2;
      const firstY = label.y - ((label.textLines.length - 1) * lineHeight) / 2;
      const priceFont =
        label.layer === 'last-trade' ? label.font.replace(/\d+(?:\.\d+)?px/, `${label.fontSize + 2}px`) : label.font;
      label.textLines.forEach((text, index) => {
        ctx.font = index === 0 ? priceFont : label.font;
        if (index === 0 && priceFont !== label.font && ctx.measureText(text).width > label.width - 4)
          ctx.font = label.font;
        ctx.fillStyle = label.textColors?.[index] ?? label.color;
        ctx.fillText(text, label.x + label.width / 2, firstY + index * lineHeight);
      });
    }
  } finally {
    ctx.restore();
  }
}
