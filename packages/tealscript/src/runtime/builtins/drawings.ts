import type { BuiltinRegistry } from './registry';
import {
  getDrawingValue,
  toDrawingId,
  withDrawing,
} from '../drawings/helpers';
import type { ExecutionContext } from '../context';
import type { LineDrawingOutput } from '../drawings/types';

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

export function registerLabelBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  builtins.set('label.new', (args, namedArgs, ctx, _scope, callId) => {
    const x = runtime.toNullableNumber(namedArgs.get('x') ?? args[0]);
    const y = runtime.toNullableNumber(namedArgs.get('y') ?? args[1]);
    const text = runtime.toStringValue(namedArgs.get('text') ?? args[2] ?? '');
    const id = `label_${callId}_${ctx.bar_index}`;

    ctx.addDrawing({
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
    });

    return id;
  });

  builtins.set('label.delete', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => ctx.deleteDrawing(label.id));
    return undefined;
  });

  builtins.set('label.copy', (args, _namedArgs, ctx, _scope, callId) => {
    const labelId = toDrawingId(args[0], runtime.isNa);
    if (!labelId) return Number.NaN;

    const newId = `label_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyLabelDrawing(labelId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('label.set_x', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(args[1]);
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_y', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.y = runtime.toNullableNumber(args[1]);
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_xy', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(args[1]);
      label.y = runtime.toNullableNumber(args[2]);
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_text', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.text = runtime.toStringValue(args[1] ?? '');
    });
    return undefined;
  });

  builtins.set('label.set_xloc', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.x = runtime.toNullableNumber(args[1]);
      label.xloc = runtime.toStringValue(args[2]);
      label.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('label.set_yloc', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.yloc = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('label.set_style', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.style = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('label.set_color', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.color = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });

  builtins.set('label.set_textcolor', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.textColor = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });

  builtins.set('label.set_size', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.size = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('label.set_tooltip', (args, _namedArgs, ctx) => {
    withDrawing(args[0], ctx, 'label', runtime.isNa, (label) => {
      label.tooltip = runtime.toOptionalString(args[1]);
    });
    return undefined;
  });

  builtins.set('label.get_x', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.x ?? Number.NaN));
  builtins.set('label.get_y', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.y ?? Number.NaN));
  builtins.set('label.get_text', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.text));
  builtins.set('label.get_xloc', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.xloc));
  builtins.set('label.get_yloc', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.yloc));
  builtins.set('label.get_style', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.style));
  builtins.set('label.get_color', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.color ?? Number.NaN));
  builtins.set('label.get_textcolor', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.textColor ?? Number.NaN));
  builtins.set('label.get_size', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.size));
  builtins.set('label.get_tooltip', (args, _namedArgs, ctx) => getDrawingValue(args[0], ctx, 'label', runtime.isNa, (label) => label.tooltip ?? ''));
}

export function registerLineBuiltins(builtins: BuiltinRegistry, runtime: DrawingBuiltinRuntime): void {
  builtins.set('line.new', (args, namedArgs, ctx, _scope, callId) => {
    const x1 = runtime.toNullableNumber(namedArgs.get('x1') ?? args[0]);
    const y1 = runtime.toNullableNumber(namedArgs.get('y1') ?? args[1]);
    const x2 = runtime.toNullableNumber(namedArgs.get('x2') ?? args[2]);
    const y2 = runtime.toNullableNumber(namedArgs.get('y2') ?? args[3]);
    const id = `line_${callId}_${ctx.bar_index}`;

    ctx.addDrawing({
      id,
      type: 'line',
      barIndex: ctx.bar_index,
      x1,
      y1,
      x2,
      y2,
      xloc: runtime.toStringValue(namedArgs.get('xloc') ?? args[4] ?? 'bar_index'),
      extend: runtime.toStringValue(namedArgs.get('extend') ?? args[5] ?? 'none'),
      color: runtime.toNullableColor(namedArgs.get('color') ?? args[6]),
      style: runtime.toStringValue(namedArgs.get('style') ?? args[7] ?? 'solid'),
      width: runtime.toLineWidth(namedArgs.get('width') ?? args[8]),
      forceOverlay: Boolean(namedArgs.get('force_overlay') ?? args[9] ?? false),
    });

    return id;
  });

  builtins.set('line.delete', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => ctx.deleteDrawing(line.id));
    return undefined;
  });

  builtins.set('line.copy', (args, _namedArgs, ctx, _scope, callId) => {
    const lineId = runtime.toDrawingId(args[0]);
    if (!lineId) return Number.NaN;

    const newId = `line_${callId}_${ctx.bar_index}`;
    const copy = ctx.copyLineDrawing(lineId, newId);
    return copy ? newId : Number.NaN;
  });

  builtins.set('line.set_x1', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.x1 = runtime.toNullableNumber(args[1]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_x2', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.x2 = runtime.toNullableNumber(args[1]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y1', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.y1 = runtime.toNullableNumber(args[1]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_y2', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.y2 = runtime.toNullableNumber(args[1]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy1', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.x1 = runtime.toNullableNumber(args[1]);
      line.y1 = runtime.toNullableNumber(args[2]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xy2', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.x2 = runtime.toNullableNumber(args[1]);
      line.y2 = runtime.toNullableNumber(args[2]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_xloc', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.x1 = runtime.toNullableNumber(args[1]);
      line.x2 = runtime.toNullableNumber(args[2]);
      line.xloc = runtime.toStringValue(args[3]);
      line.barIndex = ctx.bar_index;
    });
    return undefined;
  });

  builtins.set('line.set_extend', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.extend = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('line.set_color', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.color = runtime.toNullableColor(args[1]);
    });
    return undefined;
  });

  builtins.set('line.set_style', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.style = runtime.toStringValue(args[1]);
    });
    return undefined;
  });

  builtins.set('line.set_width', (args, _namedArgs, ctx) => {
    runtime.withLine(args[0], ctx, (line) => {
      line.width = runtime.toLineWidth(args[1]);
    });
    return undefined;
  });

  builtins.set('line.get_x1', (args, _namedArgs, ctx) => runtime.getLineValue(args[0], ctx, (line) => line.x1 ?? Number.NaN));
  builtins.set('line.get_x2', (args, _namedArgs, ctx) => runtime.getLineValue(args[0], ctx, (line) => line.x2 ?? Number.NaN));
  builtins.set('line.get_y1', (args, _namedArgs, ctx) => runtime.getLineValue(args[0], ctx, (line) => line.y1 ?? Number.NaN));
  builtins.set('line.get_y2', (args, _namedArgs, ctx) => runtime.getLineValue(args[0], ctx, (line) => line.y2 ?? Number.NaN));
  builtins.set('line.get_price', (args, _namedArgs, ctx) => {
    const x = runtime.toNumber(args[1]);
    return runtime.getLineValue(args[0], ctx, (line) => runtime.interpolateLinePrice(line, x));
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
};

export function registerDrawingConstants(builtins: BuiltinRegistry): void {
  for (const [name, value] of Object.entries(DRAWING_CONSTANTS)) {
    builtins.set(name, () => value);
  }
}
