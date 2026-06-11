import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventManager, type EventManagerCallbacks } from './EventManager';

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
    }),
  });
  document.body.appendChild(container);
  return container;
}

function createCallbacks(overrides: Partial<EventManagerCallbacks> = {}): EventManagerCallbacks {
  return {
    getViewport: () => ({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 }),
    getDimensions: () => ({
      width: 800,
      height: 600,
      priceAxisWidth: 60,
      timeAxisHeight: 24,
      topMargin: 20,
      leftMargin: 0,
    }),
    onRender: vi.fn(),
    onCursorChange: vi.fn(),
    ...overrides,
  };
}

describe('EventManager drawing drag routing', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('preserves click drawing input when a drawing drag is only pending', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
      }),
    );

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));

    expect(onDrawingDragPending).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingDragStart).not.toHaveBeenCalled();
    expect(onDrawingInput).toHaveBeenCalledWith(100, 100, 'mouse');

    manager.dispose();
  });

  it('starts pending drawing drags after pointer movement', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const onDrawingDragEnd = vi.fn();
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd,
      }),
    );

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 112, clientY: 104 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 112, clientY: 104 }));

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingDragMove).toHaveBeenCalledWith(112, 104, 'mouse');
    expect(onDrawingDragEnd).toHaveBeenCalledWith('mouse');

    manager.dispose();
  });
});
