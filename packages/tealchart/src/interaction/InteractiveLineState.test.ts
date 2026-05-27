import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractiveLineState } from './InteractiveLineState';

// ---------------------------------------------------------------------------
// Drag state machine
// ---------------------------------------------------------------------------

describe('InteractiveLineState — drag state machine', () => {
  it('isDragging() returns false initially', () => {
    const state = new InteractiveLineState();
    expect(state.isDragging()).toBe(false);
    expect(state.getDragLineId()).toBeNull();
  });

  it('startDrag() activates drag state', () => {
    const state = new InteractiveLineState();
    const yToPrice = (y: number) => 50_000 - y * 10;

    state.startDrag('order-1', 100, 49_000, yToPrice);

    expect(state.isDragging()).toBe(true);
    expect(state.getDragLineId()).toBe('order-1');
    expect(state.getDragStartPrice()).toBe(49_000);
  });

  it('updateDrag() returns current price via yToPrice', () => {
    const state = new InteractiveLineState();
    const yToPrice = (y: number) => 50_000 - y * 10;

    state.startDrag('order-1', 100, 49_000, yToPrice);
    const result = state.updateDrag(120);

    expect(result).toEqual({ lineId: 'order-1', currentPrice: 50_000 - 120 * 10 });
  });

  it('updateDrag() returns defaults when no drag active', () => {
    const state = new InteractiveLineState();
    const result = state.updateDrag(120);
    expect(result).toEqual({ lineId: '', currentPrice: 0 });
  });

  it('endDrag() returns { lineId, finalPrice } and resets', () => {
    const state = new InteractiveLineState();
    const yToPrice = (y: number) => 50_000 - y * 10;

    state.startDrag('order-1', 100, 49_000, yToPrice);
    state.updateDrag(150);
    const result = state.endDrag();

    expect(result).toEqual({ lineId: 'order-1', finalPrice: 50_000 - 150 * 10 });
    expect(state.isDragging()).toBe(false);
  });

  it('endDrag() returns null when no drag active (cancelled or never started)', () => {
    const state = new InteractiveLineState();
    expect(state.endDrag()).toBeNull();
  });

  it('cancelDrag() sets isDragging to false', () => {
    const state = new InteractiveLineState();
    state.startDrag('order-1', 100, 49_000, (y) => y);
    state.cancelDrag();
    expect(state.isDragging()).toBe(false);
    expect(state.getDragLineId()).toBeNull();
  });

  it('cancelDrag() when not dragging is a no-op', () => {
    const state = new InteractiveLineState();
    expect(() => state.cancelDrag()).not.toThrow();
    expect(state.isDragging()).toBe(false);
  });

  it('endDrag() returns null after cancelDrag()', () => {
    const state = new InteractiveLineState();
    state.startDrag('order-1', 100, 49_000, (y) => y);
    state.cancelDrag();
    expect(state.endDrag()).toBeNull();
  });

  it('multiple drags in sequence work correctly', () => {
    const state = new InteractiveLineState();

    // First drag
    state.startDrag('order-1', 100, 49_000, (y) => y * 2);
    state.updateDrag(200);
    const first = state.endDrag();
    expect(first).toEqual({ lineId: 'order-1', finalPrice: 400 });
    expect(state.isDragging()).toBe(false);

    // Second drag
    state.startDrag('order-2', 50, 30_000, (y) => y + 100);
    state.updateDrag(75);
    const second = state.endDrag();
    expect(second).toEqual({ lineId: 'order-2', finalPrice: 175 });
    expect(state.isDragging()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pending order tracking
// ---------------------------------------------------------------------------

describe('InteractiveLineState — pending order tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getPendingPrice() returns undefined for unknown lineId', () => {
    const state = new InteractiveLineState();
    expect(state.getPendingPrice('unknown')).toBeUndefined();
  });

  it('setPendingPrice() → getPendingPrice() returns the price', () => {
    const state = new InteractiveLineState();
    state.setPendingPrice('order-1', 42_000);
    expect(state.getPendingPrice('order-1')).toBe(42_000);
  });

  it('clearPending() removes the pending price', () => {
    const state = new InteractiveLineState();
    state.setPendingPrice('order-1', 42_000);
    state.clearPending('order-1');
    expect(state.getPendingPrice('order-1')).toBeUndefined();
  });

  it('clearPending() on unknown lineId is a no-op', () => {
    const state = new InteractiveLineState();
    expect(() => state.clearPending('nonexistent')).not.toThrow();
  });

  it('cleanupPendingOrders() removes entries not in the active list', () => {
    const state = new InteractiveLineState();
    state.setPendingPrice('order-1', 100);
    state.setPendingPrice('order-2', 200);
    state.setPendingPrice('order-3', 300);

    state.cleanupPendingOrders(['order-2']);

    expect(state.getPendingPrice('order-1')).toBeUndefined();
    expect(state.getPendingPrice('order-2')).toBe(200);
    expect(state.getPendingPrice('order-3')).toBeUndefined();
  });

  it('timeout auto-clears pending price', () => {
    const state = new InteractiveLineState();
    state.setPendingPrice('order-1', 42_000, 3000);

    expect(state.getPendingPrice('order-1')).toBe(42_000);

    vi.advanceTimersByTime(3000);

    expect(state.getPendingPrice('order-1')).toBeUndefined();
  });

  it('setPendingPrice() replaces existing pending for same lineId', () => {
    const state = new InteractiveLineState();
    state.setPendingPrice('order-1', 100, 5000);
    state.setPendingPrice('order-1', 200, 5000);

    expect(state.getPendingPrice('order-1')).toBe(200);

    // Old timeout should have been cleared — advancing 5s should clear the new one
    vi.advanceTimersByTime(5000);
    expect(state.getPendingPrice('order-1')).toBeUndefined();
  });

  it('dispose() clears all pending and drag state', () => {
    const state = new InteractiveLineState();
    state.startDrag('order-1', 100, 49_000, (y) => y);
    state.setPendingPrice('order-1', 100);
    state.setPendingPrice('order-2', 200);

    state.dispose();

    expect(state.isDragging()).toBe(false);
    expect(state.getPendingPrice('order-1')).toBeUndefined();
    expect(state.getPendingPrice('order-2')).toBeUndefined();
  });
});
