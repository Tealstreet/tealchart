/**
 * WebCanvasContext - Thin wrapper around native CanvasRenderingContext2D
 *
 * This wrapper implements CanvasContext by delegating all calls to the
 * underlying browser Canvas 2D context. It exists so that TealchartRenderer
 * can work against the CanvasContext interface, enabling Skia implementations.
 *
 * Performance note: Property access and method calls are delegated directly
 * with minimal overhead. The JIT compiler should inline most of these.
 */

import type { CanvasContext } from './CanvasContext';

export class WebCanvasContext implements CanvasContext {
  private lastFont: string;

  constructor(private ctx: CanvasRenderingContext2D) {
    this.lastFont = ctx.font;
  }

  /**
   * Get the underlying native context (for cases where direct access is needed)
   */
  getNativeContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  // ==========================================================================
  // Style Properties
  // ==========================================================================

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.fillStyle;
  }
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.ctx.fillStyle = value;
  }

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.strokeStyle;
  }
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.ctx.strokeStyle = value;
  }

  get lineWidth(): number {
    return this.ctx.lineWidth;
  }
  set lineWidth(value: number) {
    this.ctx.lineWidth = value;
  }

  get font(): string {
    return this.lastFont;
  }
  set font(value: string) {
    if (value === this.lastFont) return;
    this.lastFont = value;
    this.ctx.font = value;
  }

  get textAlign(): CanvasTextAlign {
    return this.ctx.textAlign;
  }
  set textAlign(value: CanvasTextAlign) {
    this.ctx.textAlign = value;
  }

  get textBaseline(): CanvasTextBaseline {
    return this.ctx.textBaseline;
  }
  set textBaseline(value: CanvasTextBaseline) {
    this.ctx.textBaseline = value;
  }

  get lineDashOffset(): number {
    return this.ctx.lineDashOffset;
  }
  set lineDashOffset(value: number) {
    this.ctx.lineDashOffset = value;
  }

  get globalAlpha(): number {
    return this.ctx.globalAlpha;
  }
  set globalAlpha(value: number) {
    this.ctx.globalAlpha = value;
  }

  get lineCap(): CanvasLineCap {
    return this.ctx.lineCap;
  }
  set lineCap(value: CanvasLineCap) {
    this.ctx.lineCap = value;
  }

  get lineJoin(): CanvasLineJoin {
    return this.ctx.lineJoin;
  }
  set lineJoin(value: CanvasLineJoin) {
    this.ctx.lineJoin = value;
  }

  // ==========================================================================
  // Path Operations
  // ==========================================================================

  beginPath(): void {
    this.ctx.beginPath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.ctx.rect(x, y, width, height);
  }

  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: number | number[]
  ): void {
    this.ctx.roundRect(x, y, width, height, radii);
  }

  closePath(): void {
    this.ctx.closePath();
  }

  // ==========================================================================
  // Drawing Operations
  // ==========================================================================

  fill(): void {
    this.ctx.fill();
  }

  stroke(): void {
    this.ctx.stroke();
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  fillText(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  clip(): void {
    this.ctx.clip();
  }

  // ==========================================================================
  // Transforms
  // ==========================================================================

  scale(x: number, y: number): void {
    this.ctx.scale(x, y);
  }

  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }

  // ==========================================================================
  // Line Style
  // ==========================================================================

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  getLineDash(): number[] {
    return this.ctx.getLineDash();
  }

  // ==========================================================================
  // Measurement
  // ==========================================================================

  measureText(text: string): TextMetrics {
    return this.ctx.measureText(text);
  }
}
