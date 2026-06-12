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
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const onZOrder = vi.fn();
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
            id: 'back',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            price: 8,
          },
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
          {
            id: 'front',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            price: 12,
          },
        ],
      },
      onUserDrawingDuplicateSelected: onDuplicate,
      onUserDrawingDeleteSelected: onDelete,
      onUserDrawingCancelDraft: onCancel,
      onUserDrawingClearAll: onClear,
      onUserDrawingZOrderChange: onZOrder,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bring selected drawing forward"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Send selected drawing backward"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bring selected drawing to front"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Send selected drawing to back"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Cancel draft drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.click();

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onZOrder).toHaveBeenCalledWith('bringForward');
    expect(onZOrder).toHaveBeenCalledWith('sendBackward');
    expect(onZOrder).toHaveBeenCalledWith('bringToFront');
    expect(onZOrder).toHaveBeenCalledWith('sendToBack');

    topBar.setUserDrawingState(baseDrawingState);

    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')?.disabled).toBe(
      true,
    );
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
    document.querySelector<HTMLButtonElement>('button[aria-label="50 percent opacity"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Toggle drawing border"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Hide selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Lock selected drawing"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ lineColor: '#22c55e' });
    expect(onStyle).toHaveBeenCalledWith({ lineWidth: 3 });
    expect(onStyle).toHaveBeenCalledWith({ lineStyle: 'dashed' });
    expect(onStyle).toHaveBeenCalledWith({ opacity: 0.5 });
    expect(onStyle).toHaveBeenCalledWith({ lineVisible: false });
    expect(onVisibility).toHaveBeenCalledWith(false);
    expect(onLocked).toHaveBeenCalledWith(true, undefined);

    topBar.unmount();
  });

  it('dispatches selected rectangle fill style controls', () => {
    const onStyle = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-fill-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'rect' },
        drawings: [
          {
            id: 'rect',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
              fillColor: 'rgba(245, 197, 66, 0.12)',
            },
            points: [
              { time: 1, price: 10 },
              { time: 2, price: 12 },
            ],
          },
        ],
      },
      onUserDrawingStyleChange: onStyle,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Green fill color"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Toggle drawing fill"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(34, 197, 94, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ fillVisible: false });
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Green text color"]')).toBeNull();

    topBar.unmount();
  });

  it('dispatches selected icon library controls without text controls', () => {
    const onIconName = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-icon-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'icon' },
        drawings: [
          {
            id: 'icon',
            kind: 'icon',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
              fillColor: 'rgba(245, 197, 66, 0.12)',
            },
            point: { time: 1, price: 10 },
            iconName: 'star',
          },
        ],
      },
      onUserDrawingIconNameChange: onIconName,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Flag icon"]')?.click();

    expect(onIconName).toHaveBeenCalledWith('flag');
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Green text color"]')).toBeNull();

    topBar.unmount();
  });

  it('dispatches selected text label fill, text color, and font size controls', () => {
    const onStyle = vi.fn();
    const onTextAlign = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-text-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'text' },
        drawings: [
          {
            id: 'text',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
              fillColor: 'rgba(245, 197, 66, 0.12)',
              textColor: '#f5c542',
              fontSize: 12,
            },
            point: { time: 1, price: 10 },
            text: 'note',
            textAlign: 'center',
          },
        ],
      },
      onUserDrawingStyleChange: onStyle,
      onUserDrawingTextAlignChange: onTextAlign,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Blue fill color"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Red text color"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="16 pixel font size"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="serif font family"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bold text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Italic text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Right text alignment"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(56, 189, 248, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ textColor: '#f43f5e' });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 16 });
    expect(onStyle).toHaveBeenCalledWith({ fontFamily: 'serif' });
    expect(onStyle).toHaveBeenCalledWith({ fontWeight: 'bold' });
    expect(onStyle).toHaveBeenCalledWith({ fontStyle: 'italic' });
    expect(onTextAlign).toHaveBeenCalledWith('right');

    topBar.unmount();
  });

  it('dispatches selected table text style controls without text alignment controls', () => {
    const onStyle = vi.fn();
    const onTextAlign = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-table-text-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'table' },
        drawings: [
          {
            id: 'table',
            kind: 'table',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
              fillColor: 'rgba(245, 197, 66, 0.12)',
              textColor: '#f5c542',
              fontSize: 12,
              fontFamily: 'sans-serif',
              fontWeight: 'normal',
            },
            point: { time: 1, price: 10 },
            textAlign: 'left',
            cells: [['Metric', 'Value']],
          },
        ],
      },
      onUserDrawingStyleChange: onStyle,
      onUserDrawingTextAlignChange: onTextAlign,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Red text color"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="16 pixel font size"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="serif font family"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bold text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Italic text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Right text alignment"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ textColor: '#f43f5e' });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 16 });
    expect(onStyle).toHaveBeenCalledWith({ fontFamily: 'serif' });
    expect(onStyle).toHaveBeenCalledWith({ fontWeight: 'bold' });
    expect(onStyle).toHaveBeenCalledWith({ fontStyle: 'italic' });
    expect(onTextAlign).toHaveBeenCalledWith('right');

    topBar.unmount();
  });

  it('disables locked selected drawing style controls and one-way actions', () => {
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
    const lock = document.querySelector<HTMLButtonElement>('button[aria-label="Lock selected drawing"]');
    expect(lock?.disabled).toBe(true);
    lock?.click();

    expect(onStyle).not.toHaveBeenCalled();
    expect(onLocked).not.toHaveBeenCalled();

    topBar.unmount();
  });
});
