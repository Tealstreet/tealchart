import type { AnalysisSelectionFrame } from '../analysis/analysisSelection';
import type { AnalysisSelectorOptions } from './AnalysisSelector';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from '../interaction/EventManager';
import { AnalysisSelector } from './AnalysisSelector';

const frame = {
  identity: 'TEST:1:1',
  timeRange: { from: 1000, to: 2000 },
  projectionLeft: 20,
  projectionRight: 1020,
  plot: { left: 20, top: 36, width: 940, height: 400 },
};
let selector: AnalysisSelector | undefined;
afterEach(() => {
  selector?.dispose();
  selector = undefined;
  document.body.replaceChildren();
});

function fixture(options: Partial<AnalysisSelectorOptions> = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  Object.defineProperties(root, { clientWidth: { value: 1020 }, clientHeight: { value: 600 } });
  root.getBoundingClientRect = () => ({ left: 40, top: 60, width: 2040, height: 1200 }) as DOMRect;
  const handler = vi.fn();
  let geometry: AnalysisSelectionFrame = frame;
  selector = new AnalysisSelector({
    container: root,
    getFrame: () => geometry,
    canStart: () => true,
    onAnalysisRequest: handler,
    ...options,
  });
  const control = (name: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const pointer = (target: EventTarget, type: string, x: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 40 + 2 * x,
      clientY: 260,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    target.dispatchEvent(event);
  };
  return {
    root,
    handler,
    control,
    pointer,
    change: () => {
      geometry = { ...frame, identity: 'OTHER:1:2' };
      selector!.update();
    },
    setFrame: (next: AnalysisSelectionFrame) => {
      geometry = next;
      selector!.update();
    },
  };
}

describe('web analysis controls', () => {
  it('uses exact native anchor projection under CSS zoom for the requested range and highlight', () => {
    const { root, handler, control, pointer, setFrame } = fixture();
    setFrame({
      ...frame,
      timeRange: { from: 1000, to: 8000 },
      timeAnchors: [
        { time: 1000, x: 20 },
        { time: 2000, x: 420 },
        { time: 8000, x: 820 },
      ],
    });
    control('Select pattern').click();
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 420);
    pointer(window, 'pointerup', 620);
    const highlight = surface.nextElementSibling as HTMLElement;
    expect(highlight.style.left).toBe('420px');
    expect(highlight.style.width).toBe('200px');
    control('Find similar TA').click();
    expect(handler).toHaveBeenLastCalledWith({ action: 'similar', range: { from: 2000, to: 5000 } });
  });

  it('rejects synthetic controls and gesture events while keeping imperative cancellation authoritative', () => {
    const active = vi.fn();
    const { root, handler, control, pointer, change } = fixture({
      acceptsEvent: (event) => event.isTrusted,
      onActiveChange: active,
    });
    control('Analyze chart').click();
    control('Select pattern').click();
    expect(handler).not.toHaveBeenCalled();
    expect(selector!.isActive()).toBe(false);
    expect(selector!.start()).toBe(true);
    expect(active).toHaveBeenLastCalledWith(true);
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointermove', 520);
    pointer(window, 'pointerup', 520);
    control('Describe this TA pattern').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.dispatchEvent(new Event('blur'));
    document.body.dispatchEvent(new Event('focusin', { bubbles: true }));
    control('Cancel').click();
    expect(selector!.isActive()).toBe(true);
    expect(control('Find similar TA').disabled).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    change();
    expect(selector!.isActive()).toBe(false);
    expect(active).toHaveBeenLastCalledWith(false);
    expect(selector!.start()).toBe(true);
    selector!.cancel();
    expect(selector!.isActive()).toBe(false);
  });

  it('reports active transitions synchronously before focus and request callbacks, and retires every gate', () => {
    const order: string[] = [];
    const { root, control, pointer, change } = fixture({
      onActiveChange: (active) => order.push(String(active)),
      onAnalysisRequest: () => {
        expect(selector!.isActive()).toBe(false);
        order.push('request');
      },
    });
    root.addEventListener('focusin', () => order.push('focus'));
    control('Select pattern').click();
    expect(order).toEqual(['true', 'focus']);
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointerup', 520);
    control('Describe this TA pattern').click();
    expect(order.slice(-2)).toEqual(['false', 'request']);
    for (const retire of [
      () => selector!.cancel(),
      () => window.dispatchEvent(new Event('blur')),
      () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })),
      change,
      () => selector!.setHandler(undefined),
      () => selector!.dispose(),
    ]) {
      selector!.setHandler(vi.fn());
      selector!.start();
      expect(selector!.isActive()).toBe(true);
      retire();
      expect(selector!.isActive()).toBe(false);
      expect(order.at(-1)).toBe('false');
    }
    selector!.dispose();
    expect(order.filter((value) => value === 'false')).toHaveLength(8);
  });

  it('rejects unadmitted continuation and request events without changing the admitted drag', () => {
    let admitted = true;
    const { root, handler, control, pointer } = fixture({ acceptsEvent: () => admitted });
    selector!.start();
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointermove', 320);
    const highlight = surface.nextElementSibling as HTMLElement;
    expect(highlight.style.width).toBe('200px');
    admitted = false;
    pointer(window, 'pointermove', 720);
    pointer(window, 'pointerup', 720);
    pointer(window, 'pointercancel', 720);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    control('Describe this TA pattern').click();
    expect(selector!.isActive()).toBe(true);
    expect(highlight.style.width).toBe('200px');
    expect(handler).not.toHaveBeenCalled();
    admitted = true;
    pointer(window, 'pointerup', 320);
    control('Describe this TA pattern').click();
    expect(handler).toHaveBeenCalledExactlyOnceWith({ action: 'describe', range: { from: 1100, to: 1300 } });
  });

  it('clears the highlight and visibly refuses selection when native projection becomes invalid', () => {
    const { root, pointer, setFrame } = fixture();
    selector!.start();
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointerup', 520);
    const highlight = surface.nextElementSibling as HTMLElement;
    expect(highlight.style.display).toBe('block');
    setFrame({ ...frame, timeAnchors: [] });
    expect(selector!.isActive()).toBe(false);
    expect(highlight.style.display).toBe('none');
    expect(selector!.start()).toBe(false);
    expect(root.querySelector('[role="status"]')!.textContent).toContain('not ready');
  });

  it('emits visible-chart and selected-range intents and contains financial mouse events under CSS zoom', () => {
    const { root, handler, control, pointer } = fixture();
    const mouse = vi.fn();
    root.addEventListener('mouseup', mouse);
    control('Analyze chart').click();
    expect(handler).toHaveBeenLastCalledWith({ action: 'describe' });
    control('Select pattern').click();
    const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointermove', 520);
    pointer(window, 'pointerup', 520);
    surface.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    control('Find similar TA').click();
    expect(handler).toHaveBeenLastCalledWith({ action: 'similar', range: { from: 1100, to: 1500 } });
    expect(mouse).not.toHaveBeenCalled();
  });

  it('cancels a frozen range on chart changes and hides all controls when the host callback is disabled', () => {
    const { root, control, change } = fixture();
    control('Select pattern').click();
    change();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('chart changed');
    selector!.setHandler(undefined);
    expect(root.querySelector<HTMLElement>('[data-tealchart-analysis-selector]')!.style.display).toBe('none');
    expect(selector!.start()).toBe(false);
    selector!.setHandler(vi.fn());
    expect(selector!.start()).toBe(true);
    window.dispatchEvent(new Event('blur'));
    expect(root.querySelector('[role="status"]')!.textContent).toContain('lost focus');
    selector!.start();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('[role="status"]')!.textContent).toBe('');
  });

  it('revokes retired callbacks even when a detached button is retained', () => {
    const { control, handler } = fixture();
    const analyze = control('Analyze chart');
    selector!.dispose();
    analyze.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('retains the selected highlight when the host immediately focuses its prompt', () => {
    const { root, control, pointer } = fixture();
    const prompt = document.createElement('input');
    document.body.append(prompt);
    selector!.setHandler(() => prompt.focus());
    control('Select pattern').click();
    const surface = root.querySelector<HTMLElement>('[aria-label="Select chart pattern"]')!;
    pointer(surface, 'pointerdown', 120);
    pointer(window, 'pointerup', 520);
    control('Describe this TA pattern').click();
    expect(document.activeElement).toBe(prompt);
    expect(surface.style.display).toBe('none');
    expect((surface.nextElementSibling as HTMLElement).style.display).toBe('block');
    expect(root.querySelector('[role="status"]')!.textContent).toBe('');
    control('Analyze chart').click();
    expect((surface.nextElementSibling as HTMLElement).style.display).toBe('none');
  });

  it('excludes actual EventManager financial callbacks and window hotkeys while preserving normal clicks after cancellation', () => {
    const { root, control, pointer } = fixture();
    const chart = document.createElement('div');
    root.prepend(chart);
    chart.getBoundingClientRect = root.getBoundingClientRect;
    const mouseDown = vi.fn(),
      mouseUp = vi.fn(),
      onClick = vi.fn(),
      onContextMenu = vi.fn(),
      financialKey = vi.fn();
    const manager = new EventManager(chart, {
      getViewport: () => ({ startTime: 1000, endTime: 2000, priceMin: 10, priceMax: 20 }),
      getDimensions: () => ({
        width: 1020,
        height: 600,
        priceAxisWidth: 60,
        timeAxisHeight: 24,
        topMargin: 36,
        leftMargin: 20,
      }),
      onMouseDown: mouseDown,
      onMouseUp: mouseUp,
      onChartSurfaceClick: onClick,
      onContextMenu,
    });
    window.addEventListener('keydown', financialKey);
    try {
      control('Select pattern').click();
      const surface = root.querySelector('[aria-label="Select chart pattern"]')!;
      pointer(surface, 'pointerdown', 120);
      surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 280, clientY: 260 }));
      pointer(window, 'pointerup', 520);
      surface.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
      surface.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      surface.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      surface.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 10 }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }));
      expect(mouseDown).not.toHaveBeenCalled();
      expect(mouseUp).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      expect(onContextMenu).not.toHaveBeenCalled();
      expect(financialKey).not.toHaveBeenCalled();
      selector!.cancel();
      chart.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 280, clientY: 260 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 280, clientY: 260 }));
      expect(mouseDown).toHaveBeenCalledOnce();
      expect(mouseUp).toHaveBeenCalledOnce();
    } finally {
      manager.dispose();
      window.removeEventListener('keydown', financialKey);
    }
  });

  it('bounds controls to a small main pane and yields outside input focus', () => {
    const { root, control } = fixture();
    const small = { ...frame, plot: { left: 20, top: 36, width: 100, height: 60 } };
    selector!.dispose();
    selector = new AnalysisSelector({
      container: root,
      getFrame: () => small,
      canStart: () => true,
      onAnalysisRequest: vi.fn(),
    });
    control('Select pattern').click();
    const actions = control('Cancel').parentElement!;
    expect(actions.style.maxWidth).toBe('88px');
    expect(actions.style.maxHeight).toBe('48px');
    expect(Number.parseFloat(actions.style.top)).toBeGreaterThanOrEqual(42);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('lost focus');
  });
});
