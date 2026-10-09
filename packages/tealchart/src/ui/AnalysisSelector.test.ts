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

function fixture() {
  const root = document.createElement('div');
  document.body.append(root);
  Object.defineProperties(root, { clientWidth: { value: 1020 }, clientHeight: { value: 600 } });
  root.getBoundingClientRect = () => ({ left: 40, top: 60, width: 2040, height: 1200 }) as DOMRect;
  const handler = vi.fn();
  let geometry = frame;
  selector = new AnalysisSelector({
    container: root,
    getFrame: () => geometry,
    canStart: () => true,
    onAnalysisRequest: handler,
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
  };
}

describe('web analysis controls', () => {
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
