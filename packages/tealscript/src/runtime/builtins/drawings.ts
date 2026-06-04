import type { BuiltinRegistry } from './registry';
import {
  getDrawingValue,
  toDrawingId,
  withDrawing,
} from '../drawings/helpers';
import type { ExecutionContext } from '../context';
import type {
  BoxDrawingOutput,
  ChartPoint,
  LabelDrawingOutput,
  LineDrawingOutput,
  PolylineDrawingOutput,
  TableCellDrawingOutput,
  TableDrawingOutput,
} from '../drawings/types';

export interface DrawingBuiltinRuntime {
  isNa(value: unknown): boolean;
  toNullableNumber(value: unknown): number | null;
  toStringValue(value: unknown): string;
  toNumber(value: unknown): number;
  toNullableColor(value: unknown): string | null;
  toOptionalString(value: unknown): string | undefined;
  toLineWidth(value: unknown): number;
  toDrawingId(value: unknown): string | undefined;
  withLine(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => void): void;
  getLineValue<T>(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => T): T | number;
  interpolateLinePrice(line: LineDrawingOutput, x: number): number;
}

function isChartPoint(value: unknown): value is ChartPoint {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { type?: unknown }).type === 'chart.point'
  );
}

function pointX(point: ChartPoint, xloc: string): number | null {
  return xloc === 'bar_time' ? point.time : point.index;
}

function copyPoint(point: ChartPoint): ChartPoint {
  return { ...point };
}

function applyLinePoint(line: LineDrawingOutput, pointValue: unknown, endpoint: 'first' | 'second'): void {
  const point = isChartPoint(pointValue) ? pointValue : undefined;
  const x = point ? pointX(point, line.xloc) : null;
  const y = point ? point.price : null;

  if (endpoint === 'first') {
    line.x1 = x;
    line.y1 = y;
  } else {
    line.x2 = x;
    line.y2 = y;
  }
}

function applyBoxPoint(box: BoxDrawingOutput, pointValue: unknown, corner: 'topLeft' | 'bottomRight'): void {
  const point = isChartPoint(pointValue) ? pointValue : undefined;
  const x = point ? pointX(point, box.xloc) : null;
  const y = point ? point.price : null;

  if (corner === 'topLeft') {
    box.left = x;
    box.top = y;
  } else {
    box.right = x;
    box.bottom = y;
  }
}

function isPineRuntimeArray(value: unknown): value is { values: unknown[] } {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { __tealscriptArray?: unknown }).__tealscriptArray === true
    && Array.isArray((value as { values?: unknown }).values)
  );
}

function chartPointArrayValues(value: unknown): ChartPoint[] {
  const values = Array.isArray(value)
    ? value
    : isPineRuntimeArray(value)
      ? value.values
      : [];
  return values.filter(isChartPoint).map(copyPoint);
}

function optionalString(runtime: DrawingBuiltinRuntime, value: unknown): string | undefined {
  return value === undefined ? undefined : runtime.toStringValue(value);
}

function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined ? undefined : Boolean(value);
}

function positiveInteger(runtime: DrawingBuiltinRuntime, value: unknown, fallback: number): number {
  const parsed = Math.trunc(runtime.toNumber(value ?? fallback));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tableCellKey(column: number, row: number): string {
  return `${column}:${row}`;
}

const MAX_TABLE_CELLS = 10000;

function normalizeTableColumn(runtime: DrawingBuiltinRuntime, value: unknown): number {
  return Math.max(0, Math.trunc(runtime.toNumber(value)));
}

function normalizeTableRow(runtime: DrawingBuiltinRuntime, value: unknown): number {
  return Math.max(0, Math.trunc(runtime.toNumber(value)));
}

function callArg(
  args: unknown[],
  namedArgs: Map<string, unknown>,
  index: number,
  name: string,
  fallback?: unknown,
  priorNames: readonly string[] = [],
): unknown {
  const positionalIndex = index - priorNames.filter((priorName) => namedArgs.has(priorName)).length;
  return namedArgs.has(name) ? namedArgs.get(name) : args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
}

function orderedCallArg(
  args: unknown[],
  namedArgs: Map<string, unknown>,
  names: readonly string[],
  index: number,
  fallback?: unknown,
): unknown {
  const name = names[index];
  const positionalIndex = index - names.slice(0, index).filter((priorName) => namedArgs.has(priorName)).length;
  return name && namedArgs.has(name)
    ? namedArgs.get(name)
    : args[positionalIndex] !== undefined
      ? args[positionalIndex]
      : fallback;
}

export function registerLabelBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const labelNewPointArgs = [
    'point',
    'text',
    'xloc',
    'yloc',
    'color',
    'style',
    'textcolor',
    'size',
    'textalign',
    'tooltip',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ] as const;
  const labelNewCoordinateArgs = [
    'x',
    'y',
    'text',
    'xloc',
    'yloc',
    'color',
    'style',
    'textcolor',
    'size',
    'textalign',
    'tooltip',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ] as const;

  builtins.set('label.new', (args, namedArgs, ctx, _scope, callId) => {
    const hasCoordinateArgs = labelNewCoordinateArgs.slice(0, 2).some((name) => namedArgs.has(name));
    const point = hasCoordinateArgs ? undefined : orderedCallArg(args, namedArgs, labelNewPointArgs, 0);
    const usesPointOverload = !hasCoordinateArgs && isChartPoint(point);
    const parameterNames = usesPointOverload ? labelNewPointArgs : labelNewCoordinateArgs;
    const xloc = runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 2 : 3, 'bar_index'));
    const x = usesPointOverload
      ? pointX(point, xloc)
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, labelNewCoordinateArgs, 0));
    const y = usesPointOverload
      ? point.price
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, labelNewCoordinateArgs, 1));
    const text = runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 1 : 2, ''));
    const id = `label_${callId}_${ctx.bar_index}`;

    const textFontFamilyIndex = usesPointOverload ? 10 : 11;
    const forceOverlayIndex = usesPointOverload ? 11 : 12;
    const textFormattingIndex = usesPointOverload ? 12 : 13;
    const textFontFamilyOrLegacyForceOverlay = orderedCallArg(args, namedArgs, parameterNames, textFontFamilyIndex);
    const usesLegacyForceOverlaySlot = !namedArgs.has('text_font_family')
      && !namedArgs.has('force_overlay')
      && !usesPointOverload
      && args.length === 12
      && typeof textFontFamilyOrLegacyForceOverlay === 'boolean';
    const textFontFamily = usesLegacyForceOverlaySlot ? undefined : optionalString(runtime, textFontFamilyOrLegacyForceOverlay);
    const forceOverlay = optionalBoolean(
      usesLegacyForceOverlaySlot ? textFontFamilyOrLegacyForceOverlay : orderedCallArg(args, namedArgs, parameterNames, forceOverlayIndex),
    );
    const textFormatting = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, textFormattingIndex));
    const textAlign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 8 : 9));
    const drawing: LabelDrawingOutput = {
      id,
      type: 'label',
      barIndex: ctx.bar_index,
      x,
      y,
      text,
      xloc,
      yloc: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 3 : 4, 'price')),
      style: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 5 : 6, 'label_left')),
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 5)),
      textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 6 : 7)),
      size: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 7 : 8, 'normal')),
      tooltip: runtime.toOptionalString(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 9 : 10)),
    };
    if (textAlign !== undefined) drawing.textAlign = textAlign;
    if (textFontFamily !== undefined) drawing.textFontFamily = textFontFamily;
    if (textFormatting !== undefined) drawing.textFormatting = textFormatting;
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    ctx.addDrawing(drawing);

    return id;
  });

  builtins.set('label.delete', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => ctx.deleteDrawing(label.id));
    return undefined;
  });

  builtins.set('label.copy', (args, namedArgs, ctx, _scope, callId) => {
    const labelId = toDrawingId(callArg(args, namedArgs, 0, 'id'), runtime.isNa);
    if (!labelId) return Number.NaN;

    const newId = `label_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyLabelDrawing(labelId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('label.set_x', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_y', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.y = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y', undefined, ['id']));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_xy', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      label.y = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_text', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.text = runtime.toStringValue(callArg(args, namedArgs, 1, 'text', '', ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_xloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      label.xloc = runtime.toStringValue(callArg(args, namedArgs, 2, 'xloc', undefined, ['id', 'x']));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_yloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.yloc = runtime.toStringValue(callArg(args, namedArgs, 1, 'yloc', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_style', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.style = runtime.toStringValue(callArg(args, namedArgs, 1, 'style', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_textcolor', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.textColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'textcolor', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_size', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.size = runtime.toStringValue(callArg(args, namedArgs, 1, 'size', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_textalign', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.textAlign = runtime.toStringValue(callArg(args, namedArgs, 1, 'textalign', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_text_font_family', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.textFontFamily = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_font_family', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_text_formatting', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.textFormatting = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_formatting', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.set_tooltip', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.tooltip = runtime.toOptionalString(callArg(args, namedArgs, 1, 'tooltip', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('label.get_x', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.x ?? Number.NaN));
  builtins.set('label.get_y', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.y ?? Number.NaN));
  builtins.set('label.get_text', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.text));
  builtins.set('label.get_xloc', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.xloc));
  builtins.set('label.get_yloc', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.yloc));
  builtins.set('label.get_style', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.style));
  builtins.set('label.get_color', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.color ?? Number.NaN));
  builtins.set('label.get_textcolor', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.textColor ?? Number.NaN));
  builtins.set('label.get_size', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.size));
  builtins.set('label.get_tooltip', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => label.tooltip ?? ''));
  builtins.set('label.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('label'));
}

export function registerLineBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const lineNewPointArgs = ['first_point', 'second_point', 'xloc', 'extend', 'color', 'style', 'width', 'force_overlay'] as const;
  const lineNewCoordinateArgs = ['x1', 'y1', 'x2', 'y2', 'xloc', 'extend', 'color', 'style', 'width', 'force_overlay'] as const;

  builtins.set('line.new', (args, namedArgs, ctx, _scope, callId) => {
    const hasCoordinateArgs = lineNewCoordinateArgs.slice(0, 4).some((name) => namedArgs.has(name));
    const firstPoint = hasCoordinateArgs ? undefined : orderedCallArg(args, namedArgs, lineNewPointArgs, 0);
    const secondPoint = hasCoordinateArgs ? undefined : orderedCallArg(args, namedArgs, lineNewPointArgs, 1);
    const usesPointOverload = !hasCoordinateArgs && isChartPoint(firstPoint) && isChartPoint(secondPoint);
    const parameterNames = usesPointOverload ? lineNewPointArgs : lineNewCoordinateArgs;
    const xloc = runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 2 : 4, 'bar_index'));
    const x1 = usesPointOverload
      ? pointX(firstPoint, xloc)
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, lineNewCoordinateArgs, 0));
    const y1 = usesPointOverload
      ? firstPoint.price
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, lineNewCoordinateArgs, 1));
    const x2 = usesPointOverload
      ? pointX(secondPoint, xloc)
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, lineNewCoordinateArgs, 2));
    const y2 = usesPointOverload
      ? secondPoint.price
      : runtime.toNullableNumber(orderedCallArg(args, namedArgs, lineNewCoordinateArgs, 3));
    const id = `line_${callId}_${ctx.bar_index}`;

    ctx.addDrawing({
      id,
      type: 'line',
      barIndex: ctx.bar_index,
      x1,
      y1,
      x2,
      y2,
      xloc,
      extend: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 3 : 5, 'none')),
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 6)),
      style: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 5 : 7, 'solid')),
      width: runtime.toLineWidth(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 6 : 8)),
      forceOverlay: Boolean(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 7 : 9, false)),
    });

    return id;
  });

  builtins.set('line.delete', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => ctx.deleteDrawing(line.id));
    return undefined;
  });

  builtins.set('line.copy', (args, namedArgs, ctx, _scope, callId) => {
    const lineId = runtime.toDrawingId(callArg(args, namedArgs, 0, 'id'));
    if (!lineId) return Number.NaN;

    const newId = `line_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyLineDrawing(lineId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('line.set_x1', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_x2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y1', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.y1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y', undefined, ['id']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.y2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y', undefined, ['id']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy1', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      line.y1 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
      line.y2 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_first_point', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      applyLinePoint(line, callArg(args, namedArgs, 1, 'first_point', undefined, ['id']), 'first');
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_second_point', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      applyLinePoint(line, callArg(args, namedArgs, 1, 'second_point', undefined, ['id']), 'second');
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xloc', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x1', undefined, ['id']));
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'x2', undefined, ['id', 'x1']));
      line.xloc = runtime.toStringValue(callArg(args, namedArgs, 3, 'xloc', undefined, ['id', 'x1', 'x2']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_extend', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.extend = runtime.toStringValue(callArg(args, namedArgs, 1, 'extend', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('line.set_color', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('line.set_style', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.style = runtime.toStringValue(callArg(args, namedArgs, 1, 'style', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('line.set_width', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.width = runtime.toLineWidth(callArg(args, namedArgs, 1, 'width', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('line.get_x1', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.x1 ?? Number.NaN));
  builtins.set('line.get_x2', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.x2 ?? Number.NaN));
  builtins.set('line.get_y1', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.y1 ?? Number.NaN));
  builtins.set('line.get_y2', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.y2 ?? Number.NaN));
  builtins.set('line.get_price', (args, namedArgs, ctx) => {
    const x = runtime.toNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
    return runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => runtime.interpolateLinePrice(line, x));
  });
  builtins.set('line.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('line'));
}

export function registerLineFillBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const lineFillNewArgs = ['line1', 'line2', 'color'] as const;

  builtins.set('linefill.new', (args, namedArgs, ctx, _scope, callId) => {
    const line1 = runtime.toDrawingId(orderedCallArg(args, namedArgs, lineFillNewArgs, 0));
    const line2 = runtime.toDrawingId(orderedCallArg(args, namedArgs, lineFillNewArgs, 1));
    if (!line1 || !line2) return Number.NaN;
    if (ctx.getDrawing(line1)?.type !== 'line' || ctx.getDrawing(line2)?.type !== 'line') {
      return Number.NaN;
    }

    const id = `linefill_${callId}_${ctx.bar_index}`;
    ctx.addDrawing({
      id,
      type: 'linefill',
      barIndex: ctx.bar_index,
      line1,
      line2,
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, lineFillNewArgs, 2)),
    });

    return id;
  });

  builtins.set('linefill.delete', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'linefill', runtime.isNa, (linefill) => ctx.deleteDrawing(linefill.id));
    return undefined;
  });

  builtins.set('linefill.set_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'linefill', runtime.isNa, (linefill) => {
      linefill.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('linefill.get_line1', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'linefill', runtime.isNa, (linefill) => linefill.line1));
  builtins.set('linefill.get_line2', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'linefill', runtime.isNa, (linefill) => linefill.line2));
  builtins.set('linefill.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('linefill'));
}

export function registerBoxBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const boxNewPointArgs = [
    'top_left',
    'bottom_right',
    'border_color',
    'border_width',
    'border_style',
    'extend',
    'xloc',
    'bgcolor',
    'text',
    'text_size',
    'text_color',
    'text_halign',
    'text_valign',
    'text_wrap',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ] as const;
  const boxNewCoordinateArgs = [
    'left',
    'top',
    'right',
    'bottom',
    'border_color',
    'border_width',
    'border_style',
    'extend',
    'xloc',
    'bgcolor',
    'text',
    'text_size',
    'text_color',
    'text_halign',
    'text_valign',
    'text_wrap',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ] as const;

  builtins.set('box.new', (args, namedArgs, ctx, _scope, callId) => {
    const id = `box_${callId}_${ctx.bar_index}`;
    const hasCoordinateArgs = boxNewCoordinateArgs.slice(0, 4).some((name) => namedArgs.has(name));
    const topLeft = hasCoordinateArgs ? undefined : orderedCallArg(args, namedArgs, boxNewPointArgs, 0);
    const bottomRight = hasCoordinateArgs ? undefined : orderedCallArg(args, namedArgs, boxNewPointArgs, 1);
    const usesPointOverload = !hasCoordinateArgs && isChartPoint(topLeft) && isChartPoint(bottomRight);
    const parameterNames = usesPointOverload ? boxNewPointArgs : boxNewCoordinateArgs;
    const xloc = runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 6 : 8, 'bar_index'));

    const textHalign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 11 : 13));
    const textValign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 12 : 14));
    const textWrap = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 13 : 15));
    const textFontFamily = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 14 : 16));
    const forceOverlay = optionalBoolean(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 15 : 17));
    const textFormatting = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 16 : 18));
    const drawing: BoxDrawingOutput = {
      id,
      type: 'box',
      barIndex: ctx.bar_index,
      left: usesPointOverload
        ? pointX(topLeft, xloc)
        : runtime.toNullableNumber(orderedCallArg(args, namedArgs, boxNewCoordinateArgs, 0)),
      top: usesPointOverload
        ? topLeft.price
        : runtime.toNullableNumber(orderedCallArg(args, namedArgs, boxNewCoordinateArgs, 1)),
      right: usesPointOverload
        ? pointX(bottomRight, xloc)
        : runtime.toNullableNumber(orderedCallArg(args, namedArgs, boxNewCoordinateArgs, 2)),
      bottom: usesPointOverload
        ? bottomRight.price
        : runtime.toNullableNumber(orderedCallArg(args, namedArgs, boxNewCoordinateArgs, 3)),
      borderColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 2 : 4)),
      borderWidth: runtime.toLineWidth(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 3 : 5)),
      borderStyle: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 6, 'solid')),
      extend: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 5 : 7, 'none')),
      xloc,
      bgcolor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 7 : 9)),
      text: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 8 : 10, '')),
      textSize: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 9 : 11, 'normal')),
      textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 10 : 12)),
    };
    if (textHalign !== undefined) drawing.textHalign = textHalign;
    if (textValign !== undefined) drawing.textValign = textValign;
    if (textWrap !== undefined) drawing.textWrap = textWrap;
    if (textFontFamily !== undefined) drawing.textFontFamily = textFontFamily;
    if (textFormatting !== undefined) drawing.textFormatting = textFormatting;
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    ctx.addDrawing(drawing);

    return id;
  });

  builtins.set('box.delete', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => ctx.deleteDrawing(box.id));
    return undefined;
  });

  builtins.set('box.copy', (args, namedArgs, ctx, _scope, callId) => {
    const boxId = runtime.toDrawingId(callArg(args, namedArgs, 0, 'id'));
    if (!boxId) return Number.NaN;

    const newId = `box_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyBoxDrawing(boxId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('box.set_left', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_right', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right', undefined, ['id']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_top', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.top = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'top', undefined, ['id']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bottom', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.bottom = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'bottom', undefined, ['id']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_lefttop', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id']));
      box.top = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'top', undefined, ['id', 'left']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_rightbottom', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right', undefined, ['id']));
      box.bottom = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'bottom', undefined, ['id', 'right']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_xloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id']));
      box.right = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'right', undefined, ['id', 'left']));
      box.xloc = runtime.toStringValue(callArg(args, namedArgs, 3, 'xloc', undefined, ['id', 'left', 'right']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_top_left_point', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      applyBoxPoint(box, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'topLeft');
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bottom_right_point', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      applyBoxPoint(box, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'bottomRight');
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bgcolor', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_border_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_border_width', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'width', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_border_style', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderStyle = runtime.toStringValue(callArg(args, namedArgs, 1, 'style', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_extend', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.extend = runtime.toStringValue(callArg(args, namedArgs, 1, 'extend', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.text = runtime.toStringValue(callArg(args, namedArgs, 1, 'text', '', ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'text_color', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_size', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textSize = runtime.toStringValue(callArg(args, namedArgs, 1, 'size', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_halign', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textHalign = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_halign', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_valign', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textValign = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_valign', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_wrap', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textWrap = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_wrap', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_font_family', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textFontFamily = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_font_family', undefined, ['id']));
    });
    return undefined;
  });
  builtins.set('box.set_text_formatting', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textFormatting = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_formatting', undefined, ['id']));
    });
    return undefined;
  });

  builtins.set('box.get_left', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.left ?? Number.NaN));
  builtins.set('box.get_right', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.right ?? Number.NaN));
  builtins.set('box.get_top', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.top ?? Number.NaN));
  builtins.set('box.get_bottom', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.bottom ?? Number.NaN));
  builtins.set('box.get_bgcolor', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.bgcolor ?? Number.NaN));
  builtins.set('box.get_border_color', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.borderColor ?? Number.NaN));
  builtins.set('box.get_text', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.text));
  builtins.set('box.get_text_halign', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.textHalign ?? 'left'));
  builtins.set('box.get_text_valign', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => box.textValign ?? 'top'));
  builtins.set('box.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('box'));
}

export function registerPolylineBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const polylineNewArgs = [
    'points',
    'curved',
    'closed',
    'xloc',
    'line_color',
    'fill_color',
    'line_style',
    'line_width',
    'force_overlay',
  ] as const;

  builtins.set('polyline.new', (args, namedArgs, ctx, _scope, callId) => {
    const points = chartPointArrayValues(orderedCallArg(args, namedArgs, polylineNewArgs, 0));
    if (points.length === 0) return Number.NaN;

    const id = `polyline_${callId}_${ctx.bar_index}`;
    const forceOverlay = optionalBoolean(orderedCallArg(args, namedArgs, polylineNewArgs, 8));
    const drawing: PolylineDrawingOutput = {
      id,
      type: 'polyline',
      barIndex: ctx.bar_index,
      points,
      curved: Boolean(orderedCallArg(args, namedArgs, polylineNewArgs, 1, false)),
      closed: Boolean(orderedCallArg(args, namedArgs, polylineNewArgs, 2, false)),
      xloc: runtime.toStringValue(orderedCallArg(args, namedArgs, polylineNewArgs, 3, 'bar_index')),
      lineColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, polylineNewArgs, 4)),
      fillColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, polylineNewArgs, 5)),
      lineStyle: runtime.toStringValue(orderedCallArg(args, namedArgs, polylineNewArgs, 6, 'solid')),
      lineWidth: runtime.toLineWidth(orderedCallArg(args, namedArgs, polylineNewArgs, 7)),
    };
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    ctx.addDrawing(drawing);
    return id;
  });

  builtins.set('polyline.delete', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'polyline', runtime.isNa, (polyline) => ctx.deleteDrawing(polyline.id));
    return undefined;
  });

  builtins.set('polyline.copy', (args, namedArgs, ctx, _scope, callId) => {
    const polylineId = runtime.toDrawingId(callArg(args, namedArgs, 0, 'id'));
    if (!polylineId) return Number.NaN;

    const newId = `polyline_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyPolylineDrawing(polylineId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('polyline.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('polyline'));
}

export function registerTableBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  const tableNewArgs = [
    'position',
    'columns',
    'rows',
    'bgcolor',
    'frame_color',
    'frame_width',
    'border_color',
    'border_width',
  ] as const;
  const tableCellArgs = [
    'table_id',
    'column',
    'row',
    'text',
    'width',
    'height',
    'text_color',
    'text_halign',
    'text_valign',
    'text_size',
    'bgcolor',
    'text_font_family',
    'text_formatting',
    'tooltip',
  ] as const;
  const withTable = (value: unknown, ctx: ExecutionContext, fn: (table: TableDrawingOutput) => void): void => {
    withDrawing(value, ctx, 'table', runtime.isNa, fn);
  };
  const tableCellCapacity = (table: Pick<TableDrawingOutput, 'columns' | 'rows'>): number => table.columns * table.rows;
  const assertTableCellCapacity = (
    ctx: ExecutionContext,
    table: Pick<TableDrawingOutput, 'columns' | 'rows'>,
  ): void => {
    const nextCells = tableCellCapacity(table);
    const currentCells = ctx
      .getDrawings()
      .filter((drawing): drawing is TableDrawingOutput => drawing.type === 'table')
      .reduce((sum, drawing) => sum + tableCellCapacity(drawing), 0);

    if (nextCells + currentCells > MAX_TABLE_CELLS) {
      throw new Error(`Too many table cells: maximum is ${MAX_TABLE_CELLS}`);
    }
  };
  const createDefaultCell = (column: number, row: number): TableCellDrawingOutput => ({
    column,
    row,
    text: '',
    width: undefined,
    height: undefined,
    textColor: null,
    textHalign: 'center',
    textValign: 'middle',
    textSize: 'normal',
    bgcolor: null,
  });
  const upsertCell = (table: TableDrawingOutput, cell: TableCellDrawingOutput): void => {
    const key = tableCellKey(cell.column, cell.row);
    const index = table.cells.findIndex((existing) => tableCellKey(existing.column, existing.row) === key);
    if (index === -1) {
      table.cells.push(cell);
    } else {
      table.cells[index] = cell;
    }
  };
  const normalizeCellCoordinates = (
    table: TableDrawingOutput,
    column: unknown,
    row: unknown,
  ): { column: number; row: number } => {
    const normalizedColumn = normalizeTableColumn(runtime, column);
    const normalizedRow = normalizeTableRow(runtime, row);
    if (
      !Number.isFinite(normalizedColumn)
      || !Number.isFinite(normalizedRow)
      || normalizedColumn < 0
      || normalizedColumn >= table.columns
      || normalizedRow < 0
      || normalizedRow >= table.rows
    ) {
      throw new Error(`Table cell coordinates out of bounds: column ${normalizedColumn}, row ${normalizedRow}`);
    }

    return { column: normalizedColumn, row: normalizedRow };
  };
  const ensureCell = (
    table: TableDrawingOutput,
    column: unknown,
    row: unknown,
  ): TableCellDrawingOutput => {
    const coordinates = normalizeCellCoordinates(table, column, row);
    const existing = table.cells.find((cell) => (
      cell.column === coordinates.column && cell.row === coordinates.row
    ));
    if (existing) return existing;

    const cell = createDefaultCell(coordinates.column, coordinates.row);
    table.cells.push(cell);
    return cell;
  };
  const normalizeMergedCellRange = (
    table: TableDrawingOutput,
    startColumn: unknown,
    startRow: unknown,
    endColumn: unknown,
    endRow: unknown,
  ): { startColumn: number; startRow: number; endColumn: number; endRow: number } => {
    const start = normalizeCellCoordinates(table, startColumn, startRow);
    const end = normalizeCellCoordinates(table, endColumn, endRow);

    return {
      startColumn: Math.min(start.column, end.column),
      startRow: Math.min(start.row, end.row),
      endColumn: Math.max(start.column, end.column),
      endRow: Math.max(start.row, end.row),
    };
  };
  const mergedCellRangesOverlap = (
    first: { startColumn: number; startRow: number; endColumn: number; endRow: number },
    second: { startColumn: number; startRow: number; endColumn: number; endRow: number },
  ): boolean => (
    first.startColumn <= second.endColumn
    && first.endColumn >= second.startColumn
    && first.startRow <= second.endRow
    && first.endRow >= second.startRow
  );

  builtins.set('table.new', (args, namedArgs, ctx, _scope, callId) => {
    const id = `table_${callId}_${ctx.bar_index}`;
    const columns = positiveInteger(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 1), 1);
    const rows = positiveInteger(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 2), 1);
    assertTableCellCapacity(ctx, { columns, rows });

    const drawing: TableDrawingOutput = {
      id,
      type: 'table',
      barIndex: ctx.bar_index,
      position: runtime.toStringValue(orderedCallArg(args, namedArgs, tableNewArgs, 0, 'top_right')),
      columns,
      rows,
      bgcolor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 3)),
      frameColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 4)),
      frameWidth: runtime.toLineWidth(orderedCallArg(args, namedArgs, tableNewArgs, 5)),
      borderColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 6)),
      borderWidth: runtime.toLineWidth(orderedCallArg(args, namedArgs, tableNewArgs, 7)),
      cells: [],
    };

    ctx.addDrawing(drawing);
    return id;
  });

  builtins.set('table.delete', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => ctx.deleteDrawing(table.id));
    return undefined;
  });

  builtins.set('table.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('table'));

  builtins.set('table.clear', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const startColumn = normalizeTableColumn(runtime, callArg(args, namedArgs, 1, 'start_column', 0, ['table_id']));
      const startRow = normalizeTableRow(runtime, callArg(args, namedArgs, 2, 'start_row', 0, ['table_id', 'start_column']));
      const endColumnArg = callArg(args, namedArgs, 3, 'end_column', undefined, ['table_id', 'start_column', 'start_row']);
      const endRowArg = callArg(args, namedArgs, 4, 'end_row', undefined, ['table_id', 'start_column', 'start_row', 'end_column']);
      const endColumn = (namedArgs.has('end_column') || endColumnArg !== undefined)
        ? normalizeTableColumn(runtime, endColumnArg)
        : table.columns - 1;
      const endRow = (namedArgs.has('end_row') || endRowArg !== undefined)
        ? normalizeTableRow(runtime, endRowArg)
        : table.rows - 1;
      table.cells = table.cells.filter((cell) => (
        cell.column < startColumn
        || cell.column > endColumn
        || cell.row < startRow
        || cell.row > endRow
      ));
      const clearedRange = { startColumn, startRow, endColumn, endRow };
      table.mergedCells = table.mergedCells?.filter((mergedCell) => !mergedCellRangesOverlap(mergedCell, clearedRange));
    });
    return undefined;
  });
  builtins.set('table.merge_cells', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const range = normalizeMergedCellRange(
        table,
        callArg(args, namedArgs, 1, 'start_column', undefined, ['table_id']),
        callArg(args, namedArgs, 2, 'start_row', undefined, ['table_id', 'start_column']),
        callArg(args, namedArgs, 3, 'end_column', undefined, ['table_id', 'start_column', 'start_row']),
        callArg(args, namedArgs, 4, 'end_row', undefined, ['table_id', 'start_column', 'start_row', 'end_column']),
      );
      if (table.mergedCells?.some((mergedCell) => mergedCellRangesOverlap(mergedCell, range))) {
        throw new Error(`Table merged cell range overlaps existing merged cells: columns ${range.startColumn}-${range.endColumn}, rows ${range.startRow}-${range.endRow}`);
      }
      table.mergedCells = [...(table.mergedCells ?? []), range];
    });
    return undefined;
  });

  builtins.set('table.set_position', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.position = runtime.toStringValue(callArg(args, namedArgs, 1, 'position', undefined, ['table_id']));
    });
    return undefined;
  });
  builtins.set('table.set_bgcolor', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'bgcolor', undefined, ['table_id']));
    });
    return undefined;
  });
  builtins.set('table.set_frame_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.frameColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'frame_color', undefined, ['table_id']));
    });
    return undefined;
  });
  builtins.set('table.set_frame_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.frameWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'frame_width', undefined, ['table_id']));
    });
    return undefined;
  });
  builtins.set('table.set_border_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.borderColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'border_color', undefined, ['table_id']));
    });
    return undefined;
  });
  builtins.set('table.set_border_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.borderWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'border_width', undefined, ['table_id']));
    });
    return undefined;
  });

  builtins.set('table.cell', (args, namedArgs, ctx) => {
    withTable(orderedCallArg(args, namedArgs, tableCellArgs, 0), ctx, (table) => {
      const { column, row } = normalizeCellCoordinates(
        table,
        orderedCallArg(args, namedArgs, tableCellArgs, 1),
        orderedCallArg(args, namedArgs, tableCellArgs, 2),
      );
      const textFontFamily = optionalString(runtime, orderedCallArg(args, namedArgs, tableCellArgs, 11));
      const textFormatting = optionalString(runtime, orderedCallArg(args, namedArgs, tableCellArgs, 12));
      const tooltip = runtime.toOptionalString(orderedCallArg(args, namedArgs, tableCellArgs, 13));
      const cell: TableCellDrawingOutput = {
        column,
        row,
        text: runtime.toStringValue(orderedCallArg(args, namedArgs, tableCellArgs, 3, '')),
        width: namedArgs.has('width') || orderedCallArg(args, namedArgs, tableCellArgs, 4) !== undefined
          ? runtime.toNullableNumber(orderedCallArg(args, namedArgs, tableCellArgs, 4))
          : undefined,
        height: namedArgs.has('height') || orderedCallArg(args, namedArgs, tableCellArgs, 5) !== undefined
          ? runtime.toNullableNumber(orderedCallArg(args, namedArgs, tableCellArgs, 5))
          : undefined,
        textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableCellArgs, 6)),
        textHalign: runtime.toStringValue(orderedCallArg(args, namedArgs, tableCellArgs, 7, 'center')),
        textValign: runtime.toStringValue(orderedCallArg(args, namedArgs, tableCellArgs, 8, 'middle')),
        textSize: runtime.toStringValue(orderedCallArg(args, namedArgs, tableCellArgs, 9, 'normal')),
        bgcolor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableCellArgs, 10)),
      };
      if (textFontFamily !== undefined) cell.textFontFamily = textFontFamily;
      if (textFormatting !== undefined) cell.textFormatting = textFormatting;
      if (tooltip !== undefined) cell.tooltip = tooltip;
      upsertCell(table, cell);
    });
    return undefined;
  });

  builtins.set('table.cell_set_text', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.text = runtime.toStringValue(callArg(args, namedArgs, 3, 'text', '', ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_bgcolor', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 3, 'bgcolor', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textColor = runtime.toNullableColor(callArg(args, namedArgs, 3, 'text_color', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_size', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textSize = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_size', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.width = runtime.toNullableNumber(callArg(args, namedArgs, 3, 'width', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_height', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.height = runtime.toNullableNumber(callArg(args, namedArgs, 3, 'height', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_halign', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textHalign = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_halign', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_valign', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textValign = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_valign', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_font_family', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textFontFamily = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_font_family', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_formatting', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.textFormatting = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_formatting', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
  builtins.set('table.cell_set_tooltip', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column', undefined, ['table_id']), callArg(args, namedArgs, 2, 'row', undefined, ['table_id', 'column']));
      cell.tooltip = runtime.toOptionalString(callArg(args, namedArgs, 3, 'tooltip', undefined, ['table_id', 'column', 'row']));
    });
    return undefined;
  });
}

const DRAWING_CONSTANTS: Record<string, string> = {
  'xloc.bar_index': 'bar_index',
  'xloc.bar_time': 'bar_time',
  'extend.none': 'none',
  'extend.right': 'right',
  'extend.left': 'left',
  'extend.both': 'both',
  'yloc.price': 'price',
  'yloc.abovebar': 'abovebar',
  'yloc.belowbar': 'belowbar',
  'line.style_solid': 'solid',
  'line.style_dotted': 'dotted',
  'line.style_dashed': 'dashed',
  'line.style_arrow_left': 'arrow_left',
  'line.style_arrow_right': 'arrow_right',
  'line.style_arrow_both': 'arrow_both',
  'label.style_none': 'none',
  'label.style_label_up': 'label_up',
  'label.style_label_down': 'label_down',
  'label.style_label_left': 'label_left',
  'label.style_label_right': 'label_right',
  'label.style_label_lower_left': 'label_lower_left',
  'label.style_label_lower_right': 'label_lower_right',
  'label.style_label_upper_left': 'label_upper_left',
  'label.style_label_upper_right': 'label_upper_right',
  'label.style_circle': 'circle',
  'label.style_square': 'square',
  'label.style_diamond': 'diamond',
  'label.style_cross': 'cross',
  'label.style_xcross': 'xcross',
  'label.style_triangleup': 'triangleup',
  'label.style_triangledown': 'triangledown',
  'label.style_flag': 'flag',
  'label.style_arrowup': 'arrowup',
  'label.style_arrowdown': 'arrowdown',
  'text.align_left': 'left',
  'text.align_center': 'center',
  'text.align_right': 'right',
  'text.align_top': 'top',
  'text.align_middle': 'middle',
  'text.align_bottom': 'bottom',
  'text.wrap_none': 'none',
  'text.wrap_auto': 'auto',
  'text.format_none': 'none',
  'text.format_bold': 'bold',
  'text.format_italic': 'italic',
  'font.family_default': 'default',
  'font.family_monospace': 'monospace',
  'position.top_left': 'top_left',
  'position.top_center': 'top_center',
  'position.top_right': 'top_right',
  'position.middle_left': 'middle_left',
  'position.middle_center': 'middle_center',
  'position.middle_right': 'middle_right',
  'position.bottom_left': 'bottom_left',
  'position.bottom_center': 'bottom_center',
  'position.bottom_right': 'bottom_right',
};

export function registerDrawingConstants(builtins: BuiltinRegistry): void {
  for (const [name, value] of Object.entries(DRAWING_CONSTANTS)) {
    builtins.set(name, () => value);
  }

  builtins.set('chart.point.new', (args, namedArgs) => {
    const time = callArg(args, namedArgs, 0, 'time');
    const index = callArg(args, namedArgs, 1, 'index', undefined, ['time']);
    const price = callArg(args, namedArgs, 2, 'price', undefined, ['time', 'index']);
    return {
      type: 'chart.point',
      time: typeof time === 'number' && Number.isFinite(time) ? time : null,
      index: typeof index === 'number' && Number.isFinite(index) ? Math.trunc(index) : null,
      price: typeof price === 'number' && Number.isFinite(price) ? price : null,
    };
  });
  builtins.set('chart.point.now', (args, namedArgs, ctx) => {
    const price = callArg(args, namedArgs, 0, 'price');
    const currentTime = ctx.time.get(0);
    const closeValue = ctx.close.get(0);
    return {
      type: 'chart.point',
      time: typeof currentTime === 'number' && Number.isFinite(currentTime) ? currentTime : null,
      index: ctx.bar_index,
      price: typeof price === 'number' && Number.isFinite(price)
        ? price
        : typeof closeValue === 'number' && Number.isFinite(closeValue) ? closeValue : null,
    };
  });
  builtins.set('chart.point.from_index', (args, namedArgs) => {
    const index = callArg(args, namedArgs, 0, 'index');
    const price = callArg(args, namedArgs, 1, 'price', undefined, ['index']);
    return {
      type: 'chart.point',
      time: null,
      index: typeof index === 'number' && Number.isFinite(index) ? Math.trunc(index) : null,
      price: typeof price === 'number' && Number.isFinite(price) ? price : null,
    };
  });
  builtins.set('chart.point.from_time', (args, namedArgs) => {
    const time = callArg(args, namedArgs, 0, 'time');
    const price = callArg(args, namedArgs, 1, 'price', undefined, ['time']);
    return {
      type: 'chart.point',
      time: typeof time === 'number' && Number.isFinite(time) ? time : null,
      index: null,
      price: typeof price === 'number' && Number.isFinite(price) ? price : null,
    };
  });
  builtins.set('chart.point.copy', (args, namedArgs) => {
    const source = callArg(args, namedArgs, 0, 'id');
    if (!isChartPoint(source)) return Number.NaN;
    return { ...source };
  });
}
