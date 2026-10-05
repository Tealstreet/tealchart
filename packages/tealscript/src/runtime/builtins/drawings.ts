import { PineRuntimeArgumentError } from '../runtimeArgumentError';
import type { BuiltinFunction, BuiltinRegistry } from './registry';
import { pineColorConstant } from '../../pineColorConstants';
import { pineVersionRules } from '../../pineVersionRules';
import {
  getDrawingValue,
  toDrawingId,
  withDrawing,
} from '../drawings/helpers';
import type { ExecutionContext } from '../context';
import { PineTableReference } from '../drawings/store';
import type {
  BoxDrawingOutput,
  ChartPoint,
  LabelDrawingOutput,
  LineFillDrawingOutput,
  LineDrawingOutput,
  PolylineDrawingOutput,
  TableCellDrawingOutput,
  TableDrawingOutput,
} from '../drawings/types';

export interface DrawingBuiltinRuntime {
  raiseRuntimeError(message: string): never;
  isNa(value: unknown): boolean;
  toNullableNumber(value: unknown): number | null;
  toStringValue(value: unknown): string;
  toNumber(value: unknown): number;
  toNullableColor(value: unknown): string | null;
  toOptionalString(value: unknown): string | undefined;
  toLineWidth(value: unknown, allowZero?: boolean): number;
  toDrawingId(value: unknown): string | undefined;
  withLine(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => void): void;
  getLineValue<T>(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => T): T | number;
  interpolateLinePrice(line: LineDrawingOutput, x: number, barIndex: number): number;
}

export interface DrawingRuntimeApproximation {
  site: string;
  message: string;
}

type DrawingRuntimeApproximationReporter = (approximation: DrawingRuntimeApproximation) => void;

const drawingRuntimeApproximationReporters: DrawingRuntimeApproximationReporter[] = [];

export function pushDrawingRuntimeApproximationReporter(reporter: DrawingRuntimeApproximationReporter): () => void {
  drawingRuntimeApproximationReporters.push(reporter);
  return () => {
    const index = drawingRuntimeApproximationReporters.lastIndexOf(reporter);
    if (index >= 0) drawingRuntimeApproximationReporters.splice(index, 1);
  };
}

function reportDrawingRuntimeApproximation(approximation: DrawingRuntimeApproximation): void {
  drawingRuntimeApproximationReporters[drawingRuntimeApproximationReporters.length - 1]?.(approximation);
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

function validateDrawingXCoordinate(ctx: ExecutionContext, xloc: string, x: number | null): number | null {
  if (xloc === 'bar_index' && x !== null && x > ctx.last_bar_index + 500) {
    throw new Error(`Error on bar ${ctx.bar_index}: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future.`);
  }
  return x;
}

function copyPoint(point: ChartPoint): ChartPoint {
  return { ...point };
}

function applyLinePoint(line: LineDrawingOutput, pointValue: unknown, endpoint: 'first' | 'second', ctx: ExecutionContext): void {
  const point = isChartPoint(pointValue) ? pointValue : undefined;
  const x = validateDrawingXCoordinate(ctx, line.xloc, point ? pointX(point, line.xloc) : null);
  const y = point ? point.price : null;

  if (endpoint === 'first') {
    line.x1 = x;
    line.y1 = y;
  } else {
    line.x2 = x;
    line.y2 = y;
  }
}

function applyBoxPoint(box: BoxDrawingOutput, pointValue: unknown, corner: 'topLeft' | 'bottomRight', ctx: ExecutionContext): void {
  const point = isChartPoint(pointValue) ? pointValue : undefined;
  const x = validateDrawingXCoordinate(ctx, box.xloc, point ? pointX(point, box.xloc) : null);
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

function isSameLineFillPair(linefill: LineFillDrawingOutput, line1: string, line2: string): boolean {
  return (
    (linefill.line1 === line1 && linefill.line2 === line2)
    || (linefill.line1 === line2 && linefill.line2 === line1)
  );
}

function optionalString(runtime: DrawingBuiltinRuntime, value: unknown): string | undefined {
  return value === undefined ? undefined : runtime.toStringValue(value);
}

function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined ? undefined : Boolean(value);
}

function tableDimension(runtime: DrawingBuiltinRuntime, value: unknown, argument: 'columns' | 'rows'): number {
  const numeric = runtime.toNumber(value ?? 1);
  if (argument === 'columns' && Number.isInteger(numeric) && numeric < 0) {
    throw new PineRuntimeArgumentError(
      `Invalid value of the 'columns' argument (${numeric}) in the 'table.new' function. It must be >= 0.`,
    );
  }
  const parsed = Math.trunc(numeric);
  const minimum = argument === 'columns' ? 0 : 1;
  if (!Number.isFinite(parsed) || parsed < minimum) {
    const site = `table.new.${argument}-fallback`;
    reportDrawingRuntimeApproximation({
      site,
      message: `${site} was below the supported minimum or nonfinite and fell back to 1; exact TradingView runtime behavior for dynamic invalid table dimensions is trace-required.`,
    });
  }
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : 1;
}

function tableBorderWidth(runtime: DrawingBuiltinRuntime, value: unknown): number {
  if (value === undefined || runtime.isNa(value)) return 0;
  const parsed = Math.trunc(runtime.toNumber(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

const MAX_TABLE_CELLS = 10000;
const PINE_COLOR_BLUE = '#2196F3';
const PINE_COLOR_BLACK = '#363A45';
const PINE_COLOR_WHITE = '#FFFFFF';

function normalizeTableColumn(runtime: DrawingBuiltinRuntime, value: unknown): number {
  return Math.trunc(runtime.toNumber(value));
}

function normalizeTableRow(runtime: DrawingBuiltinRuntime, value: unknown): number {
  return Math.trunc(runtime.toNumber(value));
}

function registerSingleDrawingGetter(
  builtins: BuiltinRegistry,
  name: string,
  read: (value: unknown, ctx: ExecutionContext) => unknown,
): void {
  const builtin: BuiltinFunction = (args, named, ctx) => read(callArg(args, named, 0, 'id'), ctx);
  builtin.positionalSingleArgument = read;
  builtins.set(name, builtin);
}

const labelX = (label: LabelDrawingOutput) => label.x ?? Number.NaN;
const labelY = (label: LabelDrawingOutput) => label.y ?? Number.NaN;
const labelXloc = (label: LabelDrawingOutput) => label.xloc;
const labelYloc = (label: LabelDrawingOutput) => label.yloc;
const labelStyle = (label: LabelDrawingOutput) => label.style;
const labelColor = (label: LabelDrawingOutput) => label.color ?? Number.NaN;
const labelTextcolor = (label: LabelDrawingOutput) => label.textColor ?? Number.NaN;
const labelSize = (label: LabelDrawingOutput) => label.size;
const labelTooltip = (label: LabelDrawingOutput) => label.tooltip ?? '';
const lineX1 = (line: LineDrawingOutput) => line.x1 ?? Number.NaN;
const lineX2 = (line: LineDrawingOutput) => line.x2 ?? Number.NaN;
const lineY2 = (line: LineDrawingOutput) => line.y2 ?? Number.NaN;
const lineColor = (line: LineDrawingOutput) => line.color ?? Number.NaN;
const lineExtend = (line: LineDrawingOutput) => line.extend;
const lineStyle = (line: LineDrawingOutput) => line.style;
const lineWidth = (line: LineDrawingOutput) => line.width;
const boxLeft = (box: BoxDrawingOutput) => box.left ?? Number.NaN;
const boxRight = (box: BoxDrawingOutput) => box.right ?? Number.NaN;
const boxTop = (box: BoxDrawingOutput) => box.top ?? Number.NaN;
const boxBottom = (box: BoxDrawingOutput) => box.bottom ?? Number.NaN;
const boxBgcolor = (box: BoxDrawingOutput) => box.bgcolor ?? Number.NaN;
const boxBorderColor = (box: BoxDrawingOutput) => box.borderColor ?? Number.NaN;
const boxText = (box: BoxDrawingOutput) => box.text;
const boxTextHalign = (box: BoxDrawingOutput) => box.textHalign ?? 'center';
const boxTextValign = (box: BoxDrawingOutput) => box.textValign ?? 'center';

const lineY1 = (line: LineDrawingOutput): number => line.y1 ?? Number.NaN;
const labelText = (label: LabelDrawingOutput): string => label.text;

function callArg(
  args: unknown[],
  namedArgs: Map<string, unknown>,
  index: number,
  name: string,
  fallback?: unknown,
  priorNames: readonly string[] = [],
): unknown {
  let positionalIndex = index;
  for (const priorName of priorNames) {
    if (namedArgs.has(priorName)) positionalIndex -= 1;
  }
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
  if (name && namedArgs.has(name)) return namedArgs.get(name);
  let positionalIndex = index;
  for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
    if (namedArgs.has(names[priorIndex])) positionalIndex -= 1;
  }
  return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
}

export function registerDrawingObjectCastBuiltins(builtins: BuiltinRegistry): void {
  for (const kind of ['box', 'label', 'line', 'linefill', 'table']) {
    builtins.set(kind, (args, namedArgs, ctx) => {
      const value = callArg(args, namedArgs, 0, 'x', Number.NaN);
      if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) return value;
      if (kind === 'table' && value instanceof PineTableReference && ctx.getDrawingReferenceType(value.id) === kind) return value;
      if (kind !== 'table' && typeof value === 'string' && ctx.getDrawingReferenceType(value) === kind) return value;
      throw new TypeError(`${kind} x requires ${kind} reference`);
    });
  }
}

export function registerLabelBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime, pineVersion = 6): void {
  const defaultTextColor = pineVersionRules(pineVersion).usesV6DefaultColors ? PINE_COLOR_WHITE : '#000000';
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
    const textFontFamily = usesLegacyForceOverlaySlot ? undefined : optionalString(runtime, textFontFamilyOrLegacyForceOverlay ?? 'default');
    const forceOverlay = optionalBoolean(
      usesLegacyForceOverlaySlot ? textFontFamilyOrLegacyForceOverlay : orderedCallArg(args, namedArgs, parameterNames, forceOverlayIndex, false),
    );
    const textFormatting = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, textFormattingIndex, 'none'));
    const textAlign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 8 : 9, 'center'));
    const drawing: LabelDrawingOutput = {
      id,
      type: 'label',
      barIndex: ctx.bar_index,
      x,
      y,
      text,
      xloc,
      yloc: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 3 : 4, 'price')),
      style: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 5 : 6, 'label_down')),
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 5, PINE_COLOR_BLUE)),
      textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 6 : 7, defaultTextColor)),
      size: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 7 : 8, 'normal')),
      tooltip: runtime.toOptionalString(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 9 : 10)),
    };
    if (textAlign !== undefined) drawing.textAlign = textAlign;
    if (textFontFamily !== undefined) drawing.textFontFamily = textFontFamily;
    if (textFormatting !== undefined) drawing.textFormatting = textFormatting;
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    validateDrawingXCoordinate(ctx, xloc, x);
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
      label.x = validateDrawingXCoordinate(ctx, label.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
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
      label.x = validateDrawingXCoordinate(ctx, label.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
      label.y = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_point', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'label', runtime.isNa, (label) => {
      const point = callArg(args, namedArgs, 1, 'point', undefined, ['id']);
      if (isChartPoint(point)) {
        label.x = validateDrawingXCoordinate(ctx, label.xloc, pointX(point, label.xloc));
        label.y = point.price;
      } else {
        label.x = null;
        label.y = null;
      }
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
      const xloc = runtime.toStringValue(callArg(args, namedArgs, 2, 'xloc', undefined, ['id', 'x']));
      label.x = validateDrawingXCoordinate(ctx, xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
      label.xloc = xloc;
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
      const size = callArg(args, namedArgs, 1, 'size', undefined, ['id']);
      if (typeof size === 'number' && size < 0) {
        runtime.raiseRuntimeError(`Error on bar ${ctx.bar_index}: Invalid value of the 'size' argument (${size}) in the 'label.set_size' function. It must be >= 0.`);
      }
      label.size = runtime.toStringValue(size);
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

  registerSingleDrawingGetter(builtins, 'label.get_x', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelX));
  registerSingleDrawingGetter(builtins, 'label.get_y', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelY));
  registerSingleDrawingGetter(builtins, 'label.get_text', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelText));
  registerSingleDrawingGetter(builtins, 'label.get_xloc', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelXloc));
  registerSingleDrawingGetter(builtins, 'label.get_yloc', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelYloc));
  registerSingleDrawingGetter(builtins, 'label.get_style', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelStyle));
  registerSingleDrawingGetter(builtins, 'label.get_color', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelColor));
  registerSingleDrawingGetter(builtins, 'label.get_textcolor', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelTextcolor));
  registerSingleDrawingGetter(builtins, 'label.get_size', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelSize));
  registerSingleDrawingGetter(builtins, 'label.get_tooltip', (value, ctx) => getDrawingValue(value, ctx, 'label', runtime.isNa, labelTooltip));
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

    validateDrawingXCoordinate(ctx, xloc, x1);
    validateDrawingXCoordinate(ctx, xloc, x2);
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
      color: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 6, PINE_COLOR_BLUE)),
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
      line.x1 = validateDrawingXCoordinate(ctx, line.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_x2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = validateDrawingXCoordinate(ctx, line.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
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
      line.x1 = validateDrawingXCoordinate(ctx, line.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
      line.y1 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy2', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      line.x2 = validateDrawingXCoordinate(ctx, line.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id'])));
      line.y2 = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'y', undefined, ['id', 'x']));
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_first_point', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      applyLinePoint(line, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'first', ctx);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_second_point', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      applyLinePoint(line, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'second', ctx);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xloc', (args, namedArgs, ctx) => {
    runtime.withLine(callArg(args, namedArgs, 0, 'id'), ctx, (line) => {
      const xloc = runtime.toStringValue(callArg(args, namedArgs, 3, 'xloc', undefined, ['id', 'x1', 'x2']));
      line.x1 = validateDrawingXCoordinate(ctx, xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'x1', undefined, ['id'])));
      line.x2 = validateDrawingXCoordinate(ctx, xloc, runtime.toNullableNumber(callArg(args, namedArgs, 2, 'x2', undefined, ['id', 'x1'])));
      line.xloc = xloc;
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

  registerSingleDrawingGetter(builtins, 'line.get_x1', (value, ctx) => runtime.getLineValue(value, ctx, lineX1));
  registerSingleDrawingGetter(builtins, 'line.get_x2', (value, ctx) => runtime.getLineValue(value, ctx, lineX2));
  registerSingleDrawingGetter(builtins, 'line.get_y1', (value, ctx) => runtime.getLineValue(value, ctx, lineY1));
  registerSingleDrawingGetter(builtins, 'line.get_y2', (value, ctx) => runtime.getLineValue(value, ctx, lineY2));
  registerSingleDrawingGetter(builtins, 'line.get_color', (value, ctx) => runtime.getLineValue(value, ctx, lineColor));
  registerSingleDrawingGetter(builtins, 'line.get_extend', (value, ctx) => runtime.getLineValue(value, ctx, lineExtend));
  registerSingleDrawingGetter(builtins, 'line.get_style', (value, ctx) => runtime.getLineValue(value, ctx, lineStyle));
  registerSingleDrawingGetter(builtins, 'line.get_width', (value, ctx) => runtime.getLineValue(value, ctx, lineWidth));
  builtins.set('line.get_price', (args, namedArgs, ctx) => {
    const x = runtime.toNumber(callArg(args, namedArgs, 1, 'x', undefined, ['id']));
    return runtime.getLineValue(callArg(args, namedArgs, 0, 'id'), ctx, (line) => runtime.interpolateLinePrice(line, x, ctx.bar_index));
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
    const duplicateIds = ctx
      .getDrawings()
      .filter((existing): existing is LineFillDrawingOutput => (
        existing.type === 'linefill' && isSameLineFillPair(existing, line1, line2)
      ))
      .map((existing) => existing.id);
    for (const duplicateId of duplicateIds) {
      ctx.deleteDrawing(duplicateId);
    }

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
  builtins.set('linefill.get_color', (args, namedArgs, ctx) => getDrawingValue(callArg(args, namedArgs, 0, 'id'), ctx, 'linefill', runtime.isNa, (linefill) => linefill.color ?? Number.NaN));

  builtins.set('linefill.copy', (args, namedArgs, ctx, _scope, callId) => {
    const linefillId = toDrawingId(callArg(args, namedArgs, 0, 'id'), runtime.isNa);
    if (!linefillId) return Number.NaN;

    const newId = `linefill_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyLineFillDrawing(linefillId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('linefill.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('linefill'));
}

export function registerBoxBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime, pineVersion = 6): void {
  const defaultBlue = pineColorConstant('blue', pineVersion)!;
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

    const textHalign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 11 : 13, 'center'));
    const textValign = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 12 : 14, 'center'));
    const textWrap = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 13 : 15, 'none'));
    const textFontFamily = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 14 : 16, 'default'));
    const forceOverlay = optionalBoolean(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 15 : 17, false));
    const textFormatting = optionalString(runtime, orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 16 : 18, 'none'));
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
      borderColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 2 : 4, defaultBlue)),
      borderWidth: runtime.toLineWidth(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 3 : 5), true),
      borderStyle: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 4 : 6, 'solid')),
      extend: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 5 : 7, 'none')),
      xloc,
      bgcolor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 7 : 9, defaultBlue)),
      text: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 8 : 10, '')),
      textSize: runtime.toStringValue(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 9 : 11, 'auto')),
      textColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, parameterNames, usesPointOverload ? 10 : 12, PINE_COLOR_BLACK)),
    };
    if (textHalign !== undefined) drawing.textHalign = textHalign;
    if (textValign !== undefined) drawing.textValign = textValign;
    if (textWrap !== undefined) drawing.textWrap = textWrap;
    if (textFontFamily !== undefined) drawing.textFontFamily = textFontFamily;
    if (textFormatting !== undefined) drawing.textFormatting = textFormatting;
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    validateDrawingXCoordinate(ctx, xloc, drawing.left);
    validateDrawingXCoordinate(ctx, xloc, drawing.right);
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
      box.left = validateDrawingXCoordinate(ctx, box.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id'])));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_right', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = validateDrawingXCoordinate(ctx, box.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right', undefined, ['id'])));
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
      box.left = validateDrawingXCoordinate(ctx, box.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id'])));
      box.top = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'top', undefined, ['id', 'left']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_rightbottom', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      box.right = validateDrawingXCoordinate(ctx, box.xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'right', undefined, ['id'])));
      box.bottom = runtime.toNullableNumber(callArg(args, namedArgs, 2, 'bottom', undefined, ['id', 'right']));
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_xloc', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      const xloc = runtime.toStringValue(callArg(args, namedArgs, 3, 'xloc', undefined, ['id', 'left', 'right']));
      box.left = validateDrawingXCoordinate(ctx, xloc, runtime.toNullableNumber(callArg(args, namedArgs, 1, 'left', undefined, ['id'])));
      box.right = validateDrawingXCoordinate(ctx, xloc, runtime.toNullableNumber(callArg(args, namedArgs, 2, 'right', undefined, ['id', 'left'])));
      box.xloc = xloc;
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_top_left_point', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      applyBoxPoint(box, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'topLeft', ctx);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bottom_right_point', (args, namedArgs, ctx) => {
    withDrawing(callArg(args, namedArgs, 0, 'id'), ctx, 'box', runtime.isNa, (box) => {
      applyBoxPoint(box, callArg(args, namedArgs, 1, 'point', undefined, ['id']), 'bottomRight', ctx);
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
      box.borderWidth = runtime.toLineWidth(callArg(args, namedArgs, 1, 'width', undefined, ['id']), true);
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
      box.textSize = runtime.toStringValue(callArg(args, namedArgs, 1, 'text_size', undefined, ['id']));
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

  registerSingleDrawingGetter(builtins, 'box.get_left', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxLeft));
  registerSingleDrawingGetter(builtins, 'box.get_right', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxRight));
  registerSingleDrawingGetter(builtins, 'box.get_top', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxTop));
  registerSingleDrawingGetter(builtins, 'box.get_bottom', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxBottom));
  registerSingleDrawingGetter(builtins, 'box.get_bgcolor', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxBgcolor));
  registerSingleDrawingGetter(builtins, 'box.get_border_color', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxBorderColor));
  registerSingleDrawingGetter(builtins, 'box.get_text', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxText));
  registerSingleDrawingGetter(builtins, 'box.get_text_halign', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxTextHalign));
  registerSingleDrawingGetter(builtins, 'box.get_text_valign', (value, ctx) => getDrawingValue(value, ctx, 'box', runtime.isNa, boxTextValign));
  builtins.set('box.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('box'));
}

export function registerPolylineBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime, pineVersion = 6): void {
  const defaultBlue = pineColorConstant('blue', pineVersion)!;
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
      lineColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, polylineNewArgs, 4, defaultBlue)),
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

export function registerTableBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime, pineVersion = 6): void {
  const tableNewArgs = [
    'position',
    'columns',
    'rows',
    'bgcolor',
    'frame_color',
    'frame_width',
    'border_color',
    'border_width',
    'force_overlay',
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
    'tooltip',
    'text_font_family',
    'text_formatting',
  ] as const;
  const withTable = (value: unknown, ctx: ExecutionContext, fn: (table: TableDrawingOutput) => void): void => {
    withDrawing(value, ctx, 'table', runtime.isNa, fn);
  };
  const tableCellCapacity = (table: Pick<TableDrawingOutput, 'columns' | 'rows'>): number => table.columns * table.rows;
  const assertTableCellCapacity = (
    ctx: ExecutionContext,
    table: Pick<TableDrawingOutput, 'columns' | 'rows' | 'position'>,
  ): void => {
    const nextCells = tableCellCapacity(table);
    const currentCells = ctx
      .getDrawings()
      .filter((drawing): drawing is TableDrawingOutput => drawing.type === 'table' && drawing.position !== table.position)
      .reduce((sum, drawing) => sum + tableCellCapacity(drawing), 0);

    if (nextCells + currentCells > MAX_TABLE_CELLS) {
      throw new Error(`Too many table cells: maximum is ${MAX_TABLE_CELLS} per script. Reduce table.new() rows or columns, or reuse an existing table instead of creating more table cells.`);
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
  type TableCellIndex = {
    cells: TableCellDrawingOutput[];
    length: number;
    positions: Map<number, number>;
  };
  const cellIndexes = new WeakMap<TableDrawingOutput, TableCellIndex>();
  const cellIndex = (table: TableDrawingOutput): TableCellIndex => {
    let state = cellIndexes.get(table);
    if (!state || state.cells !== table.cells || state.length !== table.cells.length) {
      const positions = new Map<number, number>();
      table.cells.forEach((cell, index) => {
        const key = cell.row * table.columns + cell.column;
        if (!positions.has(key)) positions.set(key, index);
      });
      state = { cells: table.cells, length: table.cells.length, positions };
      cellIndexes.set(table, state);
    }
    return state;
  };
  const upsertCell = (table: TableDrawingOutput, cell: TableCellDrawingOutput): void => {
    const state = cellIndex(table);
    const key = cell.row * table.columns + cell.column;
    const index = state.positions.get(key);
    if (index === undefined) {
      state.positions.set(key, table.cells.length);
      table.cells.push(cell);
      state.length = table.cells.length;
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
    if (table.columns === 0) {
      throw new PineRuntimeArgumentError(
        `Column ${normalizedColumn} is out of table bounds, number of columns is 0.`,
        'RE10039',
      );
    }
    if (
      !Number.isFinite(normalizedColumn)
      || !Number.isFinite(normalizedRow)
      || normalizedColumn < 0
      || normalizedColumn >= table.columns
      || normalizedRow < 0
      || normalizedRow >= table.rows
    ) {
      throw new Error(`Table cell coordinates out of bounds: column ${normalizedColumn}, row ${normalizedRow}. This table has columns 0-${table.columns - 1} and rows 0-${table.rows - 1}.`);
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

    if (start.column > end.column || start.row > end.row) {
      throw new PineRuntimeArgumentError(
        `Start cell in [${start.column}, ${start.row}] cannot be below or to the right of the end cell [${end.column}, ${end.row}].`,
        'RE10127',
      );
    }
    return {
      startColumn: start.column,
      startRow: start.row,
      endColumn: end.column,
      endRow: end.row,
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
    const columns = tableDimension(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 1), 'columns');
    const rows = tableDimension(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 2), 'rows');
    const position = runtime.toStringValue(orderedCallArg(args, namedArgs, tableNewArgs, 0, 'top_right'));
    assertTableCellCapacity(ctx, { columns, rows, position });

    const drawing: TableDrawingOutput = {
      id,
      type: 'table',
      creationSite: callId,
      barIndex: ctx.bar_index,
      position,
      columns,
      rows,
      bgcolor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 3)),
      frameColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 4)),
      frameWidth: tableBorderWidth(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 5)),
      borderColor: runtime.toNullableColor(orderedCallArg(args, namedArgs, tableNewArgs, 6)),
      borderWidth: tableBorderWidth(runtime, orderedCallArg(args, namedArgs, tableNewArgs, 7)),
      cells: [],
    };
    const forceOverlay = optionalBoolean(orderedCallArg(args, namedArgs, tableNewArgs, 8, false));
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    for (const previous of ctx.getDrawings()) {
      if (previous.type === 'table' && previous.position === position) ctx.deleteDrawing(previous.id);
    }
    ctx.addDrawing(drawing);
    return ctx.getTableReference(id);
  });

  builtins.set('__resolveTableReference', (args, _namedArgs, ctx) => ctx.resolveTableReference(args[0]));

  builtins.set('table.delete', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => ctx.deleteDrawing(table.id));
    return undefined;
  });

  builtins.set('table.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('table').map((id) => ctx.getTableReference(id)));

  builtins.set('table.clear', (args, namedArgs, ctx) => {
    withTable(callArg(args, namedArgs, 0, 'table_id'), ctx, (table) => {
      const startColumn = normalizeTableColumn(runtime, callArg(args, namedArgs, 1, 'start_column', 0, ['table_id']));
      const startRow = normalizeTableRow(runtime, callArg(args, namedArgs, 2, 'start_row', 0, ['table_id', 'start_column']));
      const endColumnArg = callArg(args, namedArgs, 3, 'end_column', undefined, ['table_id', 'start_column', 'start_row']);
      const endRowArg = callArg(args, namedArgs, 4, 'end_row', undefined, ['table_id', 'start_column', 'start_row', 'end_column']);
      const endColumn = (namedArgs.has('end_column') || endColumnArg !== undefined)
        ? normalizeTableColumn(runtime, endColumnArg)
        : startColumn;
      const endRow = (namedArgs.has('end_row') || endRowArg !== undefined)
        ? normalizeTableRow(runtime, endRowArg)
        : startRow;
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
      const overlappingRange = table.mergedCells?.find((mergedCell) => mergedCellRangesOverlap(mergedCell, range));
      if (overlappingRange) {
        // Native v3 scalar-07 accepts identical repeated merges without a reset.
        // Preserve the existing range rather than adding duplicate topology.
        if (overlappingRange.startColumn === range.startColumn
          && overlappingRange.startRow === range.startRow
          && overlappingRange.endColumn === range.endColumn
          && overlappingRange.endRow === range.endRow) {
          delete overlappingRange.anchorRedefinedSinceMerge;
          return;
        }
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
      table.frameWidth = tableBorderWidth(runtime, callArg(args, namedArgs, 1, 'frame_width', undefined, ['table_id']));
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
      table.borderWidth = tableBorderWidth(runtime, callArg(args, namedArgs, 1, 'border_width', undefined, ['table_id']));
    });
    return undefined;
  });

  const tableCellDefaults: readonly unknown[] = [
    undefined, undefined, undefined, '', undefined, undefined, PINE_COLOR_BLACK,
    'center', 'center', 'normal', undefined, undefined, 'default', 'none',
  ];

  builtins.set('table.cell', (args, namedArgs, ctx) => {
    const values: unknown[] = [];
    let positionalIndex = 0;
    for (let index = 0; index < tableCellArgs.length; index += 1) {
      const name = tableCellArgs[index];
      if (namedArgs.has(name)) {
        values.push(namedArgs.get(name));
      } else {
        const value = args[positionalIndex++];
        values.push(value !== undefined ? value : tableCellDefaults[index]);
      }
    }
    const argument = (index: number, fallback?: unknown): unknown =>
      namedArgs.has(tableCellArgs[index]) || values[index] !== undefined ? values[index] : fallback;
    withTable(argument(0), ctx, (table) => {
      const rowValue = argument(2);
      const rowArgument = pineVersionRules(pineVersion).normalizesNaTableCellRow && Number.isNaN(rowValue)
        ? 0
        : rowValue;
      const { column, row } = normalizeCellCoordinates(table, argument(1), rowArgument);
      const textFontFamily = optionalString(runtime, argument(12, 'default'));
      const textFormatting = optionalString(runtime, argument(13, 'none'));
      const tooltip = runtime.toOptionalString(argument(11));
      const cell: TableCellDrawingOutput = {
        column,
        row,
        text: runtime.toStringValue(values[3]),
        width: namedArgs.has('width') || values[4] !== undefined ? runtime.toNullableNumber(values[4]) : undefined,
        height:
          namedArgs.has('height') || values[5] !== undefined ? runtime.toNullableNumber(values[5]) : undefined,
        textColor: runtime.toNullableColor(values[6]),
        textHalign: runtime.toStringValue(values[7]),
        textValign: runtime.toStringValue(values[8]),
        textSize: runtime.toStringValue(values[9]),
        bgcolor: runtime.toNullableColor(values[10]),
      };
      if (textFontFamily !== undefined) cell.textFontFamily = textFontFamily;
      if (textFormatting !== undefined) cell.textFormatting = textFormatting;
      if (tooltip !== undefined) cell.tooltip = tooltip;
      upsertCell(table, cell);
      for (const range of table.mergedCells ?? []) {
        if (range.startColumn === cell.column && range.startRow === cell.row) {
          range.anchorRedefinedSinceMerge = true;
        }
      }
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
      cell.textSize = runtime.toStringValue(callArg(args, namedArgs, 3, 'text_size', 'normal', ['table_id', 'column', 'row']));
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
  'label.style_label_center': 'label_center',
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
  'label.style_text_outline': 'text_outline',
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
    const price = callArg(args, namedArgs, 0, 'price', ctx.close.get(0));
    const currentTime = ctx.time.get(0);
    return {
      type: 'chart.point',
      time: typeof currentTime === 'number' && Number.isFinite(currentTime) ? currentTime : null,
      index: ctx.bar_index,
      price: typeof price === 'number' && Number.isFinite(price)
        ? price
        : null,
    };
  });
  builtins.set('chart.point.from_index', (args, namedArgs) => {
    const index = callArg(args, namedArgs, 0, 'index');
    const price = callArg(args, namedArgs, 1, 'price', undefined, ['index']);
    return {
      type: 'chart.point',
      time: null,
      index: typeof index === 'number' && Number.isFinite(index) ? index : null,
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
