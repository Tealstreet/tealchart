import type { Bar, ChartMargins, ComputedPane, RenderOptions, Viewport } from '../types';
import type { CanvasContext } from './CanvasContext';
import type { DrawingCoordinateResolvers } from './TealScriptDrawingCoordinates';
import type { TealScriptDrawingPartition } from './TealScriptDrawingPartition';

import {
  resolveBoxDrawingRect,
  resolveLabelDrawingPosition,
  resolveLineDrawingSegment,
  resolvePolylineDrawingPoints,
} from './TealScriptDrawingCoordinates';

export interface TealScriptDrawingRendererOptions {
  ctx: CanvasContext;
  options: RenderOptions;
  margins: ChartMargins;
  font: string;
  coordinateResolvers: DrawingCoordinateResolvers;
  getTextWidth(ctx: CanvasContext, text: string, font: string): number;
}

interface ResolvedLabelLayout {
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  textX: number;
  textY: number;
  textAlign: CanvasTextAlign;
  lineHeight: number;
}

interface ResolvedWrappedTextLayout {
  lines: string[];
  x: number;
  y: number;
  align: CanvasTextAlign;
  lineHeight: number;
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
    this.renderPolylineDrawings(drawingPartition.polylines, bars, viewport, pane);
    this.renderLineDrawings(drawingPartition.lines, bars, viewport, pane);
    this.renderLabelDrawings(drawingPartition.labels, bars, viewport, pane);
    this.renderTableDrawings(drawingPartition.tables, pane);
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
        const fontSize = this.fontSizeForDrawing(box.textSize);
        const font = this.fontForDrawing(box.textSize, box.textFontFamily, box.textFormatting);
        ctx.font = font;
        if (box.textWrap === 'auto') {
          const textLayout = this.resolveWrappedBoxTextLayout(box, rect, fontSize, font);
          ctx.textAlign = textLayout.align;
          ctx.textBaseline = 'top';
          for (let index = 0; index < textLayout.lines.length; index++) {
            ctx.fillText(textLayout.lines[index]!, textLayout.x, textLayout.y + index * textLayout.lineHeight);
          }
        } else {
          const textPosition = this.resolveBoxTextPosition(box, rect);
          ctx.textAlign = textPosition.align;
          ctx.textBaseline = textPosition.baseline;
          ctx.fillText(box.text, textPosition.x, textPosition.y);
        }
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

  private fontFamilyForDrawing(fontFamily?: string): string {
    if (fontFamily === 'monospace') return 'monospace';
    return this.font;
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

  private resolveWrappedBoxTextLayout(
    box: TealScriptDrawingPartition['boxes'][number],
    rect: { x: number; y: number; width: number; height: number },
    fontSize: number,
    font: string,
  ): ResolvedWrappedTextLayout {
    const padding = 6;
    const lineHeight = Math.ceil(fontSize * 1.25);
    const maxTextWidth = Math.max(1, rect.width - padding * 2);
    const lines = this.wrapDrawingText(box.text, maxTextWidth, font);
    const totalTextHeight = lines.length * lineHeight;
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
    if (valign === 'middle' || valign === 'center') {
      y = rect.y + rect.height / 2 - totalTextHeight / 2;
    } else if (valign === 'bottom') {
      y = rect.y + rect.height - padding - totalTextHeight;
    }

    return { lines, x, y, align, lineHeight };
  }

  private wrapDrawingText(text: string, maxWidth: number, font: string): string[] {
    const wrappedLines: string[] = [];
    for (const paragraph of text.split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        wrappedLines.push('');
        continue;
      }

      let currentLine = '';
      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (currentLine && this.getTextWidth(this.ctx, candidate, font) > maxWidth) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      }
      wrappedLines.push(currentLine);
    }

    return wrappedLines.length > 0 ? wrappedLines : [''];
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

      if (line.style === 'arrow_left' || line.style === 'arrow_both') {
        ctx.setLineDash([]);
        this.drawLineArrowhead(extended.start, extended.end, Math.max(1, line.width), line.color ?? '#2962FF');
      }
      if (line.style === 'arrow_right' || line.style === 'arrow_both') {
        ctx.setLineDash([]);
        this.drawLineArrowhead(extended.end, extended.start, Math.max(1, line.width), line.color ?? '#2962FF');
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawLineArrowhead(
    tip: { x: number; y: number },
    tail: { x: number; y: number },
    width: number,
    color: string,
  ): void {
    const dx = tip.x - tail.x;
    const dy = tip.y - tail.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const unitX = dx / length;
    const unitY = dy / length;
    const size = Math.max(8, width * 4);
    const halfWidth = size * 0.42;
    const baseX = tip.x - unitX * size;
    const baseY = tip.y - unitY * size;
    const perpX = -unitY;
    const perpY = unitX;

    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(baseX + perpX * halfWidth, baseY + perpY * halfWidth);
    ctx.lineTo(baseX - perpX * halfWidth, baseY - perpY * halfWidth);
    ctx.closePath();
    ctx.fill();
  }

  private renderPolylineDrawings(
    polylines: TealScriptDrawingPartition['polylines'],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (polylines.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;

    ctx.save();
    this.clipToPane(pane);

    for (const polyline of polylines) {
      const points = resolvePolylineDrawingPoints(
        polyline,
        bars,
        viewport,
        pane,
        chartWidth,
        this.coordinateResolvers,
      );
      if (points.length < 2) continue;

      ctx.strokeStyle = polyline.lineColor ?? '#2962FF';
      ctx.lineWidth = Math.max(1, polyline.lineWidth);
      if (polyline.lineStyle === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (polyline.lineStyle === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      this.drawPolylinePath(points, polyline.curved);
      if (polyline.closed) {
        ctx.closePath();
        if (polyline.fillColor) {
          ctx.fillStyle = polyline.fillColor;
          ctx.fill();
        }
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawPolylinePath(points: Array<{ x: number; y: number }>, curved: boolean): void {
    const { ctx } = this;
    ctx.moveTo(points[0]!.x, points[0]!.y);
    if (!curved || points.length < 3) {
      for (let index = 1; index < points.length; index++) {
        const point = points[index]!;
        ctx.lineTo(point.x, point.y);
      }
      return;
    }

    for (let index = 1; index < points.length - 1; index++) {
      const control = points[index]!;
      const next = points[index + 1]!;
      if (index === points.length - 2) {
        ctx.quadraticCurveTo(control.x, control.y, next.x, next.y);
      } else {
        ctx.quadraticCurveTo(control.x, control.y, (control.x + next.x) / 2, (control.y + next.y) / 2);
      }
    }
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

      const textLines = this.splitDrawingTextLines(label.text ?? '');
      const paddingX = 8;
      const paddingY = 4;
      const minHeight = 22;
      const fontSize = this.fontSizeForDrawing(label.size);
      const lineHeight = Math.ceil(fontSize * 1.25);
      const shouldExpandBody = !this.isSymbolLabelStyle(label.style) && textLines.length > 1;
      const height = shouldExpandBody ? Math.max(minHeight, textLines.length * lineHeight + paddingY * 2) : minHeight;
      const font = this.fontForDrawing(label.size, label.textFontFamily, label.textFormatting);
      ctx.font = font;
      const width = Math.max(18, this.measureDrawingTextLines(textLines, font) + paddingX * 2);
      const fillColor = label.color ?? '#1f2937';
      const textColor = label.textColor ?? '#FFFFFF';

      const layout = this.resolveLabelLayout(label.style, label.textAlign, position, width, height, lineHeight, margins.left, options.width - margins.right, pane);

      if (label.style !== 'none') {
        ctx.fillStyle = fillColor;
        this.drawLabelBody(label.style, layout, position);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = layout.textAlign;
      this.drawLabelTextLines(textLines, layout);
    }

    ctx.restore();
  }

  private resolveLabelLayout(
    style: string,
    textAlign: string | undefined,
    anchor: { x: number; y: number },
    width: number,
    height: number,
    lineHeight: number,
    minX: number,
    maxX: number,
    pane: ComputedPane,
  ): ResolvedLabelLayout {
    const paddingX = 8;
    const gap = 6;
    const isSymbol = this.isSymbolLabelStyle(style);
    const bodyWidth = isSymbol ? height : width;
    let bodyX = anchor.x;
    let bodyY = anchor.y;

    if (style.includes('right')) {
      bodyX -= bodyWidth;
    } else if (!style.includes('left')) {
      bodyX -= bodyWidth / 2;
    }

    if (style.includes('down') || style.includes('upper') || style === 'arrowdown' || anchor.y <= pane.top) {
      bodyY -= height + gap;
    } else if (style.includes('up') || style.includes('lower') || style === 'arrowup') {
      bodyY += gap;
    } else {
      bodyY -= height / 2;
    }

    bodyX = Math.min(maxX - bodyWidth, Math.max(minX, bodyX));
    bodyY = Math.min(pane.bottom - height, Math.max(pane.top, bodyY));

    if (isSymbol) {
      return {
        bodyX,
        bodyY,
        bodyWidth,
        bodyHeight: height,
        textX: style === 'none' ? anchor.x : bodyX + bodyWidth + paddingX,
        textY: bodyY + height / 2,
        textAlign: 'left',
        lineHeight,
      };
    }

    return {
      bodyX,
      bodyY,
      bodyWidth,
      bodyHeight: height,
      textX: this.resolveLabelTextX(
        textAlign,
        style === 'none' ? anchor.x : bodyX,
        style === 'none' ? 0 : bodyWidth,
        style === 'none' ? 0 : paddingX,
      ),
      textY: style === 'none' ? anchor.y : bodyY + height / 2,
      textAlign: this.canvasTextAlignForDrawing(textAlign),
      lineHeight,
    };
  }

  private splitDrawingTextLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/);
  }

  private measureDrawingTextLines(lines: string[], font: string): number {
    return lines.reduce((maxWidth, line) => Math.max(maxWidth, this.getTextWidth(this.ctx, line, font)), 0);
  }

  private drawLabelTextLines(lines: string[], layout: ResolvedLabelLayout): void {
    const startY = layout.textY - ((lines.length - 1) * layout.lineHeight) / 2;
    for (let index = 0; index < lines.length; index++) {
      this.ctx.fillText(lines[index]!, layout.textX, startY + index * layout.lineHeight);
    }
  }

  private canvasTextAlignForDrawing(textAlign: string | undefined): CanvasTextAlign {
    if (textAlign === 'right') return 'right';
    if (textAlign === 'left') return 'left';
    return 'center';
  }

  private resolveLabelTextX(textAlign: string | undefined, x: number, width: number, padding: number): number {
    if (textAlign === 'right') return x + Math.max(0, width - padding);
    if (textAlign === 'left') return x + padding;
    return x + width / 2;
  }

  private isSymbolLabelStyle(style: string): boolean {
    return [
      'circle',
      'square',
      'diamond',
      'cross',
      'xcross',
      'triangleup',
      'triangledown',
      'flag',
      'arrowup',
      'arrowdown',
    ].includes(style);
  }

  private drawLabelBody(style: string, layout: ResolvedLabelLayout, anchor: { x: number; y: number }): void {
    if (this.isSymbolLabelStyle(style)) {
      this.drawSymbolLabelBody(style, layout);
      return;
    }

    const { ctx } = this;
    const radius = 4;
    ctx.beginPath();
    ctx.roundRect(layout.bodyX, layout.bodyY, layout.bodyWidth, layout.bodyHeight, radius);
    ctx.fill();

    this.drawLabelPointer(style, layout, anchor);
  }

  private drawLabelPointer(style: string, layout: ResolvedLabelLayout, anchor: { x: number; y: number }): void {
    const { ctx } = this;
    const centerX = layout.bodyX + layout.bodyWidth / 2;
    const centerY = layout.bodyY + layout.bodyHeight / 2;
    const pointerSize = 6;
    const pointsUp = style === 'label_up' || style.includes('lower') || style === 'arrowup';
    const pointsDown = style === 'label_down' || style.includes('upper') || style === 'arrowdown';

    ctx.beginPath();
    if (pointsUp) {
      ctx.moveTo(centerX - pointerSize, layout.bodyY);
      ctx.lineTo(centerX + pointerSize, layout.bodyY);
      ctx.lineTo(anchor.x, anchor.y);
    } else if (pointsDown) {
      ctx.moveTo(centerX - pointerSize, layout.bodyY + layout.bodyHeight);
      ctx.lineTo(centerX + pointerSize, layout.bodyY + layout.bodyHeight);
      ctx.lineTo(anchor.x, anchor.y);
    } else if (style.includes('left')) {
      ctx.moveTo(layout.bodyX + layout.bodyWidth, centerY - pointerSize);
      ctx.lineTo(layout.bodyX + layout.bodyWidth, centerY + pointerSize);
      ctx.lineTo(anchor.x, anchor.y);
    } else if (style.includes('right')) {
      ctx.moveTo(layout.bodyX, centerY - pointerSize);
      ctx.lineTo(layout.bodyX, centerY + pointerSize);
      ctx.lineTo(anchor.x, anchor.y);
    } else {
      return;
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawSymbolLabelBody(style: string, layout: ResolvedLabelLayout): void {
    const { ctx } = this;
    const centerX = layout.bodyX + layout.bodyWidth / 2;
    const centerY = layout.bodyY + layout.bodyHeight / 2;
    const size = Math.min(layout.bodyWidth, layout.bodyHeight);
    const radius = size / 2;

    ctx.strokeStyle = `${ctx.fillStyle}`;
    ctx.lineWidth = Math.max(1, size * 0.14);
    ctx.beginPath();
    switch (style) {
      case 'circle':
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'square':
        ctx.rect(layout.bodyX, layout.bodyY, size, size);
        ctx.fill();
        return;
      case 'diamond':
        ctx.moveTo(centerX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, centerY);
        ctx.lineTo(centerX, layout.bodyY + size);
        ctx.lineTo(layout.bodyX, centerY);
        ctx.closePath();
        ctx.fill();
        return;
      case 'triangleup':
      case 'arrowup':
        ctx.moveTo(centerX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, layout.bodyY + size);
        ctx.lineTo(layout.bodyX, layout.bodyY + size);
        ctx.closePath();
        ctx.fill();
        return;
      case 'triangledown':
      case 'arrowdown':
        ctx.moveTo(layout.bodyX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, layout.bodyY);
        ctx.lineTo(centerX, layout.bodyY + size);
        ctx.closePath();
        ctx.fill();
        return;
      case 'flag':
        ctx.rect(layout.bodyX, layout.bodyY, size * 0.75, size * 0.55);
        ctx.fill();
        ctx.beginPath();
        ctx.rect(layout.bodyX, layout.bodyY, Math.max(1, size * 0.12), size);
        ctx.fill();
        return;
      case 'cross':
        ctx.moveTo(centerX, layout.bodyY);
        ctx.lineTo(centerX, layout.bodyY + size);
        ctx.moveTo(layout.bodyX, centerY);
        ctx.lineTo(layout.bodyX + size, centerY);
        ctx.stroke();
        return;
      case 'xcross':
        ctx.moveTo(layout.bodyX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, layout.bodyY + size);
        ctx.moveTo(layout.bodyX + size, layout.bodyY);
        ctx.lineTo(layout.bodyX, layout.bodyY + size);
        ctx.stroke();
        return;
      default:
        ctx.roundRect(layout.bodyX, layout.bodyY, layout.bodyWidth, layout.bodyHeight, 4);
        ctx.fill();
    }
  }

  private renderTableDrawings(tables: TealScriptDrawingPartition['tables'], pane: ComputedPane): void {
    if (tables.length === 0) return;

    const { ctx, options, margins } = this;
    ctx.save();

    for (const table of tables) {
      const metrics = this.measureTable(table, pane);
      const origin = this.resolveTableOrigin(table.position, metrics.width, metrics.height, options.width, margins, pane);

      if (table.bgcolor) {
        ctx.fillStyle = table.bgcolor;
        ctx.fillRect(origin.x, origin.y, metrics.width, metrics.height);
      }

      for (let row = 0; row < table.rows; row++) {
        for (let column = 0; column < table.columns; column++) {
          const mergedCell = this.findMergedTableCell(table, column, row);
          if (mergedCell && (mergedCell.startColumn !== column || mergedCell.startRow !== row)) continue;

          const cell = table.cells.find((candidate) => candidate.column === column && candidate.row === row);
          const x = origin.x + metrics.columnOffsets[column]!;
          const y = origin.y + metrics.rowOffsets[row]!;
          const width = mergedCell
            ? this.sumTableMetricRange(metrics.columnWidths, mergedCell.startColumn, mergedCell.endColumn)
            : metrics.columnWidths[column]!;
          const height = mergedCell
            ? this.sumTableMetricRange(metrics.rowHeights, mergedCell.startRow, mergedCell.endRow)
            : metrics.rowHeights[row]!;

          if (cell?.bgcolor) {
            ctx.fillStyle = cell.bgcolor;
            ctx.fillRect(x, y, width, height);
          }

          if (table.borderWidth > 0) {
            ctx.strokeStyle = table.borderColor ?? '#4B5563';
            ctx.lineWidth = table.borderWidth;
            ctx.setLineDash([]);
            ctx.strokeRect(x, y, width, height);
          }

          if (cell?.text) {
            const textPosition = this.resolveTableCellTextPosition(cell.textHalign, cell.textValign, x, y, width, height);
            ctx.fillStyle = cell.textColor ?? '#FFFFFF';
            ctx.font = this.fontForDrawing(cell.textSize, cell.textFontFamily, cell.textFormatting);
            ctx.textAlign = textPosition.align;
            ctx.textBaseline = textPosition.baseline;
            ctx.fillText(cell.text, textPosition.x, textPosition.y);
          }
        }
      }

      if (table.frameWidth > 0) {
        ctx.strokeStyle = table.frameColor ?? table.borderColor ?? '#4B5563';
        ctx.lineWidth = table.frameWidth;
        ctx.setLineDash([]);
        ctx.strokeRect(origin.x, origin.y, metrics.width, metrics.height);
      }
    }

    ctx.restore();
  }

  private measureTable(table: TealScriptDrawingPartition['tables'][number], pane: ComputedPane): {
    width: number;
    height: number;
    columnWidths: number[];
    rowHeights: number[];
    columnOffsets: number[];
    rowOffsets: number[];
  } {
    const defaultColumnWidth = 48;
    const defaultRowHeight = 22;
    const drawableWidth = this.options.width - this.margins.left - this.margins.right;
    const columnWidths = Array.from({ length: table.columns }, () => defaultColumnWidth);
    const rowHeights = Array.from({ length: table.rows }, () => defaultRowHeight);
    const explicitColumns = Array.from({ length: table.columns }, () => false);
    const explicitRows = Array.from({ length: table.rows }, () => false);

    for (const cell of table.cells) {
      if (cell.column < 0 || cell.column >= table.columns || cell.row < 0 || cell.row >= table.rows) continue;
      const measuredText = cell.text
        ? this.getTextWidth(
          this.ctx,
          cell.text,
          this.fontForDrawing(cell.textSize, cell.textFontFamily, cell.textFormatting),
        ) + 12
        : defaultColumnWidth;
      const explicitWidth = this.tablePercentDimension(cell.width, drawableWidth);
      const explicitHeight = this.tablePercentDimension(cell.height, pane.height);
      if (explicitWidth !== undefined) {
        columnWidths[cell.column] = explicitColumns[cell.column]
          ? Math.max(columnWidths[cell.column]!, explicitWidth)
          : explicitWidth;
        explicitColumns[cell.column] = true;
      } else if (!explicitColumns[cell.column]) {
        columnWidths[cell.column] = Math.max(columnWidths[cell.column]!, measuredText);
      }
      if (explicitHeight !== undefined) {
        rowHeights[cell.row] = explicitRows[cell.row]
          ? Math.max(rowHeights[cell.row]!, explicitHeight)
          : explicitHeight;
        explicitRows[cell.row] = true;
      } else if (!explicitRows[cell.row]) {
        rowHeights[cell.row] = Math.max(rowHeights[cell.row]!, defaultRowHeight);
      }
    }

    const columnOffsets = this.prefixOffsets(columnWidths);
    const rowOffsets = this.prefixOffsets(rowHeights);
    return {
      width: columnWidths.reduce((sum, width) => sum + width, 0),
      height: rowHeights.reduce((sum, height) => sum + height, 0),
      columnWidths,
      rowHeights,
      columnOffsets,
      rowOffsets,
    };
  }

  private tablePercentDimension(value: number | null | undefined, availableSize: number): number | undefined {
    if (value == null || !Number.isFinite(value)) return undefined;
    return Math.max(0, (value / 100) * Math.max(0, availableSize));
  }

  private prefixOffsets(values: number[]): number[] {
    const offsets: number[] = [];
    let current = 0;
    for (const value of values) {
      offsets.push(current);
      current += value;
    }
    return offsets;
  }

  private findMergedTableCell(
    table: TealScriptDrawingPartition['tables'][number],
    column: number,
    row: number,
  ): NonNullable<TealScriptDrawingPartition['tables'][number]['mergedCells']>[number] | undefined {
    return table.mergedCells?.find((mergedCell) => (
      column >= mergedCell.startColumn
      && column <= mergedCell.endColumn
      && row >= mergedCell.startRow
      && row <= mergedCell.endRow
    ));
  }

  private sumTableMetricRange(values: number[], start: number, end: number): number {
    let total = 0;
    for (let index = start; index <= end; index++) {
      total += values[index] ?? 0;
    }
    return total;
  }

  private resolveTableOrigin(
    position: string,
    width: number,
    height: number,
    canvasWidth: number,
    margins: ChartMargins,
    pane: ComputedPane,
  ): { x: number; y: number } {
    const padding = 8;
    const drawableWidth = canvasWidth - margins.left - margins.right;
    let x = margins.left + padding;
    if (position.endsWith('_center')) {
      x = margins.left + drawableWidth / 2 - width / 2;
    } else if (position.endsWith('_right')) {
      x = canvasWidth - margins.right - width - padding;
    }

    let y = pane.top + padding;
    if (position.startsWith('middle_')) {
      y = pane.top + pane.height / 2 - height / 2;
    } else if (position.startsWith('bottom_')) {
      y = pane.bottom - height - padding;
    }

    return { x, y };
  }

  private resolveTableCellTextPosition(
    halign: string,
    valign: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
    const padding = 6;
    let textX = x + width / 2;
    let align: CanvasTextAlign = 'center';
    if (halign === 'left') {
      textX = x + padding;
      align = 'left';
    } else if (halign === 'right') {
      textX = x + width - padding;
      align = 'right';
    }

    let textY = y + height / 2;
    let baseline: CanvasTextBaseline = 'middle';
    if (valign === 'top') {
      textY = y + padding;
      baseline = 'top';
    } else if (valign === 'bottom') {
      textY = y + height - padding;
      baseline = 'bottom';
    }

    return { x: textX, y: textY, align, baseline };
  }

  private fontForDrawing(size: string, fontFamily?: string, textFormatting?: string): string {
    const styleParts: string[] = [];
    const formatting = (textFormatting ?? 'none').trim().toLowerCase();
    const tokens = new Set(formatting.split(/[\s,]+/).filter(Boolean));
    const isCombined = formatting === 'bolditalic' || formatting === 'italicbold';
    if (tokens.has('italic') || isCombined) styleParts.push('italic');
    if (tokens.has('bold') || isCombined) styleParts.push('bold');
    styleParts.push(`${this.fontSizeForDrawing(size)}px`);
    styleParts.push(this.fontFamilyForDrawing(fontFamily));
    return styleParts.join(' ');
  }
}
