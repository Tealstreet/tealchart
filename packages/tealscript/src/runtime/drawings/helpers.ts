import type { ExecutionContext } from '../context';
import type { DrawingOutput } from './types';

type DrawingType = DrawingOutput['type'];
type DrawingOfType<T extends DrawingType> = Extract<DrawingOutput, { type: T }>;

export function toDrawingId(value: unknown, isNa: (value: unknown) => boolean): string | undefined {
  if (value === null || value === undefined || isNa(value)) return undefined;
  return String(value);
}

export function toLineWidth(value: unknown, clampNumber: (value: unknown, min: number, max: number) => number): number {
  return Math.max(1, clampNumber(value ?? 1, 1, 100));
}

export function withDrawing<T extends DrawingType>(
  value: unknown,
  ctx: ExecutionContext,
  type: T,
  isNa: (value: unknown) => boolean,
  fn: (drawing: DrawingOfType<T>) => void,
): void {
  const drawingId = toDrawingId(value, isNa);
  if (!drawingId) return;

  const drawing = ctx.getDrawing(drawingId);
  if (drawing?.type === type) {
    fn(drawing as DrawingOfType<T>);
  }
}

export function getDrawingValue<T extends DrawingType, R>(
  value: unknown,
  ctx: ExecutionContext,
  type: T,
  isNa: (value: unknown) => boolean,
  fn: (drawing: DrawingOfType<T>) => R,
): R | number {
  const drawingId = toDrawingId(value, isNa);
  if (!drawingId) return Number.NaN;

  const drawing = ctx.getDrawing(drawingId);
  if (drawing?.type !== type) return Number.NaN;
  return fn(drawing as DrawingOfType<T>);
}
