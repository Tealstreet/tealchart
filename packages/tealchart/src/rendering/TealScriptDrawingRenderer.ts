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
import { drawingFont, fontSizeForDrawing } from './TealScriptDrawingText';

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

interface DrawingTooltipTarget {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TealScriptDrawingRenderer {
  private tooltipTargets: DrawingTooltipTarget[] = [];
  private tooltipPane: ComputedPane | null = null;
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

  render(drawingPartition: TealScriptDrawingPartition, bars: Bar[], viewport: Viewport, pane: ComputedPane): void {
    this.tooltipTargets = [];
    this.tooltipPane = pane;
    paintTealScriptDrawings(
      {
        ctx: this.ctx,
        options: this.options,
        margins: this.margins,
        font: this.font,
        coordinateResolvers: this.coordinateResolvers,
        getTextWidth: this.getTextWidth,
      },
      drawingPartition,
      bars,
      viewport,
      pane,
      (text, rect) => this.addTooltip(text, rect),
    );
  }

  /** Paint hover text on the overlay context, using bounds from the latest draw. */
  renderTooltip(ctx: CanvasContext, cursorX: number, cursorY: number): boolean {
    const target = this.tooltipTargets.findLast(
      (candidate) =>
        cursorX >= candidate.x &&
        cursorX <= candidate.x + candidate.width &&
        cursorY >= candidate.y &&
        cursorY <= candidate.y + candidate.height,
    );
    if (!target) return false;

    const padding = 8;
    const lineHeight = 15;
    const lines = target.text.replace(/\r\n?/g, '\n').split('\n');
    const font = `12px ${this.font}`;
    ctx.save();
    ctx.font = font;
    const width = Math.max(...lines.map((line) => this.getTextWidth(ctx, line, font))) + padding * 2;
    const height = lines.length * lineHeight + padding * 2;
    const minX = this.margins.left;
    const maxX = this.options.width - this.margins.right;
    const minY = this.margins.top;
    const maxY = this.options.height - this.margins.bottom;
    const preferredX = cursorX + 12 + width <= maxX ? cursorX + 12 : cursorX - width - 12;
    const x = Math.max(minX, Math.min(preferredX, maxX - width));
    const y = Math.max(minY, Math.min(cursorY + 12, maxY - height));
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 3);
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fill();
    ctx.strokeStyle = this.options.textColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let index = 0; index < lines.length; index++) {
      ctx.fillText(lines[index]!, x + padding, y + padding + index * lineHeight);
    }
    ctx.restore();
    return true;
  }

  private addTooltip(text: string | undefined, rect: { x: number; y: number; width: number; height: number }): void {
    if (!text || !this.tooltipPane) return;
    const x = Math.max(this.margins.left, rect.x);
    const y = Math.max(this.tooltipPane.top, rect.y);
    const right = Math.min(this.options.width - this.margins.right, rect.x + rect.width);
    const bottom = Math.min(this.tooltipPane.bottom, rect.y + rect.height);
    if (right > x && bottom > y) {
      this.tooltipTargets.push({ text, x, y, width: right - x, height: bottom - y });
    }
  }
}

export type TealScriptDrawingPainterOptions = Omit<TealScriptDrawingRendererOptions, 'options'> & {
  options: Pick<RenderOptions, 'width'>;
};

/** Shared immediate-mode painter. Geometry and layout run on web and the native UI thread. */
export function paintTealScriptDrawings(
  configuration: TealScriptDrawingPainterOptions,
  drawingPartition: TealScriptDrawingPartition,
  bars: readonly Bar[],
  viewport: Viewport,
  pane: ComputedPane,
  recordTooltip?: (text: string | undefined, rect: { x: number; y: number; width: number; height: number }) => void,
): void {
  'worklet';
  const { ctx, options, margins, font, coordinateResolvers, getTextWidth } = configuration;
  function clipToPane(pane: ComputedPane): void {
    ctx.beginPath();
    ctx.rect(margins.left, pane.top, options.width - margins.left - margins.right, pane.height);
    ctx.clip();
  }

  function renderBoxDrawings(
    boxes: TealScriptDrawingPartition['boxes'],
    bars: readonly Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (boxes.length === 0) return;

    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    clipToPane(pane);

    for (const box of boxes) {
      const rect = resolveBoxDrawingRect(box, bars, viewport, pane, chartWidth, minX, maxX, coordinateResolvers);
      if (!rect) continue;

      if (box.bgcolor) {
        ctx.fillStyle = box.bgcolor;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      if (box.borderColor && box.borderWidth !== 0) {
        ctx.strokeStyle = box.borderColor;
        ctx.lineWidth = Math.max(1, box.borderWidth);
        if (box.borderStyle === 'dashed') {
          ctx.setLineDash([6, 4]);
        } else if (box.borderStyle === 'dotted') {
          ctx.setLineDash([2, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }

      if (box.text) {
        ctx.setLineDash([]);
        const fontSize = fontSizeForDrawing(box.textSize);
        const font = fontForDrawing(box.textSize, box.textFontFamily, box.textFormatting);
        ctx.font = font;
        if (box.textColor && box.textWrap === 'auto') {
          ctx.fillStyle = box.textColor;
          const textLayout = resolveWrappedBoxTextLayout(box, rect, fontSize, font);
          ctx.textAlign = textLayout.align;
          ctx.textBaseline = 'top';
          for (let index = 0; index < textLayout.lines.length; index++) {
            ctx.fillText(textLayout.lines[index]!, textLayout.x, textLayout.y + index * textLayout.lineHeight);
          }
        } else if (box.textColor) {
          ctx.fillStyle = box.textColor;
          const textLines = splitDrawingTextLines(box.text);
          const lineHeight = Math.ceil(fontSize * 1.25);
          const textPosition = resolveBoxTextPosition(box, rect);
          ctx.textAlign = textPosition.align;
          ctx.textBaseline = textPosition.baseline;
          drawAlignedTextLines(textLines, textPosition, lineHeight);
        }
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function resolveBoxTextPosition(
    box: TealScriptDrawingPartition['boxes'][number],
    rect: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
    const padding = 6;
    const halign = box.textHalign ?? 'center';
    const valign = box.textValign ?? 'center';

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

  function resolveWrappedBoxTextLayout(
    box: TealScriptDrawingPartition['boxes'][number],
    rect: { x: number; y: number; width: number; height: number },
    fontSize: number,
    font: string,
  ): ResolvedWrappedTextLayout {
    const padding = 6;
    const lineHeight = Math.ceil(fontSize * 1.25);
    const maxTextWidth = Math.max(1, rect.width - padding * 2);
    const lines = wrapDrawingText(box.text, maxTextWidth, font);
    const totalTextHeight = lines.length * lineHeight;
    const halign = box.textHalign ?? 'center';
    const valign = box.textValign ?? 'center';

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

  function wrapDrawingText(text: string, maxWidth: number, font: string): string[] {
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
        if (currentLine && getTextWidth(ctx, candidate, font) > maxWidth) {
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

  function renderLineFillDrawings(
    drawingPartition: TealScriptDrawingPartition,
    bars: readonly Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    const { linefills, linesById } = drawingPartition;
    if (linefills.length === 0) return;

    if (linesById.size === 0) return;

    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    clipToPane(pane);

    for (const linefill of linefills) {
      if (!linefill.color) continue;
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
        coordinateResolvers,
      );
      const line2Segment = resolveLineDrawingSegment(
        line2,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        coordinateResolvers,
      );
      if (!line1Segment || !line2Segment) continue;

      ctx.fillStyle = linefill.color;
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

  function renderLineDrawings(
    lines: TealScriptDrawingPartition['lines'],
    bars: readonly Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (lines.length === 0) return;

    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    clipToPane(pane);

    for (const line of lines) {
      const extended = resolveLineDrawingSegment(
        line,
        bars,
        viewport,
        pane,
        chartWidth,
        minX,
        maxX,
        coordinateResolvers,
      );
      if (!extended) continue;
      if (!line.color) continue;

      ctx.strokeStyle = line.color;
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
        drawLineArrowhead(extended.start, extended.end, Math.max(1, line.width), line.color);
      }
      if (line.style === 'arrow_right' || line.style === 'arrow_both') {
        ctx.setLineDash([]);
        drawLineArrowhead(extended.end, extended.start, Math.max(1, line.width), line.color);
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawLineArrowhead(
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

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(baseX + perpX * halfWidth, baseY + perpY * halfWidth);
    ctx.lineTo(baseX - perpX * halfWidth, baseY - perpY * halfWidth);
    ctx.closePath();
    ctx.fill();
  }

  function renderPolylineDrawings(
    polylines: TealScriptDrawingPartition['polylines'],
    bars: readonly Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (polylines.length === 0) return;

    const chartWidth = options.width - margins.left;

    ctx.save();
    clipToPane(pane);

    for (const polyline of polylines) {
      const points = resolvePolylineDrawingPoints(polyline, bars, viewport, pane, chartWidth, coordinateResolvers);
      if (points.length < 2) continue;

      ctx.lineWidth = Math.max(1, polyline.lineWidth);
      if (polyline.lineStyle === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (polyline.lineStyle === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      drawPolylinePath(points, polyline.curved, polyline.closed);
      if (polyline.closed) {
        ctx.closePath();
        if (polyline.fillColor) {
          ctx.fillStyle = polyline.fillColor;
          ctx.fill();
        }
      }
      if (polyline.lineColor) {
        ctx.strokeStyle = polyline.lineColor;
        ctx.stroke();

        if (polyline.lineStyle === 'arrow_left' || polyline.lineStyle === 'arrow_both') {
          ctx.setLineDash([]);
          drawLineArrowhead(points[0]!, points[1]!, Math.max(1, polyline.lineWidth), polyline.lineColor);
        }
        if (polyline.lineStyle === 'arrow_right' || polyline.lineStyle === 'arrow_both') {
          ctx.setLineDash([]);
          drawLineArrowhead(
            points[points.length - 1]!,
            points[points.length - 2]!,
            Math.max(1, polyline.lineWidth),
            polyline.lineColor,
          );
        }
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPolylinePath(points: Array<{ x: number; y: number }>, curved: boolean, closed: boolean): void {
    ctx.moveTo(points[0]!.x, points[0]!.y);
    if (!curved || points.length < 3) {
      for (let index = 1; index < points.length; index++) {
        const point = points[index]!;
        ctx.lineTo(point.x, point.y);
      }
      return;
    }

    // Interpolating Catmull-Rom segments satisfy Pine's documented point passage.
    // The exact TradingView spline kernel is still trace-undetermined.
    const segmentCount = closed ? points.length : points.length - 1;
    const pointAt = (index: number) =>
      closed
        ? points[(index + points.length) % points.length]!
        : points[Math.max(0, Math.min(index, points.length - 1))]!;
    for (let index = 0; index < segmentCount; index++) {
      const previous = pointAt(index - 1);
      const start = pointAt(index);
      const end = pointAt(index + 1);
      const next = pointAt(index + 2);
      ctx.bezierCurveTo(
        start.x + (end.x - previous.x) / 6,
        start.y + (end.y - previous.y) / 6,
        end.x - (next.x - start.x) / 6,
        end.y - (next.y - start.y) / 6,
        end.x,
        end.y,
      );
    }
  }

  function renderLabelDrawings(
    labels: TealScriptDrawingPartition['labels'],
    bars: readonly Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (labels.length === 0) return;

    const chartWidth = options.width - margins.left;

    ctx.save();
    ctx.textBaseline = 'middle';

    for (const label of labels) {
      const position = resolveLabelDrawingPosition(label, bars, viewport, pane, chartWidth, coordinateResolvers);
      if (!position) continue;

      const textLines = splitDrawingTextLines(label.text ?? '');
      const paddingX = 8;
      const paddingY = 4;
      const minHeight = 22;
      const fontSize = fontSizeForDrawing(label.size, 'label');
      const lineHeight = Math.ceil(fontSize * 1.25);
      const shouldExpandBody = !isSymbolLabelStyle(label.style) && textLines.length > 1;
      const height = shouldExpandBody ? Math.max(minHeight, textLines.length * lineHeight + paddingY * 2) : minHeight;
      const font = fontForDrawing(label.size, label.textFontFamily, label.textFormatting, 'label');
      ctx.font = font;
      const textWidth = measureDrawingTextLines(textLines, font);
      const width = Math.max(18, textWidth + paddingX * 2);
      const layout = resolveLabelLayout(
        label.style,
        label.textAlign,
        position,
        width,
        height,
        lineHeight,
        margins.left,
        options.width - margins.right,
        pane,
      );

      if (label.style !== 'none' && label.style !== 'text_outline' && label.color) {
        ctx.fillStyle = label.color;
        drawLabelBody(label.style, layout, position);
        addTooltip(label.tooltip, {
          x: layout.bodyX,
          y: layout.bodyY,
          width: layout.bodyWidth,
          height: layout.bodyHeight,
        });
      }

      if (label.textColor) {
        ctx.fillStyle = label.textColor;
        ctx.textAlign = layout.textAlign;
        drawLabelTextLines(textLines, layout, label.style === 'text_outline' ? label.color : null);
        const textX =
          layout.textX - (layout.textAlign === 'center' ? textWidth / 2 : layout.textAlign === 'right' ? textWidth : 0);
        addTooltip(label.tooltip, {
          x: textX,
          y: layout.textY - (textLines.length * lineHeight) / 2,
          width: textWidth,
          height: textLines.length * lineHeight,
        });
      }
    }

    ctx.restore();
  }

  function resolveLabelLayout(
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
    const isSymbol = isSymbolLabelStyle(style);
    const isTextOnly = style === 'none' || style === 'text_outline';
    const bodyWidth = isSymbol ? height : width;
    let bodyX = anchor.x;
    let bodyY = anchor.y;

    if (style === 'label_left') {
      bodyX += gap;
    } else if (style === 'label_right') {
      bodyX -= bodyWidth + gap;
    } else if (style.includes('right')) {
      bodyX -= bodyWidth;
    } else if (!style.includes('left')) {
      bodyX -= bodyWidth / 2;
    }

    if (style.includes('down') || style.includes('lower') || style === 'arrowdown' || anchor.y <= pane.top) {
      bodyY -= height + gap;
    } else if (style.includes('up') || style.includes('upper') || style === 'arrowup') {
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
        textX: isTextOnly ? anchor.x : bodyX + bodyWidth + paddingX,
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
      textX: resolveLabelTextX(
        textAlign,
        isTextOnly ? anchor.x : bodyX,
        isTextOnly ? 0 : bodyWidth,
        isTextOnly ? 0 : paddingX,
      ),
      textY: isTextOnly ? anchor.y : bodyY + height / 2,
      textAlign: canvasTextAlignForDrawing(textAlign),
      lineHeight,
    };
  }

  function splitDrawingTextLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/);
  }

  function measureDrawingTextLines(lines: string[], font: string): number {
    return lines.reduce((maxWidth, line) => Math.max(maxWidth, getTextWidth(ctx, line, font)), 0);
  }

  function drawLabelTextLines(lines: string[], layout: ResolvedLabelLayout, outlineColor: string | null): void {
    const startY = layout.textY - ((lines.length - 1) * layout.lineHeight) / 2;
    for (let index = 0; index < lines.length; index++) {
      const text = lines[index]!;
      const y = startY + index * layout.lineHeight;
      if (outlineColor) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        if (ctx.strokeText) {
          ctx.strokeText(text, layout.textX, y);
        } else {
          const textColor = ctx.fillStyle;
          ctx.fillStyle = outlineColor;
          for (const [dx, dy] of [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
          ]) {
            ctx.fillText(text, layout.textX + dx!, y + dy!);
          }
          ctx.fillStyle = textColor;
        }
      }
      ctx.fillText(text, layout.textX, y);
    }
  }

  function canvasTextAlignForDrawing(textAlign: string | undefined): CanvasTextAlign {
    if (textAlign === 'right') return 'right';
    if (textAlign === 'left') return 'left';
    return 'center';
  }

  function resolveLabelTextX(textAlign: string | undefined, x: number, width: number, padding: number): number {
    if (textAlign === 'right') return x + Math.max(0, width - padding);
    if (textAlign === 'left') return x + padding;
    return x + width / 2;
  }

  function isSymbolLabelStyle(style: string): boolean {
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

  function drawLabelBody(style: string, layout: ResolvedLabelLayout, anchor: { x: number; y: number }): void {
    if (isSymbolLabelStyle(style)) {
      drawSymbolLabelBody(style, layout);
      return;
    }

    const radius = 4;
    ctx.beginPath();
    ctx.roundRect(layout.bodyX, layout.bodyY, layout.bodyWidth, layout.bodyHeight, radius);
    ctx.fill();

    drawLabelPointer(style, layout, anchor);
  }

  function drawLabelPointer(style: string, layout: ResolvedLabelLayout, anchor: { x: number; y: number }): void {
    const centerX = layout.bodyX + layout.bodyWidth / 2;
    const centerY = layout.bodyY + layout.bodyHeight / 2;
    const pointerSize = 6;
    const pointsUp = style === 'label_up' || style.includes('upper') || style === 'arrowup';
    const pointsDown = style === 'label_down' || style.includes('lower') || style === 'arrowdown';

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
      ctx.moveTo(layout.bodyX, centerY - pointerSize);
      ctx.lineTo(layout.bodyX, centerY + pointerSize);
      ctx.lineTo(anchor.x, anchor.y);
    } else if (style.includes('right')) {
      ctx.moveTo(layout.bodyX + layout.bodyWidth, centerY - pointerSize);
      ctx.lineTo(layout.bodyX + layout.bodyWidth, centerY + pointerSize);
      ctx.lineTo(anchor.x, anchor.y);
    } else {
      return;
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawSymbolLabelBody(style: string, layout: ResolvedLabelLayout): void {
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
        ctx.moveTo(centerX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, layout.bodyY + size);
        ctx.lineTo(layout.bodyX, layout.bodyY + size);
        ctx.closePath();
        ctx.fill();
        return;
      case 'triangledown':
        ctx.moveTo(layout.bodyX, layout.bodyY);
        ctx.lineTo(layout.bodyX + size, layout.bodyY);
        ctx.lineTo(centerX, layout.bodyY + size);
        ctx.closePath();
        ctx.fill();
        return;
      case 'arrowup':
      case 'arrowdown': {
        // A head plus shaft, rather than the triangle glyph used by triangle*.
        const vertices = [
          [0.5, 0],
          [1, 0.5],
          [0.67, 0.5],
          [0.67, 1],
          [0.33, 1],
          [0.33, 0.5],
          [0, 0.5],
        ];
        for (let index = 0; index < vertices.length; index++) {
          const [vx, vy] = vertices[index]!;
          const x = layout.bodyX + vx! * size;
          const y = layout.bodyY + (style === 'arrowdown' ? 1 - vy! : vy!) * size;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        return;
      }
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

  function renderTableDrawings(tables: TealScriptDrawingPartition['tables'], pane: ComputedPane): void {
    if (tables.length === 0) return;

    ctx.save();

    const latestSites = new Map<string, (typeof tables)[number]>();
    for (const table of tables) {
      if (table.creationSite) latestSites.set(JSON.stringify([table.scriptId, table.creationSite]), table);
    }
    const latestLocations = new Map<string, (typeof tables)[number]>();
    for (const table of tables) {
      if (table.creationSite && latestSites.get(JSON.stringify([table.scriptId, table.creationSite])) !== table)
        continue;
      latestLocations.set(JSON.stringify([table.scriptId, table.position]), table);
    }
    for (const table of latestLocations.values()) {
      if (table.cells.length === 0) continue;

      const metrics = measureTable(table, pane);
      const origin = resolveTableOrigin(table.position, metrics.width, metrics.height, options.width, margins, pane);

      if (table.bgcolor) {
        ctx.fillStyle = table.bgcolor;
        ctx.fillRect(origin.x, origin.y, metrics.width, metrics.height);
      }

      for (let row = 0; row < table.rows; row++) {
        for (let column = 0; column < table.columns; column++) {
          const mergedCell = findMergedTableCell(table, column, row);
          if (mergedCell && (mergedCell.startColumn !== column || mergedCell.startRow !== row)) continue;

          const cell = table.cells.find((candidate) => candidate.column === column && candidate.row === row);
          const x = origin.x + metrics.columnOffsets[column]!;
          const y = origin.y + metrics.rowOffsets[row]!;
          const width = mergedCell
            ? sumTableMetricRange(metrics.columnWidths, mergedCell.startColumn, mergedCell.endColumn)
            : metrics.columnWidths[column]!;
          const height = mergedCell
            ? sumTableMetricRange(metrics.rowHeights, mergedCell.startRow, mergedCell.endRow)
            : metrics.rowHeights[row]!;

          addTooltip(cell?.tooltip, { x, y, width, height });
          if (cell?.bgcolor) {
            ctx.fillStyle = cell.bgcolor;
            ctx.fillRect(x, y, width, height);
          }

          if (table.borderWidth > 0 && table.borderColor) {
            ctx.strokeStyle = table.borderColor;
            ctx.lineWidth = table.borderWidth;
            ctx.setLineDash([]);
            ctx.strokeRect(x, y, width, height);
          }

          if (cell?.text) {
            const textLines = splitDrawingTextLines(cell.text);
            const fontSize = fontSizeForDrawing(cell.textSize);
            const lineHeight = Math.ceil(fontSize * 1.25);
            const textPosition = resolveTableCellTextPosition(cell.textHalign, cell.textValign, x, y, width, height);
            ctx.fillStyle = cell.textColor ?? '#FFFFFF';
            ctx.font = fontForDrawing(cell.textSize, cell.textFontFamily, cell.textFormatting);
            ctx.textAlign = textPosition.align;
            ctx.textBaseline = textPosition.baseline;
            drawAlignedTextLines(textLines, textPosition, lineHeight);
          }
        }
      }

      if (table.frameWidth > 0 && table.frameColor) {
        ctx.strokeStyle = table.frameColor;
        ctx.lineWidth = table.frameWidth;
        ctx.setLineDash([]);
        ctx.strokeRect(origin.x, origin.y, metrics.width, metrics.height);
      }
    }

    ctx.restore();
  }

  function measureTable(
    table: TealScriptDrawingPartition['tables'][number],
    pane: ComputedPane,
  ): {
    width: number;
    height: number;
    columnWidths: number[];
    rowHeights: number[];
    columnOffsets: number[];
    rowOffsets: number[];
  } {
    const defaultColumnWidth = 48;
    const defaultRowHeight = 22;
    const drawableWidth = options.width - margins.left - margins.right;
    const columnWidths = Array.from({ length: table.columns }, () => defaultColumnWidth);
    const rowHeights = Array.from({ length: table.rows }, () => defaultRowHeight);
    const explicitColumns = Array.from({ length: table.columns }, () => false);
    const explicitRows = Array.from({ length: table.rows }, () => false);

    for (const cell of table.cells) {
      if (cell.column < 0 || cell.column >= table.columns || cell.row < 0 || cell.row >= table.rows) continue;
      if (findMergedTableCell(table, cell.column, cell.row)) continue;
      const textLines = cell.text ? splitDrawingTextLines(cell.text) : [];
      const fontSize = fontSizeForDrawing(cell.textSize);
      const lineHeight = Math.ceil(fontSize * 1.25);
      const measuredText =
        textLines.length > 0
          ? measureDrawingTextLines(
              textLines,
              fontForDrawing(cell.textSize, cell.textFontFamily, cell.textFormatting),
            ) + 12
          : defaultColumnWidth;
      const measuredHeight =
        textLines.length > 1 ? Math.max(defaultRowHeight, textLines.length * lineHeight + 12) : defaultRowHeight;
      const explicitWidth = tablePercentDimension(cell.width, drawableWidth);
      const explicitHeight = tablePercentDimension(cell.height, pane.height);
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
        rowHeights[cell.row] = Math.max(rowHeights[cell.row]!, measuredHeight);
      }
    }

    const columnOffsets = prefixOffsets(columnWidths);
    const rowOffsets = prefixOffsets(rowHeights);
    return {
      width: columnWidths.reduce((sum, width) => sum + width, 0),
      height: rowHeights.reduce((sum, height) => sum + height, 0),
      columnWidths,
      rowHeights,
      columnOffsets,
      rowOffsets,
    };
  }

  function tablePercentDimension(value: number | null | undefined, availableSize: number): number | undefined {
    if (value == null || value === 0 || !Number.isFinite(value)) return undefined;
    return Math.max(0, (value / 100) * Math.max(0, availableSize));
  }

  function prefixOffsets(values: number[]): number[] {
    const offsets: number[] = [];
    let current = 0;
    for (const value of values) {
      offsets.push(current);
      current += value;
    }
    return offsets;
  }

  function findMergedTableCell(
    table: TealScriptDrawingPartition['tables'][number],
    column: number,
    row: number,
  ): NonNullable<TealScriptDrawingPartition['tables'][number]['mergedCells']>[number] | undefined {
    return table.mergedCells?.find(
      (mergedCell) =>
        column >= mergedCell.startColumn &&
        column <= mergedCell.endColumn &&
        row >= mergedCell.startRow &&
        row <= mergedCell.endRow,
    );
  }

  function sumTableMetricRange(values: number[], start: number, end: number): number {
    let total = 0;
    for (let index = start; index <= end; index++) {
      total += values[index] ?? 0;
    }
    return total;
  }

  function resolveTableOrigin(
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

  function resolveTableCellTextPosition(
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

  function drawAlignedTextLines(
    lines: string[],
    position: { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline },
    lineHeight: number,
  ): void {
    if (position.baseline === 'bottom') {
      for (let index = 0; index < lines.length; index++) {
        ctx.fillText(lines[index]!, position.x, position.y - (lines.length - 1 - index) * lineHeight);
      }
      return;
    }

    const startY = position.baseline === 'middle' ? position.y - ((lines.length - 1) * lineHeight) / 2 : position.y;
    for (let index = 0; index < lines.length; index++) {
      ctx.fillText(lines[index]!, position.x, startY + index * lineHeight);
    }
  }

  function fontForDrawing(
    size: string,
    fontFamily?: string,
    textFormatting?: string,
    family: 'label' | 'text' = 'text',
  ): string {
    return drawingFont(size, fontFamily, textFormatting, font, family);
  }
  function addTooltip(text: string | undefined, rect: { x: number; y: number; width: number; height: number }): void {
    recordTooltip?.(text, rect);
  }

  renderLineFillDrawings(drawingPartition, bars, viewport, pane);
  renderBoxDrawings(drawingPartition.boxes, bars, viewport, pane);
  renderPolylineDrawings(drawingPartition.polylines, bars, viewport, pane);
  renderLineDrawings(drawingPartition.lines, bars, viewport, pane);
  renderLabelDrawings(drawingPartition.labels, bars, viewport, pane);
  renderTableDrawings(drawingPartition.tables, pane);
}
