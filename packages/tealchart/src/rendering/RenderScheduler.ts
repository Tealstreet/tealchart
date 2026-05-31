/**
 * RenderScheduler — platform-agnostic render loop with dirty bitmask.
 *
 * Manages:
 * - Dirty bitmask — what changed since last render
 * - RAF deduplication — multiple markDirty() calls coalesce into one frame
 * - Atomic transitions — batches data changes into one render pass
 *
 * Uses requestAnimationFrame which exists in both browser and React Native.
 */

// Dirty flags — bitwise OR for what needs updating
export const DIRTY = {
  NONE: 0,
  CROSSHAIR: 1 << 0, // Crosshair position only (cheapest — overlay canvas only)
  VIEWPORT: 1 << 1, // Pan/zoom — full canvas repaint
  BARS: 1 << 2, // New bar data arrived
  PLOTS: 1 << 3, // Indicator plot data changed
  DRAWINGS: 1 << 4, // TealScript drawing data changed
  LINES: 1 << 5, // Order/position/price lines changed
  LAYOUT: 1 << 6, // Pane layout changed
  OPTIONS: 1 << 7, // Render options (colors, font) changed
  DATA_LOAD: 1 << 8, // Atomic data transition (symbol/interval/reset)
  FULL: 0x1ff, // Everything
} as const;

export type DirtyFlags = number;

export class RenderScheduler {
  private _dirty: DirtyFlags = DIRTY.NONE;
  private _rafId: number | null = null;
  private _onRender: (dirty: DirtyFlags) => void;

  constructor(onRender: (dirty: DirtyFlags) => void) {
    this._onRender = onRender;
  }

  /**
   * Mark something as dirty — coalesces into next frame.
   * Multiple calls within the same frame are OR'd together.
   */
  markDirty(flags: DirtyFlags): void {
    this._dirty |= flags;
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        const dirty = this._dirty;
        this._dirty = DIRTY.NONE;
        this._onRender(dirty);
      });
    }
  }

  /**
   * Check if specific flag is currently dirty (pending render).
   */
  isDirty(flag: DirtyFlags): boolean {
    return (this._dirty & flag) !== 0;
  }

  /**
   * Cancel pending render frame.
   */
  cancel(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Dispose — cancel pending render and clear all state.
   */
  dispose(): void {
    this.cancel();
    this._dirty = DIRTY.NONE;
  }
}
