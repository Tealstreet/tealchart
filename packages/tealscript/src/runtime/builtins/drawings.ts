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

function callArg(args: unknown[], namedArgs: Map<string, unknown>, index: number, name: string, fallback?: unknown): unknown {
  return namedArgs.has(name) ? namedArgs.get(name) : args[index] !== undefined ? args[index] : fallback;
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
  const labelNewArgs = [
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
    'force_overlay',
  ] as const;

  builtins.set('label.new', (args, namedArgs, ctx, _scope, callId) => {
    const x = runtime.toNullableNumber(orderedCallArg(args, namedArgs, labelNewArgs, 0));
    const y = runtime.toNullableNumber(orderedCallArg(args, namedArgs, labelNewArgs, 1));
    const text = runtime.toStringValue(orderedCallArg(args, namedArgs, labelNewArgs, 2, ''));
    const id = `label_${callId}_${ctx.bar_index}`;

    const forceOverlay = optionalBoolean(orderedCallArg(args, namedArgs, labelNewArgs, 11));
    const drawing: LabelDrawingOutput = {
      id,
      type: 'label',
      barIndex: ctx.bar_index,
      x,
      y,
      text,
      xloc: runtime.toStringValue(orderedCallArg(args, namedArgs, labelNewArgs, 3, 'bar_index')),
      yloc: runtime.toStringValue(orderedCallArg(args, namedArgs, labelNewArgs, 4, 'price')),
      style: runtime.toStringValue(orderedCallArg(args, namedArgs, labelNewArgs, 6, 'label_left')),
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, labelNewArgs, 5)),
      textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, labelNewArgs, 7)),
      size: runtime.toStringValue(orderedCallArg(args, namedArgs, labelNewArgs, 8, 'normal')),
      tooltip: runtime.toOptionalString(orderedCallArg(args, namedArgs, labelNewArgs, 10)),
    };
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
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_y', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.y = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y'));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_xy', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      label.y = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y'));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_text', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.text = runtime.toStringValue(callArg(args, namedArgs, 1, 'text', ''));
    });
    return undefined;
  });

  builtins.set('label.set_xloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      label.xloc = runtime.toStringValue(callArg(args, namedArgs, 2, 'xloc'));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_yloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.yloc = runtime.toStringValue(callArg(args, namedArgs, 1, 'yloc'));
    });
    return undefined;
  });

  builtins.set('label.set_style', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.style = runtime.toStringValue(callArg(args, namedArgs, 1, 'style'));
    });
    return undefined;
  });

  builtins.set('label.set_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color'));
    });
    return undefined;
  });

  builtins.set('label.set_textcolor', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.textColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'textcolor'));
    });
    return undefined;
  });

  builtins.set('label.set_size', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.size = runtime.toStringValue(callArg(args, namedArgs, 1, 'size'));
    });
    return undefined;
  });

  builtins.set('label.set_tooltip', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      label.tooltip = runtime.toOptionalString(callArg(args, namedArgs, 1, 'tooltip'));
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
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_x2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y1', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.y1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.y2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'y'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy1', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      line.y1 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x'));
      line.y2 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xloc', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x1 = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x1'));
      line.x2 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'x2'));
      line.xloc = runtime.toStringValue(callArg(args, namedArgs, 3, 'xloc'));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_extend', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.extend = runtime.toStringValue(callArg(args, namedArgs, 1, 'extend'));
    });
    return undefined;
  });

  builtins.set('line.set_color', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color'));
    });
    return undefined;
  });

  builtins.set('line.set_style', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.style = runtime.toStringValue(callArg(args, namedArgs, 1, 'style'));
    });
    return undefined;
  });

  builtins.set('line.set_width', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.width = runtime.toLineWidth(callArg(args, namedArgs, 1, 'width'));
    });
    return undefined;
  });

  builtins.set('line.get_x1', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.x1 ?? Number.NaN));
  builtins.set('line.get_x2', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.x2 ?? Number.NaN));
  builtins.set('line.get_y1', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.y1 ?? Number.NaN));
  builtins.set('line.get_y2', (args, namedArgs, ctx) => runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => line.y2 ?? Number.NaN));
  builtins.set('line.get_price', (args, namedArgs, ctx) => {
    const x = runtime.toNumber(callArg(args, namedArgs, 1, 'x'));
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
      linefill.color = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color'));
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
      box.left = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_right', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_top', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.top = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'top'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bottom', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.bottom = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'bottom'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_lefttop', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left'));
      box.top = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'top'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_rightbottom', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right'));
      box.bottom = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'bottom'));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bgcolor', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color'));
    });
    return undefined;
  });
  builtins.set('box.set_border_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'color'));
    });
    return undefined;
  });
  builtins.set('box.set_border_width', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'width'));
    });
    return undefined;
  });
  builtins.set('box.set_border_style', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.borderStyle = runtime.toStringValue(callArg(args, namedArgs, 1, 'style'));
    });
    return undefined;
  });
  builtins.set('box.set_extend', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.extend = runtime.toStringValue(callArg(args, namedArgs, 1, 'extend'));
    });
    return undefined;
  });
  builtins.set('box.set_text', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.text = runtime.toStringValue(callArg(args, namedArgs, 1, 'text', ''));
    });
    return undefined;
  });
  builtins.set('box.set_text_color', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'text_color'));
    });
    return undefined;
  });
  builtins.set('box.set_text_size', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textSize = runtime.toStringValue(callArg(args, namedArgs, 1, 'size'));
    });
    return undefined;
  });
  builtins.set('box.set_text_halign', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textHalign = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_halign'));
    });
    return undefined;
  });
  builtins.set('box.set_text_valign', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textValign = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_valign'));
    });
    return undefined;
  });
  builtins.set('box.set_text_wrap', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textWrap = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_wrap'));
    });
    return undefined;
  });
  builtins.set('box.set_text_font_family', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.textFontFamily = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_font_family'));
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

  builtins.set('table.clear', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const startColumn = normalizeTableColumn(runtime, callArg(args, namedArgs, 1, 'start_column', 0));
      const startRow = normalizeTableRow(runtime, callArg(args, namedArgs, 2, 'start_row', 0));
      const endColumn = (namedArgs.has('end_column') || args[3] !== undefined)
        ? normalizeTableColumn(runtime, callArg(args, namedArgs, 3, 'end_column'))
        : table.columns - 1;
      const endRow = (namedArgs.has('end_row') || args[4] !== undefined)
        ? normalizeTableRow(runtime, callArg(args, namedArgs, 4, 'end_row'))
        : table.rows - 1;
      table.cells = table.cells.filter((cell) => (
        cell.column < startColumn
        || cell.column > endColumn
        || cell.row < startRow
        || cell.row > endRow
      ));
    });
    return undefined;
  });

  builtins.set('table.set_position', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.position = runtime.toStringValue(callArg(args, namedArgs, 1, 'position'));
    });
    return undefined;
  });
  builtins.set('table.set_bgcolor', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'bgcolor'));
    });
    return undefined;
  });
  builtins.set('table.set_frame_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.frameColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'frame_color'));
    });
    return undefined;
  });
  builtins.set('table.set_frame_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.frameWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'frame_width'));
    });
    return undefined;
  });
  builtins.set('table.set_border_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.borderColor = runtime.toNullableColor(callArg(args, namedArgs, 1, 'border_color'));
    });
    return undefined;
  });
  builtins.set('table.set_border_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      table.borderWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'border_width'));
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
      upsertCell(table, cell);
    });
    return undefined;
  });

  builtins.set('table.cell_set_text', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.text = runtime.toStringValue(callArg(args, namedArgs, 3, 'text', ''));
    });
    return undefined;
  });
  builtins.set('table.cell_set_bgcolor', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.bgcolor = runtime.toNullableColor(callArg(args, namedArgs, 3, 'bgcolor'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_color', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textColor = runtime.toNullableColor(callArg(args, namedArgs, 3, 'text_color'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_size', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textSize = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_size'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_width', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.width = runtime.toNullableNumber(callArg(args, namedArgs, 3, 'width'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_height', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.height = runtime.toNullableNumber(callArg(args, namedArgs, 3, 'height'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_halign', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textHalign = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_halign'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_valign', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textValign = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_valign'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_font_family', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textFontFamily = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_font_family'));
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_formatting', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const cell = ensureCell(table, callArg(args, namedArgs, 1, 'column'), callArg(args, namedArgs, 2, 'row'));
      cell.textFormatting = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_formatting'));
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

  builtins.set('chart.point.new', (args) => ({
    type: 'chart.point',
    time: typeof args[0] === 'number' && Number.isFinite(args[0]) ? args[0] : null,
    index: typeof args[1] === 'number' && Number.isFinite(args[1]) ? Math.trunc(args[1]) : null,
    price: typeof args[2] === 'number' && Number.isFinite(args[2]) ? args[2] : null,
  }));
  builtins.set('chart.point.now', (args, _namedArgs, ctx) => ({
    type: 'chart.point',
    time: ctx.time.get(0) ?? null,
    index: ctx.bar_index,
    price: typeof args[0] === 'number' && Number.isFinite(args[0]) ? args[0] : ctx.close.get(0) ?? null,
  }));
  builtins.set('chart.point.from_index', (args) => ({
    type: 'chart.point',
    time: null,
    index: typeof args[0] === 'number' && Number.isFinite(args[0]) ? Math.trunc(args[0]) : null,
    price: typeof args[1] === 'number' && Number.isFinite(args[1]) ? args[1] : null,
  }));
  builtins.set('chart.point.from_time', (args) => ({
    type: 'chart.point',
    time: typeof args[0] === 'number' && Number.isFinite(args[0]) ? args[0] : null,
    index: null,
    price: typeof args[1] === 'number' && Number.isFinite(args[1]) ? args[1] : null,
  }));
  builtins.set('chart.point.copy', (args) => {
    const source = args[0];
    if (!isChartPoint(source)) return Number.NaN;
    return { ...source };
  });
}
