import type { UserDrawingState } from '../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { ChartTopBar } from './ChartTopBar';

const baseDrawingState: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
  drawings: [],
};

describe('ChartTopBar drawing toolbar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('renders drawing tools from shared descriptors and dispatches tool changes', () => {
    const onTool = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-tools',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, activeTool: 'rectangle' },
      onUserDrawingToolSelect: onTool,
    });
    topBar.mount(document.body);

    const rectangle = document.querySelector<HTMLButtonElement>('button[aria-label="Rectangle"]');
    const trendLine = document.querySelector<HTMLButtonElement>('button[aria-label="Trend line"]');

    expect(rectangle?.getAttribute('aria-pressed')).toBe('true');
    trendLine?.click();
    expect(onTool).toHaveBeenCalledWith('trendLine');

    topBar.setUserDrawingState({ ...baseDrawingState, activeTool: 'trendLine' });
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Trend line"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );

    topBar.unmount();
  });

  it('enables selected drawing actions from drawing state', () => {
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-actions',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        activeTool: 'trendLine',
        selection: { drawingId: 'h' },
        draft: {
          tool: 'trendLine',
          paneId: 'main',
          anchors: [{ time: 1, price: 10 }],
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          startedAt: 1,
        },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            price: 10,
          },
        ],
      },
      onUserDrawingDeleteSelected: onDelete,
      onUserDrawingCancelDraft: onCancel,
      onUserDrawingClearAll: onClear,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Cancel draft drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.click();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);

    topBar.setUserDrawingState(baseDrawingState);

    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Cancel draft drawing"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.disabled).toBe(true);

    topBar.unmount();
  });

  it('dispatches selected drawing style controls', () => {
    const onStyle = vi.fn();
    const onVisibility = vi.fn();
    const onLocked = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            price: 10,
          },
        ],
      },
      onUserDrawingStyleChange: onStyle,
      onUserDrawingVisibilityChange: onVisibility,
      onUserDrawingLockedChange: onLocked,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Green line color"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="3 pixel line width"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Dashed line style"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Toggle selected drawing visibility"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Toggle selected drawing lock"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ lineColor: '#22c55e' });
    expect(onStyle).toHaveBeenCalledWith({ lineWidth: 3 });
    expect(onStyle).toHaveBeenCalledWith({ lineStyle: 'dashed' });
    expect(onVisibility).toHaveBeenCalledWith(false);
    expect(onLocked).toHaveBeenCalledWith(true, false);

    topBar.unmount();
  });

  it('allows unlocking locked selected drawings without enabling style controls', () => {
    const onStyle = vi.fn();
    const onLocked = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-locked-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: true,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            price: 10,
          },
        ],
      },
      onUserDrawingStyleChange: onStyle,
      onUserDrawingLockedChange: onLocked,
    });
    topBar.mount(document.body);

    const green = document.querySelector<HTMLButtonElement>('button[aria-label="Green line color"]');
    expect(green?.disabled).toBe(true);
    green?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Toggle selected drawing lock"]')?.click();

    expect(onStyle).not.toHaveBeenCalled();
    expect(onLocked).toHaveBeenCalledWith(false, true);

    topBar.unmount();
  });
});
