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

export function registerLabelBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  builtins.set('label.new', (args, namedArgs, ctx, _scope, callId) => {
    const x = runtime.toNullableNumber(namedArgs.get('x') ?? args[0]);
    const y = runtime.toNullableNumber(namedArgs.get('y') ?? args[1]);
    const text = runtime.toStringValue(namedArgs.get('text') ?? args[2] ?? '');
    const id = `label_${callId}_${ctx.bar_index}`;

    const forceOverlay = optionalBoolean(namedArgs.get('force_overlay') ?? args[11]);
    const drawing: LabelDrawingOutput = {
      id,
      type: 'label',
      barIndex: ctx.bar_index,
      x,
      y,
      text,
      xloc: runtime.toStringValue(namedArgs.get('xloc') ?? 'bar_index'),
      yloc: runtime.toStringValue(namedArgs.get('yloc') ?? 'price'),
      style: runtime.toStringValue(namedArgs.get('style') ?? 'label_left'),
      color: runtime.toNullableColor(namedArgs.get('color')),
      textColor: runtime.toNullableColor(namedArgs.get('textcolor')),
      size: runtime.toStringValue(namedArgs.get('size') ?? 'normal'),
      tooltip: runtime.toOptionalString(namedArgs.get('tooltip') ?? args[10]),
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
  builtins.set('line.new', (args, namedArgs, ctx, _scope, callId) => {
    const firstPoint = namedArgs.get('first_point') ?? args[0];
    const secondPoint = namedArgs.get('second_point') ?? args[1];
    const usesPointOverload = isChartPoint(firstPoint) && isChartPoint(secondPoint);
    const pointArgOffset = usesPointOverload ? 2 : 4;
    const xloc = runtime.toStringValue(namedArgs.get('xloc') ?? args[pointArgOffset] ?? 'bar_index');
    const x1 = usesPointOverload
      ? pointX(firstPoint, xloc)
      : runtime.toNullableNumber(namedArgs.get('x1') ?? args[0]);
    const y1 = usesPointOverload
      ? firstPoint.price
      : runtime.toNullableNumber(namedArgs.get('y1') ?? args[1]);
    const x2 = usesPointOverload
      ? pointX(secondPoint, xloc)
      : runtime.toNullableNumber(namedArgs.get('x2') ?? args[2]);
    const y2 = usesPointOverload
      ? secondPoint.price
      : runtime.toNullableNumber(namedArgs.get('y2') ?? args[3]);
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
      extend: runtime.toStringValue(namedArgs.get('extend') ?? args[pointArgOffset + 1] ?? 'none'),
      color: runtime.toNullableColor(namedArgs.get('color') ?? args[pointArgOffset + 2]),
      style: runtime.toStringValue(namedArgs.get('style') ?? args[pointArgOffset + 3] ?? 'solid'),
      width: runtime.toLineWidth(namedArgs.get('width') ?? args[pointArgOffset + 4]),
      forceOverlay: Boolean(namedArgs.get('force_overlay') ?? args[pointArgOffset + 5] ?? false),
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
  builtins.set('linefill.new', (args, namedArgs, ctx, _scope, callId) => {
    const line1 = runtime.toDrawingId(namedArgs.get('line1') ?? args[0]);
    const line2 = runtime.toDrawingId(namedArgs.get('line2') ?? args[1]);
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
      color: runtime.toNullableColor(namedArgs.get('color') ?? args[2]),
    });

    return id;
  });

  builtins.set('linefill.delete', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'linefill', runtime.isNa, (linefill) => ctx.deleteDrawing(linefill.id));
    return undefined;
  });

  builtins.set('linefill.set_color', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'linefill', runtime.isNa, (linefill) => {
      linefill.color = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });

  builtins.set('linefill.get_line1', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'linefill', runtime.isNa, (linefill) => linefill.line1));
  builtins.set('linefill.get_line2', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'linefill', runtime.isNa, (linefill) => linefill.line2));
  builtins.set('linefill.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('linefill'));
}

export function registerBoxBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  builtins.set('box.new', (args, namedArgs, ctx, _scope, callId) => {
    const id = `box_${callId}_${ctx.bar_index}`;
    const topLeft = namedArgs.get('top_left') ?? args[0];
    const bottomRight = namedArgs.get('bottom_right') ?? args[1];
    const usesPointOverload = isChartPoint(topLeft) && isChartPoint(bottomRight);
    const pointArgOffset = usesPointOverload ? 2 : 4;
    const xloc = runtime.toStringValue(namedArgs.get('xloc') ?? args[pointArgOffset + 4] ?? 'bar_index');

    const textHalign = optionalString(runtime, namedArgs.get('text_halign') ?? args[pointArgOffset + 9]);
    const textValign = optionalString(runtime, namedArgs.get('text_valign') ?? args[pointArgOffset + 10]);
    const textWrap = optionalString(runtime, namedArgs.get('text_wrap') ?? args[pointArgOffset + 11]);
    const textFontFamily = optionalString(runtime, namedArgs.get('text_font_family') ?? args[pointArgOffset + 12]);
    const forceOverlay = optionalBoolean(namedArgs.get('force_overlay') ?? args[pointArgOffset + 13]);
    const drawing: BoxDrawingOutput = {
      id,
      type: 'box',
      barIndex: ctx.bar_index,
      left: usesPointOverload
        ? pointX(topLeft, xloc)
        : runtime.toNullableNumber(namedArgs.get('left') ?? args[0]),
      top: usesPointOverload
        ? topLeft.price
        : runtime.toNullableNumber(namedArgs.get('top') ?? args[1]),
      right: usesPointOverload
        ? pointX(bottomRight, xloc)
        : runtime.toNullableNumber(namedArgs.get('right') ?? args[2]),
      bottom: usesPointOverload
        ? bottomRight.price
        : runtime.toNullableNumber(namedArgs.get('bottom') ?? args[3]),
      borderColor: runtime.toNullableColor(namedArgs.get('border_color') ?? args[pointArgOffset]),
      borderWidth: runtime.toLineWidth(namedArgs.get('border_width') ?? args[pointArgOffset + 1]),
      borderStyle: runtime.toStringValue(namedArgs.get('border_style') ?? args[pointArgOffset + 2] ?? 'solid'),
      extend: runtime.toStringValue(namedArgs.get('extend') ?? args[pointArgOffset + 3] ?? 'none'),
      xloc,
      bgcolor: runtime.toNullableColor(namedArgs.get('bgcolor') ?? args[pointArgOffset + 5]),
      text: runtime.toStringValue(namedArgs.get('text') ?? args[pointArgOffset + 6] ?? ''),
      textSize: runtime.toStringValue(namedArgs.get('text_size') ?? args[pointArgOffset + 7] ?? 'normal'),
      textColor: runtime.toNullableColor(namedArgs.get('text_color') ?? args[pointArgOffset + 8]),
    };
    if (textHalign !== undefined) drawing.textHalign = textHalign;
    if (textValign !== undefined) drawing.textValign = textValign;
    if (textWrap !== undefined) drawing.textWrap = textWrap;
    if (textFontFamily !== undefined) drawing.textFontFamily = textFontFamily;
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    ctx.addDrawing(drawing);

    return id;
  });

  builtins.set('box.delete', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => ctx.deleteDrawing(box.id));
    return undefined;
  });

  builtins.set('box.copy', (args, _namedArgs, ctx, _scope, callId) => {
    const boxId = runtime.toDrawingId(args[0]);
    if (!boxId) return Number.NaN;

    const newId = `box_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyBoxDrawing(boxId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('box.set_left', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(args[1]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_right', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(args[1]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_top', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.top = runtime.toNullableNumber(args[1]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bottom', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.bottom = runtime.toNullableNumber(args[1]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_lefttop', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.left = runtime.toNullableNumber(args[1]);
      box.top = runtime.toNullableNumber(args[2]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_rightbottom', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.right = runtime.toNullableNumber(args[1]);
      box.bottom = runtime.toNullableNumber(args[2]);
      box.barIndex = ctx.bar_index;
    });
    return undefined;
  });
  builtins.set('box.set_bgcolor', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.bgcolor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_border_color', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.borderColor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_border_width', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.borderWidth = runtime.toLineWidth(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_border_style', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.borderStyle = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_extend', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.extend = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.text = runtime.toStringValue(args[1] ?? '');
    });
    return undefined;
  });
  builtins.set('box.set_text_color', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textColor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text_size', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textSize = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text_halign', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textHalign = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text_valign', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textValign = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text_wrap', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textWrap = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('box.set_text_font_family', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'box', runtime.isNa, (box) => {
      box.textFontFamily = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('box.get_left', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.left ?? Number.NaN));
  builtins.set('box.get_right', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.right ?? Number.NaN));
  builtins.set('box.get_top', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.top ?? Number.NaN));
  builtins.set('box.get_bottom', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.bottom ?? Number.NaN));
  builtins.set('box.get_bgcolor', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.bgcolor ?? Number.NaN));
  builtins.set('box.get_border_color', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.borderColor ?? Number.NaN));
  builtins.set('box.get_text', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.text));
  builtins.set('box.get_text_halign', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.textHalign ?? 'left'));
  builtins.set('box.get_text_valign', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'box', runtime.isNa, (box) => box.textValign ?? 'top'));
  builtins.set('box.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('box'));
}

export function registerPolylineBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  builtins.set('polyline.new', (args, namedArgs, ctx, _scope, callId) => {
    const points = chartPointArrayValues(namedArgs.get('points') ?? args[0]);
    if (points.length === 0) return Number.NaN;

    const id = `polyline_${callId}_${ctx.bar_index}`;
    const forceOverlay = optionalBoolean(namedArgs.get('force_overlay') ?? args[8]);
    const drawing: PolylineDrawingOutput = {
      id,
      type: 'polyline',
      barIndex: ctx.bar_index,
      points,
      curved: Boolean(namedArgs.get('curved') ?? args[1] ?? false),
      closed: Boolean(namedArgs.get('closed') ?? args[2] ?? false),
      xloc: runtime.toStringValue(namedArgs.get('xloc') ?? args[3] ?? 'bar_index'),
      lineColor: runtime.toNullableColor(namedArgs.get('line_color') ?? args[4]),
      fillColor: runtime.toNullableColor(namedArgs.get('fill_color') ?? args[5]),
      lineStyle: runtime.toStringValue(namedArgs.get('line_style') ?? args[6] ?? 'solid'),
      lineWidth: runtime.toLineWidth(namedArgs.get('line_width') ?? args[7]),
    };
    if (forceOverlay !== undefined) drawing.forceOverlay = forceOverlay;

    ctx.addDrawing(drawing);
    return id;
  });

  builtins.set('polyline.delete', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'polyline', runtime.isNa, (polyline) => ctx.deleteDrawing(polyline.id));
    return undefined;
  });

  builtins.set('polyline.copy', (args, _namedArgs, ctx, _scope, callId) => {
    const polylineId = runtime.toDrawingId(args[0]);
    if (!polylineId) return Number.NaN;

    const newId = `polyline_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyPolylineDrawing(polylineId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('polyline.all', (_args, _namedArgs, ctx) => ctx.getDrawingIds('polyline'));
}

export function registerTableBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
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
    const columns = positiveInteger(runtime, namedArgs.get('columns') ?? args[1], 1);
    const rows = positiveInteger(runtime, namedArgs.get('rows') ?? args[2], 1);
    assertTableCellCapacity(ctx, { columns, rows });

    const drawing: TableDrawingOutput = {
      id,
      type: 'table',
      barIndex: ctx.bar_index,
      position: runtime.toStringValue(namedArgs.get('position') ?? args[0] ?? 'top_right'),
      columns,
      rows,
      bgcolor: runtime.toNullableColor(namedArgs.get('bgcolor') ?? args[3]),
      frameColor: runtime.toNullableColor(namedArgs.get('frame_color') ?? args[4]),
      frameWidth: runtime.toLineWidth(namedArgs.get('frame_width') ?? args[5]),
      borderColor: runtime.toNullableColor(namedArgs.get('border_color') ?? args[6]),
      borderWidth: runtime.toLineWidth(namedArgs.get('border_width') ?? args[7]),
      cells: [],
    };

    ctx.addDrawing(drawing);
    return id;
  });

  builtins.set('table.delete', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => ctx.deleteDrawing(table.id));
    return undefined;
  });

  builtins.set('table.clear', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const startColumn = normalizeTableColumn(runtime, args[1] ?? 0);
      const startRow = normalizeTableRow(runtime, args[2] ?? 0);
      const endColumn = args[3] === undefined ? table.columns - 1 : normalizeTableColumn(runtime, args[3]);
      const endRow = args[4] === undefined ? table.rows - 1 : normalizeTableRow(runtime, args[4]);
      table.cells = table.cells.filter((cell) => (
        cell.column < startColumn
        || cell.column > endColumn
        || cell.row < startRow
        || cell.row > endRow
      ));
    });
    return undefined;
  });

  builtins.set('table.set_position', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.position = runtime.toStringValue(args[1]);
    });
    return undefined;
  });
  builtins.set('table.set_bgcolor', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.bgcolor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('table.set_frame_color', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.frameColor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('table.set_frame_width', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.frameWidth = runtime.toLineWidth(args[1]);
    });
    return undefined;
  });
  builtins.set('table.set_border_color', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.borderColor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });
  builtins.set('table.set_border_width', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      table.borderWidth = runtime.toLineWidth(args[1]);
    });
    return undefined;
  });

  builtins.set('table.cell', (args, namedArgs, ctx) => {
    withTable(namedArgs.get('table_id') ?? args[0], ctx, (table) => {
      const { column, row } = normalizeCellCoordinates(table, namedArgs.get('column') ?? args[1], namedArgs.get('row') ?? args[2]);
      const textFontFamily = optionalString(runtime, namedArgs.get('text_font_family') ?? args[11]);
      const textFormatting = optionalString(runtime, namedArgs.get('text_formatting') ?? args[12]);
      const cell: TableCellDrawingOutput = {
        column,
        row,
        text: runtime.toStringValue(namedArgs.get('text') ?? args[3] ?? ''),
        width: namedArgs.has('width') || args[4] !== undefined
          ? runtime.toNullableNumber(namedArgs.get('width') ?? args[4])
          : undefined,
        height: namedArgs.has('height') || args[5] !== undefined
          ? runtime.toNullableNumber(namedArgs.get('height') ?? args[5])
          : undefined,
        textColor: runtime.toNullableColor(namedArgs.get('text_color') ?? args[6]),
        textHalign: runtime.toStringValue(namedArgs.get('text_halign') ?? args[7] ?? 'center'),
        textValign: runtime.toStringValue(namedArgs.get('text_valign') ?? args[8] ?? 'middle'),
        textSize: runtime.toStringValue(namedArgs.get('text_size') ?? args[9] ?? 'normal'),
        bgcolor: runtime.toNullableColor(namedArgs.get('bgcolor') ?? args[10]),
      };
      if (textFontFamily !== undefined) cell.textFontFamily = textFontFamily;
      if (textFormatting !== undefined) cell.textFormatting = textFormatting;
      upsertCell(table, cell);
    });
    return undefined;
  });

  builtins.set('table.cell_set_text', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.text = runtime.toStringValue(args[3] ?? '');
    });
    return undefined;
  });
  builtins.set('table.cell_set_bgcolor', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.bgcolor = runtime.toNullableColor(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_color', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textColor = runtime.toNullableColor(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_size', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textSize = runtime.toStringValue(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_width', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.width = runtime.toNullableNumber(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_height', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.height = runtime.toNullableNumber(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_halign', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textHalign = runtime.toStringValue(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_valign', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textValign = runtime.toStringValue(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_font_family', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textFontFamily = runtime.toStringValue(args[3]);
    });
    return undefined;
  });
  builtins.set('table.cell_set_text_formatting', (args, _namedArgs, ctx) => {
    withTable(args[0], ctx, (table) => {
      const cell = ensureCell(table, args[1], args[2]);
      cell.textFormatting = runtime.toStringValue(args[3]);
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
