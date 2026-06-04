/**
 * CanvasContext - Abstract interface for 2D rendering
 *
 * This interface allows TealchartRenderer to work with both:
 * - Web: Native CanvasRenderingContext2D (via WebCanvasContext wrapper)
 * - React Native: Skia canvas (via SkiaCanvasContext implementation)
 *
 * Only includes methods actually used by TealchartRenderer.
 */

export interface CanvasContext {
  // ==========================================================================
  // Style Properties
  // ==========================================================================

  /** Fill color (CSS color string) */
  fillStyle: string | CanvasGradient | CanvasPattern;

  /** Stroke color (CSS color string) */
  strokeStyle: string | CanvasGradient | CanvasPattern;

  /** Line width in pixels */
  lineWidth: number;

  /** Font specification (CSS font string, e.g., "12px Arial") */
  font: string;

  /** Text horizontal alignment */
  textAlign: CanvasTextAlign;

  /** Text vertical alignment */
  textBaseline: CanvasTextBaseline;

  /** Dash pattern offset */
  lineDashOffset: number;

  /** Global alpha/opacity (0-1) */
  globalAlpha: number;

  /** Line cap style */
  lineCap: CanvasLineCap;

  /** Line join style */
  lineJoin: CanvasLineJoin;

  // ==========================================================================
  // Path Operations
  // ==========================================================================

  /** Begin a new path */
  beginPath(): void;

  /** Move to a point without drawing */
  moveTo(x: number, y: number): void;

  /** Draw a line to a point */
  lineTo(x: number, y: number): void;

  /** Draw a quadratic curve to a point */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;

  /** Draw an arc/circle */
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void;

  /** Add a rectangle to the path */
  rect(x: number, y: number, width: number, height: number): void;

  /** Add a rounded rectangle to the path */
  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: number | number[]
  ): void;

  /** Close the current path */
  closePath(): void;

  // ==========================================================================
  // Drawing Operations
  // ==========================================================================

  /** Fill the current path */
  fill(): void;

  /** Stroke the current path */
  stroke(): void;

  /** Fill a rectangle (no path needed) */
  fillRect(x: number, y: number, width: number, height: number): void;

  /** Stroke a rectangle (no path needed) */
  strokeRect(x: number, y: number, width: number, height: number): void;

  /** Draw filled text */
  fillText(text: string, x: number, y: number): void;

  // ==========================================================================
  // State Management
  // ==========================================================================

  /** Save current state (styles, transforms, clip) */
  save(): void;

  /** Restore previously saved state */
  restore(): void;

  /** Clip to current path */
  clip(): void;

  // ==========================================================================
  // Transforms
  // ==========================================================================

  /** Scale the canvas */
  scale(x: number, y: number): void;

  /** Translate the canvas origin */
  translate(x: number, y: number): void;

  // ==========================================================================
  // Line Style
  // ==========================================================================

  /** Set dash pattern */
  setLineDash(segments: number[]): void;

  /** Get current dash pattern */
  getLineDash(): number[];

  // ==========================================================================
  // Measurement
  // ==========================================================================

  /** Measure text width */
  measureText(text: string): TextMetrics;
}

/**
 * Type guard to check if a context implements CanvasContext
 */
export function isCanvasContext(ctx: unknown): ctx is CanvasContext {
  if (!ctx || typeof ctx !== 'object') return false;
  const c = ctx as Record<string, unknown>;
  return (
    typeof c.beginPath === 'function' &&
    typeof c.quadraticCurveTo === 'function' &&
    typeof c.fill === 'function' &&
    typeof c.stroke === 'function' &&
    typeof c.fillRect === 'function' &&
    typeof c.measureText === 'function'
  );
}
