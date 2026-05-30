import type { BuiltinRegistry } from './registry';
import {
  getDrawingValue,
  toDrawingId,
  withDrawing,
} from '../drawings/helpers';

export interface DrawingBuiltinRuntime {
  isNa(value: unknown): boolean;
  toNullableNumber(value: unknown): number | null;
  toStringValue(value: unknown): string;
  toNullableColor(value: unknown): string | null;
  toOptionalString(value: unknown): string | undefined;
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
