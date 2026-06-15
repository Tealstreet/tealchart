import type { UserDrawingState } from '../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingPropertiesSurface } from '../drawings';
import { clearChartStoreCache } from '../state/chartState';
import { UserDrawingPropertiesPanel } from './UserDrawingPropertiesPanel';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: { drawingId: 'line' },
  draft: null,
  textEdit: null,
  drawings: [
    {
      id: 'line',
      name: 'Breakout',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      price: 50,
    },
  ],
};

describe('UserDrawingPropertiesPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('keeps the built-in panel constrained to viewport chrome and isolates chart events', () => {
    const onDispatch = vi.fn(() => true);
    const onClose = vi.fn();
    const onChartClick = vi.fn();
    const onChartContextMenu = vi.fn();
    document.body.addEventListener('click', onChartClick);
    document.body.addEventListener('contextmenu', onChartContextMenu);

    new UserDrawingPropertiesPanel({
      surface: resolveUserDrawingPropertiesSurface(state),
      onDispatch,
      onClose,
    });

    const element = document.querySelector<HTMLElement>('[data-tealchart-user-drawing-properties-panel="true"]');
    expect(element).not.toBeNull();
    expect(element?.style.position).toBe('fixed');
    expect(element?.style.right).toBe('16px');
    expect(element?.style.maxWidth).toBe('calc(100vw - 32px)');
    expect(element?.style.maxHeight).toBe('min(620px, calc(100vh - 72px))');
    expect(element?.style.overflow).toBe('hidden');

    const lineControls = element?.querySelector<HTMLElement>('[data-tealchart-user-drawing-properties-controls="line"]');
    expect(lineControls?.style.flexWrap).toBe('wrap');

    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    element?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(onChartClick).not.toHaveBeenCalled();
    expect(onChartContextMenu).not.toHaveBeenCalled();

    element?.querySelector<HTMLButtonElement>('[aria-label="Blue line color"]')?.click();
    expect(onDispatch).toHaveBeenCalledWith({ type: 'updateStyle', style: { lineColor: '#38bdf8' } });

    element?.querySelector<HTMLButtonElement>('[aria-label="Close drawing properties"]')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
