import type { DrawingScreenPoint, DrawingScreenRect } from './coordinates';
import type { UserDrawingTextAlign } from './types';

export interface UserDrawingTextLineLayout {
  text: string;
  width: number;
  x: number;
  y: number;
}

export interface UserDrawingTextLabelLayout {
  box: DrawingScreenRect;
  lines: readonly UserDrawingTextLineLayout[];
  lineHeight: number;
  padding: number;
}

export interface UserDrawingBalloonLayout extends UserDrawingTextLabelLayout {
  tail: {
    tip: DrawingScreenPoint;
    left: DrawingScreenPoint;
    right: DrawingScreenPoint;
  };
}

export interface UserDrawingTextEditMetrics {
  lines: readonly string[];
  longestLineLength: number;
}

export interface ResolveUserDrawingTextLabelLayoutOptions {
  text: string;
  point: DrawingScreenPoint;
  textAlign: UserDrawingTextAlign;
  lineWidths: readonly number[];
  lines?: readonly string[];
  boxWidth?: number;
  labelPadding?: number;
  lineHeight?: number;
}

export interface ResolveUserDrawingBalloonLayoutOptions extends ResolveUserDrawingTextLabelLayoutOptions {
  tailLength?: number;
  tailWidth?: number;
}

export const DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING = 6;
export const DEFAULT_USER_DRAWING_TEXT_LINE_HEIGHT = 18;
const LABEL_VERTICAL_EXTRA = 2;

export interface UserDrawingMeasuredTextLine {
  text: string;
  width: number;
}

export function splitUserDrawingTextLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  return lines.length === 0 ? [''] : lines;
}

export function measureUserDrawingTextLines(
  text: string,
  measureText: (line: string) => number,
  maxLineWidth?: number,
): UserDrawingMeasuredTextLine[] {
  const wrappedLines: UserDrawingMeasuredTextLine[] = [];
  const boundedMaxLineWidth =
    maxLineWidth === undefined || !Number.isFinite(maxLineWidth) ? undefined : Math.max(1, maxLineWidth);

  for (const sourceLine of splitUserDrawingTextLines(text)) {
    if (sourceLine.length === 0) {
      wrappedLines.push({ text: '', width: 0 });
      continue;
    }

    if (boundedMaxLineWidth === undefined || measureText(sourceLine) <= boundedMaxLineWidth) {
      wrappedLines.push({ text: sourceLine, width: Math.max(0, measureText(sourceLine)) });
      continue;
    }

    let currentLine = '';
    for (const token of sourceLine.split(/(\s+)/).filter((part) => part.length > 0)) {
      const candidate = `${currentLine}${token}`;
      if (currentLine.length > 0 && measureText(candidate) > boundedMaxLineWidth) {
        const line = currentLine.trimEnd();
        wrappedLines.push({ text: line, width: Math.max(0, measureText(line)) });
        currentLine = token.trimStart();
      } else {
        currentLine = candidate;
      }
    }

    const finalLine = currentLine.trimEnd();
    wrappedLines.push({ text: finalLine, width: Math.max(0, measureText(finalLine)) });
  }

  return wrappedLines.length === 0 ? [{ text: '', width: 0 }] : wrappedLines;
}

export function resolveUserDrawingTextEditMetrics(text: string): UserDrawingTextEditMetrics {
  const lines = splitUserDrawingTextLines(text);
  return {
    lines,
    longestLineLength: Math.max(0, ...lines.map((line) => line.length)),
  };
}

export function resolveUserDrawingTextLabelLayout({
  text,
  point,
  textAlign,
  lineWidths,
  lines: measuredLines,
  boxWidth,
  labelPadding = DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING,
  lineHeight = DEFAULT_USER_DRAWING_TEXT_LINE_HEIGHT,
}: ResolveUserDrawingTextLabelLayoutOptions): UserDrawingTextLabelLayout {
  const lines = measuredLines ?? splitUserDrawingTextLines(text);
  const widths = lines.map((_, index) => Math.max(0, lineWidths[index] ?? 0));
  const maxLineWidth = Math.max(0, ...widths);
  const width = Math.ceil(Math.max(maxLineWidth + labelPadding * 2, boxWidth ?? 0));
  const height = lines.length * lineHeight + LABEL_VERTICAL_EXTRA;
  const x = point.x - width / 2;
  const y = point.y - height / 2;

  return {
    box: { x, y, width, height },
    lineHeight,
    padding: labelPadding,
    lines: lines.map((line, index) => {
      const lineWidth = widths[index] ?? 0;
      const lineX =
        textAlign === 'left'
          ? x + labelPadding
          : textAlign === 'right'
            ? x + width - labelPadding - lineWidth
            : point.x - lineWidth / 2;

      return {
        text: line,
        width: lineWidth,
        x: lineX,
        y: y + LABEL_VERTICAL_EXTRA / 2 + lineHeight / 2 + index * lineHeight,
      };
    }),
  };
}

export function resolveUserDrawingBalloonLayout({
  text,
  point,
  textAlign,
  lineWidths,
  lines: measuredLines,
  boxWidth,
  labelPadding = DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING,
  lineHeight = DEFAULT_USER_DRAWING_TEXT_LINE_HEIGHT,
  tailLength = Math.max(10, lineHeight * 0.6),
  tailWidth = Math.max(10, lineHeight * 0.7),
}: ResolveUserDrawingBalloonLayoutOptions): UserDrawingBalloonLayout {
  const lines = measuredLines ?? splitUserDrawingTextLines(text);
  const widths = lines.map((_, index) => Math.max(0, lineWidths[index] ?? 0));
  const maxLineWidth = Math.max(0, ...widths);
  const width = Math.ceil(Math.max(maxLineWidth + labelPadding * 2, boxWidth ?? 0));
  const height = lines.length * lineHeight + LABEL_VERTICAL_EXTRA;
  const box = {
    x: point.x - width / 2,
    y: point.y - tailLength - height,
    width,
    height,
  };
  const bottomCenter = { x: point.x, y: box.y + box.height };

  return {
    box,
    lineHeight,
    padding: labelPadding,
    lines: lines.map((line, index) => {
      const lineWidth = widths[index] ?? 0;
      const lineX =
        textAlign === 'left'
          ? box.x + labelPadding
          : textAlign === 'right'
            ? box.x + box.width - labelPadding - lineWidth
            : point.x - lineWidth / 2;

      return {
        text: line,
        width: lineWidth,
        x: lineX,
        y: box.y + LABEL_VERTICAL_EXTRA / 2 + lineHeight / 2 + index * lineHeight,
      };
    }),
    tail: {
      tip: point,
      left: { x: bottomCenter.x - tailWidth / 2, y: bottomCenter.y },
      right: { x: bottomCenter.x + tailWidth / 2, y: bottomCenter.y },
    },
  };
}
