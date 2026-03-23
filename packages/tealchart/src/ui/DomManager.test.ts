import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DomManager } from './DomManager';

// ---------------------------------------------------------------------------
// Element creation
// ---------------------------------------------------------------------------

describe('DomManager — element creation', () => {
  it('div() creates an HTMLDivElement', () => {
    const dm = new DomManager();
    const el = dm.div();
    expect(el).toBeInstanceOf(HTMLDivElement);
    dm.dispose();
  });

  it('span() creates an HTMLSpanElement', () => {
    const dm = new DomManager();
    const el = dm.span();
    expect(el).toBeInstanceOf(HTMLSpanElement);
    dm.dispose();
  });

  it('button() creates an HTMLButtonElement', () => {
    const dm = new DomManager();
    const el = dm.button();
    expect(el).toBeInstanceOf(HTMLButtonElement);
    dm.dispose();
  });

  it('created elements accept props', () => {
    const dm = new DomManager();
    const el = dm.div({ className: 'test-class', text: 'hello' });
    expect(el.className).toBe('test-class');
    expect(el.textContent).toBe('hello');
    dm.dispose();
  });

  it('created elements are tracked and removed on dispose', () => {
    const dm = new DomManager();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const el = dm.div();
    container.appendChild(el);
    expect(container.contains(el)).toBe(true);

    dm.dispose();
    expect(container.contains(el)).toBe(false);

    container.remove();
  });
});

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

describe('DomManager — event binding', () => {
  it('on() attaches event listener', () => {
    const dm = new DomManager();
    const el = dm.div();
    const handler = vi.fn();

    dm.on(el, 'click', handler);
    el.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalledTimes(1);
    dm.dispose();
  });

  it('dispose() removes event listeners', () => {
    const dm = new DomManager();
    const el = dm.div();
    const handler = vi.fn();

    dm.on(el, 'click', handler);
    dm.dispose();

    el.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Intervals
// ---------------------------------------------------------------------------

describe('DomManager — intervals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('setInterval() runs handler on schedule', () => {
    const dm = new DomManager();
    const handler = vi.fn();

    dm.setInterval(handler, 100);
    vi.advanceTimersByTime(350);

    expect(handler).toHaveBeenCalledTimes(3);
    dm.dispose();
  });

  it('dispose() clears intervals', () => {
    const dm = new DomManager();
    const handler = vi.fn();

    dm.setInterval(handler, 100);
    dm.dispose();

    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------------

describe('DomManager — remove()', () => {
  it('removes specific element from DOM', () => {
    const dm = new DomManager();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const el1 = dm.div({ text: 'first' });
    const el2 = dm.div({ text: 'second' });
    container.appendChild(el1);
    container.appendChild(el2);

    dm.remove(el1);

    expect(container.contains(el1)).toBe(false);
    expect(container.contains(el2)).toBe(true);

    dm.dispose();
    container.remove();
  });

  it("removes that element's listeners but keeps others", () => {
    const dm = new DomManager();
    const el1 = dm.div();
    const el2 = dm.div();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    dm.on(el1, 'click', handler1);
    dm.on(el2, 'click', handler2);

    dm.remove(el1);

    el1.dispatchEvent(new Event('click'));
    el2.dispatchEvent(new Event('click'));

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);

    dm.dispose();
  });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------

describe('DomManager — dispose()', () => {
  it('removes all tracked elements from DOM', () => {
    const dm = new DomManager();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const el1 = dm.div();
    const el2 = dm.span();
    const el3 = dm.button();
    container.appendChild(el1);
    container.appendChild(el2);
    container.appendChild(el3);

    dm.dispose();

    expect(container.children.length).toBe(0);
    container.remove();
  });

  it('unbinds all event listeners', () => {
    const dm = new DomManager();
    const el = dm.div();
    const handler = vi.fn();

    dm.on(el, 'click', handler);
    dm.on(el, 'mousedown', handler);
    dm.dispose();

    el.dispatchEvent(new Event('click'));
    el.dispatchEvent(new Event('mousedown'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all intervals', () => {
    vi.useFakeTimers();

    const dm = new DomManager();
    const h1 = vi.fn();
    const h2 = vi.fn();

    dm.setInterval(h1, 50);
    dm.setInterval(h2, 100);
    dm.dispose();

    vi.advanceTimersByTime(500);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('can be called multiple times safely', () => {
    const dm = new DomManager();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const el = dm.div();
    container.appendChild(el);

    expect(() => {
      dm.dispose();
      dm.dispose();
      dm.dispose();
    }).not.toThrow();

    container.remove();
  });
});
