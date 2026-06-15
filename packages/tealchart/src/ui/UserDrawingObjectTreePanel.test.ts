import type { UserDrawingState } from '../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingObjectTreeModel } from '../drawings';
import { clearChartStoreCache } from '../state/chartState';
import { UserDrawingObjectTreePanel } from './UserDrawingObjectTreePanel';

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
    {
      id: 'target',
      kind: 'rectangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 2,
      updatedAt: 2,
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 45 },
        { time: 2, price: 55 },
      ],
    },
  ],
};

describe('UserDrawingObjectTreePanel', () => {
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

    new UserDrawingObjectTreePanel({
      model: resolveUserDrawingObjectTreeModel(state),
      onDispatch,
      onClose,
    });

    const element = document.querySelector<HTMLElement>('[data-tealchart-user-drawing-object-tree-panel="true"]');
    expect(element).not.toBeNull();
    expect(element?.style.position).toBe('fixed');
    expect(element?.style.right).toBe('16px');
    expect(element?.style.maxWidth).toBe('calc(100vw - 32px)');
    expect(element?.style.maxHeight).toBe('min(560px, calc(100vh - 72px))');
    expect(element?.style.overflow).toBe('hidden');

    const targetActions = element?.querySelector<HTMLElement>(
      '[data-tealchart-user-drawing-object-tree-row-actions="target"]',
    );
    expect(targetActions?.style.flexWrap).toBe('wrap');

    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    element?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(onChartClick).not.toHaveBeenCalled();
    expect(onChartContextMenu).not.toHaveBeenCalled();

    element?.querySelector<HTMLButtonElement>('[aria-label="Close drawing object tree"]')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
