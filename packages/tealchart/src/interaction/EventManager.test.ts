// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
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

function createTouch(
  target: EventTarget,
  init: { identifier?: number; clientX: number; clientY: number },
): Touch {
  return {
    identifier: init.identifier ?? 1,
    target,
    clientX: init.clientX,
    clientY: init.clientY,
    screenX: init.clientX,
    screenY: init.clientY,
    pageX: init.clientX,
    pageY: init.clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  } as Touch;
}

function dispatchTouchEvent(
  target: EventTarget,
  type: string,
  touches: Touch[],
  changedTouches: Touch[] = touches,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperties(event, {
    touches: { value: touches },
    targetTouches: { value: touches },
    changedTouches: { value: changedTouches },
  });
  target.dispatchEvent(event);
}

describe('EventManager drawing drag routing', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    clearChartStoreCache();
    vi.useRealTimers();
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
    expect(onDrawingInput).toHaveBeenCalledWith(100, 100, 'mouse', { additiveSelection: false });

    container.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 120, clientY: 120, shiftKey: true }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 120, clientY: 120, shiftKey: true }),
    );
    expect(onDrawingInput).toHaveBeenLastCalledWith(120, 120, 'mouse', { additiveSelection: true });

    manager.dispose();
  });

  it('keeps handled mouse drawing input from triggering pane double-click routing', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const getPaneAtY = vi.fn(() => ({ paneId: 'main', yMin: 0, yMax: 100, paneHeight: 600 }));
    const onPaneDoubleClick = vi.fn();
    const onDrawingInput = vi
      .fn()
      .mockReturnValueOnce({ handled: true })
      .mockReturnValueOnce({ handled: true });
    const manager = new EventManager(
      container,
      createCallbacks({
        getPaneAtY,
        onDrawingInput,
        onPaneDoubleClick,
      }),
    );

    vi.setSystemTime(1_000);
    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    vi.setSystemTime(1_100);
    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));

    expect(onDrawingInput).toHaveBeenCalledTimes(2);
    expect(onPaneDoubleClick).not.toHaveBeenCalled();

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

  it('cancels active mouse drawing drags on Escape without ending them', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const onDrawingDragEnd = vi.fn();
    const onDrawingDragCancel = vi.fn();
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd,
        onDrawingDragCancel,
      }),
    );

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 112, clientY: 104 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 112, clientY: 104 }));

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingDragMove).toHaveBeenCalledWith(112, 104, 'mouse');
    expect(onDrawingDragCancel).toHaveBeenCalledOnce();
    expect(onDrawingDragCancel).toHaveBeenCalledWith('mouse');
    expect(onDrawingDragEnd).not.toHaveBeenCalled();

    manager.dispose();
  });

  it('cancels active mouse drawing drags on window blur without ending them', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const onDrawingDragEnd = vi.fn();
    const onDrawingDragCancel = vi.fn();
    const onMouseUp = vi.fn();
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd,
        onDrawingDragCancel,
        onMouseUp,
      }),
    );

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 124, clientY: 112 }));
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 124, clientY: 112 }));

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingDragMove).toHaveBeenCalledWith(124, 112, 'mouse');
    expect(onDrawingDragCancel).toHaveBeenCalledOnce();
    expect(onDrawingDragCancel).toHaveBeenCalledWith('mouse');
    expect(onDrawingDragEnd).not.toHaveBeenCalled();
    expect(onMouseUp).toHaveBeenCalledOnce();

    manager.dispose();
  });

  it('does not promote pending mouse drawing drags on window blur', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const onDrawingDragEnd = vi.fn();
    const onDrawingDragCancel = vi.fn();
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd,
        onDrawingDragCancel,
      }),
    );

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));

    expect(onDrawingDragPending).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).not.toHaveBeenCalled();
    expect(onDrawingDragMove).not.toHaveBeenCalled();
    expect(onDrawingDragCancel).not.toHaveBeenCalled();
    expect(onDrawingDragEnd).not.toHaveBeenCalled();

    manager.dispose();
  });

  it('passes Shift placement constraints through pending mouse drags', () => {
    const container = createContainer();
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd: vi.fn(),
      }),
    );

    container.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100, shiftKey: true }),
    );
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 130, clientY: 110, shiftKey: true }));

    expect(onDrawingDragPending).toHaveBeenCalledWith(100, 100, 'mouse', {
      constrainedPlacement: true,
      duplicateOnDrag: true,
    });
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'mouse', {
      constrainedPlacement: true,
      duplicateOnDrag: true,
    });
    expect(onDrawingDragMove).toHaveBeenCalledWith(130, 110, 'mouse', {
      constrainedPlacement: true,
      duplicateOnDrag: true,
    });

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 130, clientY: 110 }));
    manager.dispose();
  });

  it('promotes pending drawing drags on mouseup when no move frame was processed', () => {
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
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 130, clientY: 110 }));

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledOnce();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'mouse');
    expect(onDrawingDragMove).toHaveBeenCalledOnce();
    expect(onDrawingDragMove).toHaveBeenCalledWith(130, 110, 'mouse');
    expect(onDrawingDragEnd).toHaveBeenCalledOnce();
    expect(onDrawingDragEnd).toHaveBeenCalledWith('mouse');

    manager.dispose();
  });

  it('promotes pending touch drawing drags after movement without firing tap input', () => {
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

    const startTouch = createTouch(container, { clientX: 100, clientY: 100 });
    const moveTouch = createTouch(container, { clientX: 130, clientY: 110 });
    dispatchTouchEvent(container, 'touchstart', [startTouch], [startTouch]);
    dispatchTouchEvent(container, 'touchmove', [moveTouch], [moveTouch]);
    dispatchTouchEvent(container, 'touchend', [], [moveTouch]);

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledOnce();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'touch');
    expect(onDrawingDragMove).toHaveBeenCalledOnce();
    expect(onDrawingDragMove).toHaveBeenCalledWith(130, 110, 'touch');
    expect(onDrawingDragEnd).toHaveBeenCalledOnce();
    expect(onDrawingDragEnd).toHaveBeenCalledWith('touch');

    manager.dispose();
  });

  it('promotes pending touch drawing drags on touchend when the move frame has not run', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

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

    const startTouch = createTouch(container, { clientX: 100, clientY: 100 });
    const moveTouch = createTouch(container, { clientX: 130, clientY: 110 });
    dispatchTouchEvent(container, 'touchstart', [startTouch], [startTouch]);
    dispatchTouchEvent(container, 'touchmove', [moveTouch], [moveTouch]);
    dispatchTouchEvent(container, 'touchend', [], [moveTouch]);

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledOnce();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'touch');
    expect(onDrawingDragMove).toHaveBeenCalledOnce();
    expect(onDrawingDragMove).toHaveBeenCalledWith(130, 110, 'touch');
    expect(onDrawingDragEnd).toHaveBeenCalledOnce();
    expect(onDrawingDragEnd).toHaveBeenCalledWith('touch');

    for (const callback of rafCallbacks) {
      callback(0);
    }
    expect(onDrawingDragStart).toHaveBeenCalledOnce();
    expect(onDrawingDragMove).toHaveBeenCalledOnce();

    manager.dispose();
  });

  it('lets drawing input preserve or release touch double-tap edit routing', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const getPaneAtY = vi.fn(() => ({ paneId: 'main', yMin: 0, yMax: 100, paneHeight: 600 }));
    const onPaneDoubleClick = vi.fn();
    const onDrawingInput = vi
      .fn()
      .mockReturnValueOnce({ handled: true })
      .mockReturnValueOnce({ handled: true })
      .mockReturnValueOnce({ handled: true, allowPaneDoubleClick: true })
      .mockReturnValueOnce({ handled: true, allowPaneDoubleClick: true });
    const manager = new EventManager(
      container,
      createCallbacks({
        getPaneAtY,
        onDrawingInput,
        onPaneDoubleClick,
      }),
    );

    const firstTouch = createTouch(container, { clientX: 100, clientY: 100 });
    vi.setSystemTime(1_000);
    dispatchTouchEvent(container, 'touchstart', [firstTouch], [firstTouch]);
    dispatchTouchEvent(container, 'touchend', [], [firstTouch]);
    vi.setSystemTime(1_100);
    dispatchTouchEvent(container, 'touchstart', [firstTouch], [firstTouch]);
    dispatchTouchEvent(container, 'touchend', [], [firstTouch]);

    expect(onDrawingInput).toHaveBeenCalledTimes(2);
    expect(onPaneDoubleClick).not.toHaveBeenCalled();

    const secondTouch = createTouch(container, { clientX: 120, clientY: 120 });
    vi.setSystemTime(2_000);
    dispatchTouchEvent(container, 'touchstart', [secondTouch], [secondTouch]);
    dispatchTouchEvent(container, 'touchend', [], [secondTouch]);
    vi.setSystemTime(2_100);
    dispatchTouchEvent(container, 'touchstart', [secondTouch], [secondTouch]);
    dispatchTouchEvent(container, 'touchend', [], [secondTouch]);

    expect(onDrawingInput).toHaveBeenCalledTimes(4);
    expect(onPaneDoubleClick).toHaveBeenCalledOnce();
    expect(onPaneDoubleClick).toHaveBeenCalledWith('main', { x: 120, y: 120 });

    manager.dispose();
  });

  it('does not promote pending touch drawing drags on touchcancel', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

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

    const startTouch = createTouch(container, { clientX: 100, clientY: 100 });
    const moveTouch = createTouch(container, { clientX: 130, clientY: 110 });
    dispatchTouchEvent(container, 'touchstart', [startTouch], [startTouch]);
    dispatchTouchEvent(container, 'touchmove', [moveTouch], [moveTouch]);
    dispatchTouchEvent(container, 'touchcancel', [], [moveTouch]);

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).not.toHaveBeenCalled();
    expect(onDrawingDragMove).not.toHaveBeenCalled();
    expect(onDrawingDragEnd).not.toHaveBeenCalled();

    for (const callback of rafCallbacks) {
      callback(0);
    }
    expect(onDrawingDragStart).not.toHaveBeenCalled();
    expect(onDrawingDragMove).not.toHaveBeenCalled();

    manager.dispose();
  });

  it('cancels active touch drawing drags on touchcancel without ending them', () => {
    const container = createContainer();
    const onDrawingInput = vi.fn(() => true);
    const onDrawingDragPending = vi.fn(() => true);
    const onDrawingDragStart = vi.fn(() => true);
    const onDrawingDragMove = vi.fn(() => true);
    const onDrawingDragEnd = vi.fn();
    const onDrawingDragCancel = vi.fn();
    const manager = new EventManager(
      container,
      createCallbacks({
        onDrawingInput,
        onDrawingDragPending,
        onDrawingDragStart,
        onDrawingDragMove,
        onDrawingDragEnd,
        onDrawingDragCancel,
      }),
    );

    const startTouch = createTouch(container, { clientX: 100, clientY: 100 });
    const moveTouch = createTouch(container, { clientX: 130, clientY: 110 });
    dispatchTouchEvent(container, 'touchstart', [startTouch], [startTouch]);
    dispatchTouchEvent(container, 'touchmove', [moveTouch], [moveTouch]);
    dispatchTouchEvent(container, 'touchcancel', [], [moveTouch]);

    expect(onDrawingInput).not.toHaveBeenCalled();
    expect(onDrawingDragStart).toHaveBeenCalledWith(100, 100, 'touch');
    expect(onDrawingDragMove).toHaveBeenCalledWith(130, 110, 'touch');
    expect(onDrawingDragCancel).toHaveBeenCalledOnce();
    expect(onDrawingDragCancel).toHaveBeenCalledWith('touch');
    expect(onDrawingDragEnd).not.toHaveBeenCalled();

    manager.dispose();
  });
});
