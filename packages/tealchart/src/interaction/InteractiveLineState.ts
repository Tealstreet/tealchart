/**
 * InteractiveLineState - Pure state machine for interactive price lines
 *
 * NO DOM dependencies. Shared between web and mobile.
 * Manages drag state and pending order tracking (optimistic UI).
 */

// ============================================================================
// Types
// ============================================================================

interface DragState {
  lineId: string;
  startY: number;
  startPrice: number;
  currentPrice: number;
  yToPrice: (y: number) => number;
}

interface PendingOrder {
  price: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

// ============================================================================
// InteractiveLineState
// ============================================================================

export class InteractiveLineState {
  private drag: DragState | null = null;
  private pending = new Map<string, PendingOrder>();

  // ==========================================================================
  // Drag state machine
  // ==========================================================================

  /**
   * Start a drag operation
   */
  startDrag(lineId: string, startY: number, startPrice: number, yToPrice: (y: number) => number): void {
    this.drag = {
      lineId,
      startY,
      startPrice,
      currentPrice: startPrice,
      yToPrice,
    };
  }

  /**
   * Update drag position. Returns current dragged price.
   */
  updateDrag(currentY: number): { lineId: string; currentPrice: number } {
    if (!this.drag) {
      return { lineId: '', currentPrice: 0 };
    }
    this.drag.currentPrice = this.drag.yToPrice(currentY);
    return { lineId: this.drag.lineId, currentPrice: this.drag.currentPrice };
  }

  /**
   * End drag. Returns final price or null if no active drag.
   */
  endDrag(): { lineId: string; finalPrice: number } | null {
    if (!this.drag) return null;
    const result = { lineId: this.drag.lineId, finalPrice: this.drag.currentPrice };
    this.drag = null;
    return result;
  }

  /**
   * Cancel drag — resets state without returning a result
   */
  cancelDrag(): void {
    this.drag = null;
  }

  /**
   * Whether a drag is currently active
   */
  isDragging(): boolean {
    return this.drag !== null;
  }

  /**
   * Get the line ID being dragged, or null
   */
  getDragLineId(): string | null {
    return this.drag?.lineId ?? null;
  }

  /**
   * Get the original price at drag start (for revert on cancel)
   */
  getDragStartPrice(): number | null {
    return this.drag?.startPrice ?? null;
  }

  // ==========================================================================
  // Pending order tracking (optimistic UI during drag)
  // ==========================================================================

  /**
   * Set a pending price for a line (optimistic UI)
   */
  setPendingPrice(lineId: string, price: number, timeoutMs = 5000): void {
    // Clear existing pending for this line
    this.clearPending(lineId);

    const timeoutId = setTimeout(() => {
      this.pending.delete(lineId);
    }, timeoutMs);

    this.pending.set(lineId, { price, timeoutId });
  }

  /**
   * Clear pending state for a line
   */
  clearPending(lineId: string): void {
    const existing = this.pending.get(lineId);
    if (existing) {
      clearTimeout(existing.timeoutId);
      this.pending.delete(lineId);
    }
  }

  /**
   * Get the pending price for a line, or undefined
   */
  getPendingPrice(lineId: string): number | undefined {
    return this.pending.get(lineId)?.price;
  }

  /**
   * Clean up pending orders that are no longer in the active set
   */
  cleanupPendingOrders(activeLineIds: string[]): void {
    const activeSet = new Set(activeLineIds);
    for (const [id, pending] of this.pending) {
      if (!activeSet.has(id)) {
        clearTimeout(pending.timeoutId);
        this.pending.delete(id);
      }
    }
  }

  /**
   * Dispose — clear all pending timeouts
   */
  dispose(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeoutId);
    }
    this.pending.clear();
    this.drag = null;
  }
}
