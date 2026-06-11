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

export interface UserDrawingTextEditMetrics {
  lines: readonly string[];
  longestLineLength: number;
}

export interface ResolveUserDrawingTextLabelLayoutOptions {
  text: string;
  point: DrawingScreenPoint;
  textAlign: UserDrawingTextAlign;
  lineWidths: readonly number[];
  labelPadding?: number;
  lineHeight?: number;
}

export const DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING = 6;
export const DEFAULT_USER_DRAWING_TEXT_LINE_HEIGHT = 18;
const LABEL_VERTICAL_EXTRA = 2;

export function splitUserDrawingTextLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  return lines.length === 0 ? [''] : lines;
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
  labelPadding = DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING,
  lineHeight = DEFAULT_USER_DRAWING_TEXT_LINE_HEIGHT,
}: ResolveUserDrawingTextLabelLayoutOptions): UserDrawingTextLabelLayout {
  const lines = splitUserDrawingTextLines(text);
  const widths = lines.map((_, index) => Math.max(0, lineWidths[index] ?? 0));
  const maxLineWidth = Math.max(0, ...widths);
  const width = Math.ceil(maxLineWidth + labelPadding * 2);
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
