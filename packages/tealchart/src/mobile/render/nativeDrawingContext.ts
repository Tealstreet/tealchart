import type { SkCanvas, SkFont } from '@shopify/react-native-skia';
import type { CanvasContext } from '../../rendering/CanvasContext';

import { Skia } from '@shopify/react-native-skia';

/** Canvas contract for the shared painter, constructed inside the UI worklet. */
export function createNativeDrawingContext(canvas: SkCanvas, fonts: Readonly<Record<string, SkFont>>): CanvasContext {
  'worklet';
  let path = Skia.Path.Make();
  let dash: number[] = [];
  const stack: Array<{
    fillStyle: CanvasContext['fillStyle'];
    strokeStyle: CanvasContext['strokeStyle'];
    lineWidth: number;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    lineDashOffset: number;
    globalAlpha: number;
    lineCap: CanvasLineCap;
    lineJoin: CanvasLineJoin;
    dash: number[];
  }> = [];
  function paint(stroke: boolean) {
    const result = Skia.Paint();
    result.setAntiAlias(true);
    // Skia's CSS parser retains eight-digit alpha and all Pine CSS colors.
    result.setColor(Skia.Color(String(stroke ? ctx.strokeStyle : ctx.fillStyle)));
    result.setAlphaf(result.getAlphaf() * ctx.globalAlpha);
    result.setStyle(stroke ? 1 : 0);
    if (stroke) {
      result.setStrokeWidth(ctx.lineWidth);
      result.setStrokeCap(ctx.lineCap === 'round' ? 1 : ctx.lineCap === 'square' ? 2 : 0);
      result.setStrokeJoin(ctx.lineJoin === 'round' ? 1 : ctx.lineJoin === 'bevel' ? 2 : 0);
      result.setPathEffect(dash.length ? Skia.PathEffect.MakeDash(dash, ctx.lineDashOffset) : null);
    }
    return result;
  }
  function drawText(text: string, x: number, y: number, stroke: boolean) {
    const font = fonts[ctx.font];
    if (!font) return;
    const width = font.measureText(text).width;
    const metrics = font.getMetrics();
    const left =
      ctx.textAlign === 'center'
        ? x - width / 2
        : ctx.textAlign === 'right' || ctx.textAlign === 'end'
          ? x - width
          : x;
    const baseline =
      ctx.textBaseline === 'top' || ctx.textBaseline === 'hanging'
        ? y - metrics.ascent
        : ctx.textBaseline === 'middle'
          ? y - (metrics.ascent + metrics.descent) / 2
          : ctx.textBaseline === 'bottom' || ctx.textBaseline === 'ideographic'
            ? y - metrics.descent
            : y;
    canvas.drawText(text, left, baseline, paint(stroke), font);
  }
  const ctx: CanvasContext = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineDashOffset: 0,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    beginPath() {
      path = Skia.Path.Make();
    },
    moveTo(x, y) {
      path.moveTo(x, y);
    },
    lineTo(x, y) {
      path.lineTo(x, y);
    },
    quadraticCurveTo(cx, cy, x, y) {
      path.quadTo(cx, cy, x, y);
    },
    bezierCurveTo(cx1, cy1, cx2, cy2, x, y) {
      path.cubicTo(cx1, cy1, cx2, cy2, x, y);
    },
    arc(x, y, radius, start, end, counterclockwise = false) {
      let sweep = ((end - start) * 180) / Math.PI;
      if (counterclockwise && sweep > 0) sweep -= 360;
      if (!counterclockwise && sweep < 0) sweep += 360;
      path.arcToOval(
        Skia.XYWHRect(x - radius, y - radius, radius * 2, radius * 2),
        (start * 180) / Math.PI,
        sweep,
        false,
      );
    },
    rect(x, y, width, height) {
      path.addRect(Skia.XYWHRect(x, y, width, height));
    },
    roundRect(x, y, width, height, radii) {
      const radius = typeof radii === 'number' ? radii : (radii[0] ?? 0);
      path.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, width, height), radius, radius));
    },
    closePath() {
      path.close();
    },
    fill() {
      canvas.drawPath(path, paint(false));
    },
    stroke() {
      canvas.drawPath(path, paint(true));
    },
    fillRect(x, y, width, height) {
      canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint(false));
    },
    strokeRect(x, y, width, height) {
      canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint(true));
    },
    fillText(text, x, y) {
      drawText(text, x, y, false);
    },
    strokeText(text, x, y) {
      drawText(text, x, y, true);
    },
    save() {
      canvas.save();
      stack.push({
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        font: ctx.font,
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
        lineDashOffset: ctx.lineDashOffset,
        globalAlpha: ctx.globalAlpha,
        lineCap: ctx.lineCap,
        lineJoin: ctx.lineJoin,
        dash: [...dash],
      });
    },
    restore() {
      canvas.restore();
      const state = stack.pop();
      if (state) {
        dash = state.dash;
        Object.assign(ctx, state);
      }
    },
    clip() {
      canvas.clipPath(path, 1, true);
    },
    scale(x, y) {
      canvas.scale(x, y);
    },
    translate(x, y) {
      canvas.translate(x, y);
    },
    setLineDash(segments) {
      dash = [...segments];
    },
    getLineDash() {
      return [...dash];
    },
    measureText(text) {
      return { width: fonts[ctx.font]?.measureText(text).width ?? 0 } as TextMetrics;
    },
  };
  return ctx;
}
