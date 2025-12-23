// ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY ⚠️
// This file was copied from tealstreet-next by copy-and-patch.js
// To re-sync from the web repository, run: yarn sync
// 
// To make this file mobile-specific (prevent it from being overwritten on sync):
// 1. Modify the file as needed for mobile
// 2. Add to patch-config.json "permanentFiles" array:
//    - For single file: "web/path/to/this/file.ts"
//    - For directory: "web/path/to/directory/**/*"
// 3. Add exception to .gitignore: !src/web/path/to/this/file.ts
// 4. Force-add to git: git add -f src/web/path/to/this/file.ts
// 5. Commit your changes
// 6. IMPORTANT: Replace this header with the MOBILE-PATCHED header (see existing patched files for example)
//
// The patch-config.json controls:
// - permanentFiles: Files that are never overwritten during sync
// - excludeFromCopy: Files excluded from initial copy
// - importReplacements: Auto-replace imports with mobile shims
//
// See README.md section "Git Configuration for Patched Files" for full details

/**
 * SkiaCanvasContext - React Native Skia implementation of CanvasContext
 *
 * This provides an imperative Canvas 2D-like API on top of Skia's canvas.
 * Allows TealchartRenderer to render natively on React Native without
 * modification.
 *
 * Usage:
 * ```tsx
 * import { Canvas } from '@shopify/react-native-skia';
 *
 * <Canvas onDraw={(canvas) => {
 *   const ctx = new SkiaCanvasContext(canvas, Skia);
 *   renderer.render(bars, viewport, ctx);
 * }} />
 * ```
 */

import type { CanvasContext } from './CanvasContext';

// Types from @shopify/react-native-skia (imported dynamically to avoid web bundle bloat)
type SkCanvas = {
  save(): number;
  restore(): void;
  scale(sx: number, sy: number): void;
  translate(dx: number, dy: number): void;
  clipPath(path: SkPath, op: number, doAntiAlias: boolean): void;
  drawPath(path: SkPath, paint: SkPaint): void;
  drawRect(rect: SkRect, paint: SkPaint): void;
  drawRRect(rrect: SkRRect, paint: SkPaint): void;
  drawText(text: string, x: number, y: number, paint: SkPaint, font: SkFont): void;
};

// In v2.x, colors are Float32Array [r, g, b, a] with values 0-1
type SkColor = Float32Array;

type SkPaint = {
  setColor(color: SkColor): void;
  setStyle(style: number): void;
  setStrokeWidth(width: number): void;
  setStrokeCap(cap: number): void;
  setStrokeJoin(join: number): void;
  setAlphaf(alpha: number): void;
  setPathEffect(effect: SkPathEffect | null): void;
  copy(): SkPaint;
};

type SkPath = {
  reset(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcToOval(oval: SkRect, startAngle: number, sweepAngle: number, forceMoveTo: boolean): void;
  addRect(rect: SkRect): void;
  addRRect(rrect: SkRRect): void;
  close(): void;
  copy(): SkPath;
};

type SkFont = {
  setSize(size: number): void;
  measureText(text: string): number;
};

type SkRect = readonly [number, number, number, number]; // [x, y, width, height] or [left, top, right, bottom]
type SkRRect = { rect: SkRect; rx: number; ry: number };
type SkPathEffect = unknown;

// Skia factory interface (react-native-skia v2.x API)
interface SkiaApi {
  Paint(): SkPaint;
  Path: {
    Make(): SkPath;
  };
  PathEffect: {
    MakeDash(intervals: number[], phase: number): SkPathEffect;
  };
  XYWHRect(x: number, y: number, width: number, height: number): SkRect;
  RRectXY(rect: SkRect, rx: number, ry: number): SkRRect;
}

// Paint style constants
const PAINT_STYLE_FILL = 0;
const PAINT_STYLE_STROKE = 1;

// Stroke cap constants
const STROKE_CAP_BUTT = 0;
const STROKE_CAP_ROUND = 1;
const STROKE_CAP_SQUARE = 2;

// Stroke join constants
const STROKE_JOIN_MITER = 0;
const STROKE_JOIN_ROUND = 1;
const STROKE_JOIN_BEVEL = 2;

// Clip op
const CLIP_OP_INTERSECT = 0;

// State to save/restore
interface ContextState {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineDashOffset: number;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineDash: number[];
}

/**
 * Parse CSS color string to Skia color (Float32Array [r, g, b, a] with values 0-1)
 */
function parseColor(color: string): Float32Array {
  let r = 0, g = 0, b = 0, a = 1;

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      // #RGB -> #RRGGBB
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
      // #RRGGBB
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 8) {
      // #RRGGBBAA
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
      a = parseInt(hex.slice(6, 8), 16) / 255;
    }
    return new Float32Array([r, g, b, a]);
  }

  // Handle rgb/rgba
  const rgbaMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    r = parseInt(rgbaMatch[1], 10) / 255;
    g = parseInt(rgbaMatch[2], 10) / 255;
    b = parseInt(rgbaMatch[3], 10) / 255;
    a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    return new Float32Array([r, g, b, a]);
  }

  // Handle named colors (common ones used in charts)
  const namedColors: Record<string, [number, number, number, number]> = {
    black: [0, 0, 0, 1],
    white: [1, 1, 1, 1],
    red: [1, 0, 0, 1],
    green: [0, 1, 0, 1],
    blue: [0, 0, 1, 1],
    yellow: [1, 1, 0, 1],
    cyan: [0, 1, 1, 1],
    magenta: [1, 0, 1, 1],
    transparent: [0, 0, 0, 0],
    gray: [0.5, 0.5, 0.5, 1],
    grey: [0.5, 0.5, 0.5, 1],
  };

  const named = namedColors[color.toLowerCase()];
  if (named) return new Float32Array(named);

  // Default to black
  console.warn(`[SkiaCanvasContext] Unknown color: ${color}, defaulting to black`);
  return new Float32Array([0, 0, 0, 1]);
}

/**
 * Parse CSS font string to size (typeface handling is simplified)
 */
function parseFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)\s*px/);
  return match ? parseFloat(match[1]) : 12;
}

export class SkiaCanvasContext implements CanvasContext {
  private canvas: SkCanvas;
  private skia: SkiaApi;
  private currentPath: SkPath;
  private fillPaint: SkPaint;
  private strokePaint: SkPaint;
  private textPaint: SkPaint;
  private skiaFont: SkFont | null = null;
  private stateStack: ContextState[] = [];
  private _lineDash: number[] = [];

  // Public state properties
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  font = '12px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  lineDashOffset = 0;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';

  constructor(canvas: SkCanvas, skia: SkiaApi) {
    this.canvas = canvas;
    this.skia = skia;

    // Initialize Skia objects (v2.x API uses Path.Make())
    this.currentPath = skia.Path.Make();
    this.fillPaint = skia.Paint();
    this.strokePaint = skia.Paint();
    this.textPaint = skia.Paint();
    // Font requires a typeface in v2.x - skip for now, text won't render
    this.skiaFont = null;

    // Configure paints
    this.fillPaint.setStyle(PAINT_STYLE_FILL);
    this.strokePaint.setStyle(PAINT_STYLE_STROKE);
    this.textPaint.setStyle(PAINT_STYLE_FILL);
  }

  // ============================================================================
  // Path Operations
  // ============================================================================

  beginPath(): void {
    this.currentPath.reset();
  }

  moveTo(x: number, y: number): void {
    this.currentPath.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.currentPath.lineTo(x, y);
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false
  ): void {
    // Convert angles from radians to degrees
    const startDeg = (startAngle * 180) / Math.PI;
    let sweepDeg = ((endAngle - startAngle) * 180) / Math.PI;

    if (counterclockwise && sweepDeg > 0) {
      sweepDeg -= 360;
    } else if (!counterclockwise && sweepDeg < 0) {
      sweepDeg += 360;
    }

    const oval = this.skia.XYWHRect(x - radius, y - radius, radius * 2, radius * 2);
    this.currentPath.arcToOval(oval, startDeg, sweepDeg, false);
  }

  rect(x: number, y: number, width: number, height: number): void {
    const rect = this.skia.XYWHRect(x, y, width, height);
    this.currentPath.addRect(rect);
  }

  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: number | number[]
  ): void {
    const rect = this.skia.XYWHRect(x, y, width, height);
    const r = typeof radii === 'number' ? radii : radii[0] ?? 0;
    const rrect = this.skia.RRectXY(rect, r, r);
    this.currentPath.addRRect(rrect);
  }

  closePath(): void {
    this.currentPath.close();
  }

  // ============================================================================
  // Drawing Operations
  // ============================================================================

  private applyFillStyle(): void {
    const color = typeof this.fillStyle === 'string' ? this.fillStyle : '#000000';
    this.fillPaint.setColor(parseColor(color));
    this.fillPaint.setAlphaf(this.globalAlpha);
  }

  private applyStrokeStyle(): void {
    const color = typeof this.strokeStyle === 'string' ? this.strokeStyle : '#000000';
    this.strokePaint.setColor(parseColor(color));
    this.strokePaint.setStrokeWidth(this.lineWidth);
    this.strokePaint.setAlphaf(this.globalAlpha);

    // Line cap
    const capMap: Record<CanvasLineCap, number> = {
      butt: STROKE_CAP_BUTT,
      round: STROKE_CAP_ROUND,
      square: STROKE_CAP_SQUARE,
    };
    this.strokePaint.setStrokeCap(capMap[this.lineCap] ?? STROKE_CAP_BUTT);

    // Line join
    const joinMap: Record<CanvasLineJoin, number> = {
      miter: STROKE_JOIN_MITER,
      round: STROKE_JOIN_ROUND,
      bevel: STROKE_JOIN_BEVEL,
    };
    this.strokePaint.setStrokeJoin(joinMap[this.lineJoin] ?? STROKE_JOIN_MITER);

    // Dash pattern
    if (this._lineDash.length > 0) {
      const effect = this.skia.PathEffect.MakeDash(this._lineDash, this.lineDashOffset);
      this.strokePaint.setPathEffect(effect);
    } else {
      this.strokePaint.setPathEffect(null);
    }
  }

  fill(): void {
    this.applyFillStyle();
    this.canvas.drawPath(this.currentPath, this.fillPaint);
  }

  stroke(): void {
    this.applyStrokeStyle();
    this.canvas.drawPath(this.currentPath, this.strokePaint);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.applyFillStyle();
    const rect = this.skia.XYWHRect(x, y, width, height);
    this.canvas.drawRect(rect, this.fillPaint);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.applyStrokeStyle();
    const rect = this.skia.XYWHRect(x, y, width, height);
    this.canvas.drawRect(rect, this.strokePaint);
  }

  fillText(text: string, x: number, y: number): void {
    // Skip text rendering if no font available (v2.x requires typeface)
    if (!this.skiaFont) return;

    const color = typeof this.fillStyle === 'string' ? this.fillStyle : '#000000';
    this.textPaint.setColor(parseColor(color));
    this.textPaint.setAlphaf(this.globalAlpha);

    // Update font size
    const size = parseFontSize(this.font);
    this.skiaFont.setSize(size);

    // Adjust x based on textAlign
    let adjustedX = x;
    if (this.textAlign === 'center') {
      const width = this.skiaFont.measureText(text);
      adjustedX = x - width / 2;
    } else if (this.textAlign === 'right' || this.textAlign === 'end') {
      const width = this.skiaFont.measureText(text);
      adjustedX = x - width;
    }

    // Adjust y based on textBaseline (simplified)
    let adjustedY = y;
    const fontSize = parseFontSize(this.font);
    if (this.textBaseline === 'top') {
      adjustedY = y + fontSize * 0.8;
    } else if (this.textBaseline === 'middle') {
      adjustedY = y + fontSize * 0.35;
    } else if (this.textBaseline === 'bottom') {
      adjustedY = y - fontSize * 0.2;
    }
    // 'alphabetic' is roughly the default

    this.canvas.drawText(text, adjustedX, adjustedY, this.textPaint, this.skiaFont);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  save(): void {
    this.canvas.save();
    this.stateStack.push({
      fillStyle: this.fillStyle as string,
      strokeStyle: this.strokeStyle as string,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      lineDashOffset: this.lineDashOffset,
      globalAlpha: this.globalAlpha,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      lineDash: [...this._lineDash],
    });
  }

  restore(): void {
    this.canvas.restore();
    const state = this.stateStack.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this.lineDashOffset = state.lineDashOffset;
      this.globalAlpha = state.globalAlpha;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this._lineDash = state.lineDash;
    }
  }

  clip(): void {
    this.canvas.clipPath(this.currentPath, CLIP_OP_INTERSECT, true);
  }

  // ============================================================================
  // Transforms
  // ============================================================================

  scale(x: number, y: number): void {
    this.canvas.scale(x, y);
  }

  translate(x: number, y: number): void {
    this.canvas.translate(x, y);
  }

  // ============================================================================
  // Line Style
  // ============================================================================

  setLineDash(segments: number[]): void {
    this._lineDash = [...segments];
  }

  getLineDash(): number[] {
    return [...this._lineDash];
  }

  // ============================================================================
  // Measurement
  // ============================================================================

  measureText(text: string): TextMetrics {
    const size = parseFontSize(this.font);

    // Estimate width if no font available (average char width ~0.6 * size)
    let width: number;
    if (this.skiaFont) {
      this.skiaFont.setSize(size);
      width = this.skiaFont.measureText(text);
    } else {
      width = text.length * size * 0.6;
    }

    // Return a minimal TextMetrics-like object
    return {
      width,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: width,
      actualBoundingBoxAscent: size * 0.8,
      actualBoundingBoxDescent: size * 0.2,
      fontBoundingBoxAscent: size * 0.8,
      fontBoundingBoxDescent: size * 0.2,
      emHeightAscent: size * 0.8,
      emHeightDescent: size * 0.2,
      hangingBaseline: size * 0.8,
      alphabeticBaseline: 0,
      ideographicBaseline: -size * 0.2,
    };
  }
}
