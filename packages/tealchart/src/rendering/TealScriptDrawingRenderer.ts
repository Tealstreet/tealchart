import type { Bar, ChartMargins, ComputedPane, RenderOptions, Viewport } from '../types';
import type { CanvasContext } from './CanvasContext';
import type { DrawingCoordinateResolvers } from './TealScriptDrawingCoordinates';
import type { TealScriptDrawingPartition } from './TealScriptDrawingPartition';

import {
  resolveBoxDrawingRect,
  resolveLabelDrawingPosition,
  resolveLineDrawingSegment,
} from './TealScriptDrawingCoordinates';

export interface TealScriptDrawingRendererOptions {
  ctx: CanvasContext;
  options: RenderOptions;
  margins: ChartMargins;
  font: string;
  coordinateResolvers: DrawingCoordinateResolvers;
  getTextWidth(ctx: CanvasContext, text: string, font: string): number;
}

export class TealScriptDrawingRenderer {
  private ctx: CanvasContext;
  private options: RenderOptions;
  private margins: ChartMargins;
  private font: string;
  private coordinateResolvers: DrawingCoordinateResolvers;
  private getTextWidth: (ctx: CanvasContext, text: string, font: string) => number;

  constructor(options: TealScriptDrawingRendererOptions) {
    this.ctx = options.ctx;
    this.options = options.options;
    this.margins = options.margins;
    this.font = options.font;
    this.coordinateResolvers = options.coordinateResolvers;
    this.getTextWidth = options.getTextWidth;
  }

  render(
    drawingPartition: TealScriptDrawingPartition,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    this.renderLineFillDrawings(drawingPartition, bars, viewport, pane);
    this.renderBoxDrawings(drawingPartition.boxes, bars, viewport, pane);
    this.renderLineDrawings(drawingPartition.lines, bars, viewport, pane);
    this.renderLabelDrawings(drawingPartition.labels, bars, viewport, pane);
  }

  private clipToPane(pane: ComputedPane): void {
    const { ctx, options, margins } = this;
    ctx.beginPath();
    ctx.rect(margins.left, pane.top, options.width - margins.left - margins.right, pane.height);
    ctx.clip();
  }

  private renderBoxDrawings(
    boxes: TealScriptDrawingPartition['boxes'],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (boxes.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    this.clipToPane(pane);

    for (const box of boxes) {
      const rect = resolveBoxDrawingRect(
        box,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        this.coordinateResolvers,
      );
      if (!rect) continue;

      if (box.bgcolor) {
        ctx.fillStyle = box.bgcolor;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      ctx.strokeStyle = box.borderColor ?? '#2962FF';
      ctx.lineWidth = Math.max(1, box.borderWidth);
      if (box.borderStyle === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (box.borderStyle === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      if (box.text) {
        ctx.setLineDash([]);
        ctx.fillStyle = box.textColor ?? '#FFFFFF';
        ctx.font = `${this.fontSizeForDrawing(box.textSize)}px ${this.font}`;
        const textPosition = this.resolveBoxTextPosition(box, rect);
        ctx.textAlign = textPosition.align;
        ctx.textBaseline = textPosition.baseline;
        ctx.fillText(box.text, textPosition.x, textPosition.y);
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private fontSizeForDrawing(size: string): number {
    switch (size) {
      case 'tiny':
        return 9;
      case 'small':
        return 10;
      case 'large':
        return 14;
      case 'huge':
        return 18;
      default:
        return 12;
    }
  }

  private resolveBoxTextPosition(
    box: TealScriptDrawingPartition['boxes'][number],
    rect: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
    const padding = 6;
    const halign = box.textHalign ?? 'left';
    const valign = box.textValign ?? 'top';

    let x = rect.x + padding;
    let align: CanvasTextAlign = 'left';
    if (halign === 'center') {
      x = rect.x + rect.width / 2;
      align = 'center';
    } else if (halign === 'right') {
      x = rect.x + rect.width - padding;
      align = 'right';
    }

    let y = rect.y + padding;
    let baseline: CanvasTextBaseline = 'top';
    if (valign === 'middle' || valign === 'center') {
      y = rect.y + rect.height / 2;
      baseline = 'middle';
    } else if (valign === 'bottom') {
      y = rect.y + rect.height - padding;
      baseline = 'bottom';
    }

    return { x, y, align, baseline };
  }

  private renderLineFillDrawings(
    drawingPartition: TealScriptDrawingPartition,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    const { linefills, linesById } = drawingPartition;
    if (linefills.length === 0) return;

    if (linesById.size === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    this.clipToPane(pane);

    for (const linefill of linefills) {
      const line1 = linesById.get(linefill.line1);
      const line2 = linesById.get(linefill.line2);
      if (!line1 || !line2) continue;

      const line1Segment = resolveLineDrawingSegment(
        line1,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        this.coordinateResolvers,
      );
      const line2Segment = resolveLineDrawingSegment(
        line2,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        this.coordinateResolvers,
      );
      if (!line1Segment || !line2Segment) continue;

      ctx.fillStyle = linefill.color ?? 'rgba(41, 98, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(line1Segment.start.x, line1Segment.start.y);
      ctx.lineTo(line1Segment.end.x, line1Segment.end.y);
      ctx.lineTo(line2Segment.end.x, line2Segment.end.y);
      ctx.lineTo(line2Segment.start.x, line2Segment.start.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private renderLineDrawings(
    lines: TealScriptDrawingPartition['lines'],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (lines.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    this.clipToPane(pane);

    for (const line of lines) {
      const extended = resolveLineDrawingSegment(
        line,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        this.coordinateResolvers,
      );
      if (!extended) continue;

      ctx.strokeStyle = line.color ?? '#2962FF';
      ctx.lineWidth = Math.max(1, line.width);
      if (line.style === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (line.style === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(extended.start.x, extended.start.y);
      ctx.lineTo(extended.end.x, extended.end.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderLabelDrawings(
    labels: TealScriptDrawingPartition['labels'],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (labels.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;

    ctx.save();
    ctx.textBaseline = 'middle';

    for (const label of labels) {
      const position = resolveLabelDrawingPosition(
        label,
        bars,
        viewport,
        pane,
        chartWidth,
        this.coordinateResolvers,
      );
      if (!position) continue;

      const text = label.text ?? '';
      const paddingX = 8;
      const height = 22;
      const font = `${this.fontSizeForDrawing(label.size)}px ${this.font}`;
      ctx.font = font;
      const width = Math.max(18, this.getTextWidth(ctx, text, font) + paddingX * 2);
      const radius = 4;
      const fillColor = label.color ?? '#1f2937';
      const textColor = label.textColor ?? '#FFFFFF';

      let x = position.x;
      let y = position.y;

      if (label.style.includes('right')) {
        x -= width;
      } else if (!label.style.includes('left')) {
        x -= width / 2;
      }

      if (label.style.includes('down') || label.yloc === 'abovebar') {
        y -= height + 6;
      } else if (label.style.includes('up') || label.yloc === 'belowbar') {
        y += 6;
      } else {
        y -= height / 2;
      }

      const minX = margins.left;
      const maxX = options.width - margins.right - width;
      const minY = pane.top;
      const maxY = pane.bottom - height;
      x = Math.min(maxX, Math.max(minX, x));
      y = Math.min(maxY, Math.max(minY, y));

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText(text, x + paddingX, y + height / 2);
    }

    ctx.restore();
  }
}
