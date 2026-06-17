// @vitest-environment jsdom

import type { UserDrawingState, UserDrawingTool } from '../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveDrawingToolIconName } from '../drawings';
import { clearChartStoreCache } from '../state/chartState';
import { ChartTopBar } from './ChartTopBar';
import { renderDrawingIcon } from './dom';

const baseDrawingState: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
  drawings: [],
};

const auditedPlacementToolbarTools: Array<{ tool: UserDrawingTool; label: string; categoryLabel: string }> = [
  { tool: 'trendLine', label: 'Trend line', categoryLabel: 'Lines' },
  { tool: 'rectangle', label: 'Rectangle', categoryLabel: 'Geometric Shapes' },
  { tool: 'circle', label: 'Circle', categoryLabel: 'Geometric Shapes' },
  { tool: 'ellipse', label: 'Ellipse', categoryLabel: 'Geometric Shapes' },
  { tool: 'priceRange', label: 'Price range', categoryLabel: 'Forecasting and Measurement' },
  { tool: 'datePriceRange', label: 'Date and price range', categoryLabel: 'Forecasting and Measurement' },
  { tool: 'longPosition', label: 'Long position', categoryLabel: 'Forecasting and Measurement' },
  { tool: 'brush', label: 'Brush', categoryLabel: 'Brushes' },
  { tool: 'textLabel', label: 'Text label', categoryLabel: 'Annotations' },
];

const selectionActionAnchor = {
  anchor: { x: 160, y: 80 },
  bounds: { x: 120, y: 80, width: 80, height: 40 },
  drawingIds: ['h'],
  paneIds: ['main'],
  primaryPaneId: 'main',
};

describe('ChartTopBar drawing toolbar', () => {
  function openSelectedDrawingStylePopover(): HTMLButtonElement {
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Style selected drawing"]');
    expect(trigger).not.toBeNull();
    if (trigger?.getAttribute('aria-expanded') !== 'true') {
      trigger?.click();
    }
    const expandedTrigger = document.querySelector<HTMLButtonElement>('button[aria-label="Style selected drawing"]');
    expect(expandedTrigger?.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector<HTMLElement>('[aria-label="Selected drawing style controls"]')).not.toBeNull();
    return expandedTrigger!;
  }

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

    const linesCategory = document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]');
    const shapesCategory = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Geometric Shapes drawing tools"]',
    );
    const categoryRail = document.querySelector<HTMLElement>('[aria-label="Drawing tool categories"]');
    const categoryList = document.querySelector<HTMLElement>('[aria-label="Drawing tool category list"]');

    expect(linesCategory).not.toBeNull();
    expect(shapesCategory).not.toBeNull();
    expect(categoryRail).not.toBeNull();
    expect(categoryList).not.toBeNull();
    expect(topBar.getElement().contains(categoryRail)).toBe(false);
    expect(categoryRail?.style.overflow).toBe('visible');
    expect(categoryList?.style.overflowY).toBe('auto');
    expect(categoryList?.style.maxHeight).not.toBe('');
    expect(shapesCategory?.getAttribute('aria-pressed')).toBe('true');
    expect(linesCategory?.getAttribute('aria-pressed')).toBe('false');
    expect(linesCategory?.getAttribute('aria-haspopup')).toBe('menu');
    expect(linesCategory?.getAttribute('aria-controls')).toBe('tealchart-drawing-tools-lines');
    expect(document.getElementById('tealchart-drawing-tools-lines')?.getAttribute('role')).toBe('menu');
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');
    linesCategory?.click();
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');
    linesCategory?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.textContent).toContain('Lines');
    expect(document.body.textContent).toContain('Channels');
    expect(document.body.textContent).toContain('Gann and Fibonacci');
    expect(rectangle?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Pin drawing tools"]')).not.toBeNull();
    // Flyout rows surface the keyboard hint so the hotkeys are discoverable.
    expect(trendLine?.getAttribute('title')).toBe('Trend line (Alt+T)');
    expect(rectangle?.getAttribute('title')).toBe('Rectangle');
    trendLine?.click();
    expect(onTool).toHaveBeenCalledWith('trendLine');
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');

    linesCategory?.click();
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');

    linesCategory?.click();
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');

    topBar.setUserDrawingState({ ...baseDrawingState, activeTool: 'trendLine' });
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Trend line"]')?.getAttribute('aria-pressed'),
    ).toBe('true');

    const currentShapesCategory = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Geometric Shapes drawing tools"]',
    );
    currentShapesCategory?.click();
    expect(currentShapesCategory?.getAttribute('aria-expanded')).toBe('true');
    document.querySelector<HTMLButtonElement>('button[aria-label="Rectangle"]')?.click();
    expect(onTool).toHaveBeenCalledWith('rectangle');
    topBar.setUserDrawingState({ ...baseDrawingState, activeTool: 'rectangle' });
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Rectangle"]')?.getAttribute('aria-pressed'),
    ).toBe('true');

    topBar.unmount();
  });

  it('toggles tool favorites from the flyout star buttons without selecting the tool', () => {
    const onTool = vi.fn();
    const onToggleFavorite = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-favorites',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, favoriteTools: ['trendLine'] },
      onUserDrawingToolSelect: onTool,
      onUserDrawingToggleFavoriteTool: onToggleFavorite,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]')?.click();

    const removeTrend = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove Trend line from favorites"]',
    );
    expect(removeTrend).not.toBeNull();
    expect(removeTrend?.getAttribute('aria-pressed')).toBe('true');

    const addHorizontal = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Add Horizontal line to favorites"]',
    );
    expect(addHorizontal).not.toBeNull();
    expect(addHorizontal?.getAttribute('aria-pressed')).toBe('false');

    addHorizontal?.click();
    expect(onToggleFavorite).toHaveBeenCalledWith('horizontalLine');
    removeTrend?.click();
    expect(onToggleFavorite).toHaveBeenCalledWith('trendLine');
    expect(onTool).not.toHaveBeenCalled();

    topBar.unmount();
  });

  it('dispatches audited placement tools from the rendered drawing sidebar', () => {
    const onTool = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-placement-audit-tools',
      symbol: 'BTCUSDT',
      userDrawingState: baseDrawingState,
      onUserDrawingToolSelect: onTool,
    });
    topBar.mount(document.body);

    for (const { tool, label, categoryLabel } of auditedPlacementToolbarTools) {
      const category = document.querySelector<HTMLButtonElement>(
        `button[aria-label="${categoryLabel} drawing tools"]`,
      );
      expect(category, categoryLabel).not.toBeNull();
      category?.click();

      const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      expect(button, label).not.toBeNull();
      button?.click();
      expect(onTool).toHaveBeenLastCalledWith(tool);
      expect(category?.getAttribute('aria-expanded')).toBe('false');
    }

    expect(onTool).toHaveBeenCalledTimes(auditedPlacementToolbarTools.length);
    topBar.unmount();
  });

  it('keeps a drawing tool flyout open when pinned', () => {
    const onTool = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-tools-pinned',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, activeTool: 'rectangle' },
      onUserDrawingToolSelect: onTool,
    });
    topBar.mount(document.body);

    const linesCategory = document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]');
    linesCategory?.click();
    const pinButton = document
      .getElementById('tealchart-drawing-tools-lines')
      ?.querySelector<HTMLButtonElement>('button[aria-label="Pin drawing tools"]');
    expect(pinButton).not.toBeNull();
    pinButton?.click();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Unpin drawing tools"]')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('button[aria-label="Trend line"]')?.click();
    expect(onTool).toHaveBeenCalledWith('trendLine');
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');

    topBar.unmount();
  });

  it('clears a pinned drawing tool flyout when switching categories', () => {
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-tools-pinned-switch',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, activeTool: 'trendLine' },
    });
    topBar.mount(document.body);

    const linesCategory = document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]');
    linesCategory?.click();
    document
      .getElementById('tealchart-drawing-tools-lines')
      ?.querySelector<HTMLButtonElement>('button[aria-label="Pin drawing tools"]')
      ?.click();
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('true');

    document.querySelector<HTMLButtonElement>('button[aria-label="Geometric Shapes drawing tools"]')?.click();
    expect(linesCategory?.getAttribute('aria-expanded')).toBe('false');

    topBar.setUserDrawingState({ ...baseDrawingState, activeTool: 'rectangle' });
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]')?.getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');

    topBar.unmount();
  });

  it('mounts drawing tools in a dedicated overlay parent when provided', () => {
    const overlayParent = document.createElement('div');
    const chromeParent = document.createElement('div');
    document.body.append(chromeParent, overlayParent);

    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-overlay-parent',
      symbol: 'BTCUSDT',
      userDrawingState: baseDrawingState,
      drawingOverlayParent: overlayParent,
    });
    topBar.mount(chromeParent);

    const categoryRail = document.querySelector<HTMLElement>('[aria-label="Drawing tool categories"]');
    expect(categoryRail).not.toBeNull();
    expect(overlayParent.contains(categoryRail)).toBe(true);
    expect(topBar.getElement().contains(categoryRail)).toBe(false);

    topBar.unmount();
  });

  it('toggles magnet and keep-drawing modes from the rail bottom toggles', () => {
    const onMagnet = vi.fn();
    const onStay = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-rail-toggles',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, magnetMode: 'off', stayInDrawingMode: false },
      onUserDrawingMagnetModeChange: onMagnet,
      onUserDrawingStayInDrawingModeChange: onStay,
    });
    topBar.mount(document.body);

    const magnet = document.querySelector<HTMLButtonElement>('button[aria-label="Magnet snap off"]');
    const stay = document.querySelector<HTMLButtonElement>('button[aria-label="Keep drawing mode off"]');
    expect(magnet).not.toBeNull();
    expect(stay).not.toBeNull();
    expect(magnet?.getAttribute('aria-pressed')).toBe('false');

    magnet?.click();
    expect(onMagnet).toHaveBeenCalledWith('strong');
    stay?.click();
    expect(onStay).toHaveBeenCalledWith(true);

    topBar.setUserDrawingState({ ...baseDrawingState, magnetMode: 'strong', stayInDrawingMode: true });
    const magnetOn = document.querySelector<HTMLButtonElement>('button[aria-label="Magnet snap on"]');
    expect(magnetOn?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Keep drawing mode on"]')).not.toBeNull();
    magnetOn?.click();
    expect(onMagnet).toHaveBeenCalledWith('off');

    topBar.unmount();
  });

  it('drives lock/hide/clear-all from the rail with inverse labels and a clear confirm', () => {
    const onVisibility = vi.fn();
    const onLocked = vi.fn();
    const onClear = vi.fn();
    const allHiddenLocked = {
      ...baseDrawingState,
      drawings: [
        {
          id: 'a',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: false,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    };
    const topBar = new ChartTopBar({
      chartKey: 'topbar-rail-actions',
      symbol: 'BTCUSDT',
      userDrawingState: allHiddenLocked,
      onUserDrawingVisibilityChange: onVisibility,
      onUserDrawingLockedChange: onLocked,
      onUserDrawingClearAll: onClear,
    });
    topBar.mount(document.body);

    // Everything hidden + locked: the single toggles flip to their inverse labels.
    const unlock = document.querySelector<HTMLButtonElement>('button[aria-label="Unlock all drawings"]');
    const show = document.querySelector<HTMLButtonElement>('button[aria-label="Show all drawings"]');
    expect(unlock?.getAttribute('aria-pressed')).toBe('true');
    expect(show?.getAttribute('aria-pressed')).toBe('true');
    unlock?.click();
    expect(onLocked).toHaveBeenCalledWith(false, { drawingIds: ['a'], includeLocked: true });
    show?.click();
    expect(onVisibility).toHaveBeenCalledWith(true, { drawingIds: ['a'], includeLocked: true });

    // Cancelling the confirm must not clear.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.click();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
    confirmSpy.mockRestore();

    topBar.unmount();
  });

  it('renders a draggable floating favorites bar that selects tools and reports moves', () => {
    const overlayParent = document.createElement('div');
    document.body.append(overlayParent);
    const onTool = vi.fn();
    const onMove = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-favorites-bar',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, favoriteTools: ['trendLine', 'horizontalLine'] },
      drawingOverlayParent: overlayParent,
      onUserDrawingToolSelect: onTool,
      onUserDrawingFavoriteToolbarMove: onMove,
    });
    topBar.mount(document.body);

    const bar = overlayParent.querySelector<HTMLElement>('[aria-label="Favorite drawing tools"]');
    expect(bar).not.toBeNull();
    const handle = bar?.querySelector<HTMLElement>('[aria-label="Drag favorites toolbar"]');
    expect(handle).not.toBeNull();
    const tools = Array.from(bar?.querySelectorAll('button[aria-label]') ?? []).map((b) => b.getAttribute('aria-label'));
    expect(tools).toEqual(['Trend line', 'Horizontal line']);

    bar?.querySelector<HTMLButtonElement>('button[aria-label="Trend line"]')?.click();
    expect(onTool).toHaveBeenCalledWith('trendLine');

    handle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 160, clientY: 140 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 160, clientY: 140 }));
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]?.[0]).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });

    topBar.setUserDrawingState({ ...baseDrawingState, favoriteTools: [] });
    expect(overlayParent.querySelector('[aria-label="Favorite drawing tools"]')).toBeNull();

    topBar.unmount();
  });

  it('shows the active tool icon on its category button', () => {
    const topBar = new ChartTopBar({
      chartKey: 'topbar-active-category-icon',
      symbol: 'BTCUSDT',
      userDrawingState: { ...baseDrawingState, activeTool: 'horizontalLine' },
    });
    topBar.mount(document.body);

    const expectedIcon = (tool: UserDrawingTool): string => {
      const iconName = resolveDrawingToolIconName(tool);
      return renderDrawingIcon(iconName ?? '', { size: 20 })?.outerHTML ?? '';
    };

    const linesCategory = document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]');
    expect(linesCategory?.querySelector('svg')?.outerHTML).toBe(expectedIcon('horizontalLine'));

    topBar.setUserDrawingState({ ...baseDrawingState, activeTool: 'rectangle' });
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Lines drawing tools"]')?.querySelector('svg')
        ?.outerHTML,
    ).toBe(expectedIcon('horizontalLine'));
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Geometric Shapes drawing tools"]')
        ?.querySelector('svg')?.outerHTML,
    ).toBe(expectedIcon('rectangle'));

    topBar.unmount();
  });

  it('enables selected drawing actions from drawing state', () => {
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const onMeasureModeChange = vi.fn();
    const onZoomIn = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onZOrder = vi.fn();
    const onCopy = vi.fn();
    const onProperties = vi.fn();
    const onObjectTree = vi.fn();
    const onTextEdit = vi.fn();
    const onVisibility = vi.fn();
    const onLocked = vi.fn();
    const onDuplicateEditDrag = vi.fn();
    const onSaveDefault = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-actions',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        activeTool: 'trendLine',
        selection: { drawingId: 'h' },
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
      userDrawingCommandAvailability: { canUndo: true, canRedo: true },
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingDuplicateSelected: onDuplicate,
      onUserDrawingDuplicateEditDragChange: onDuplicateEditDrag,
      onUserDrawingSaveSelectedStyleAsDefault: onSaveDefault,
      onUserDrawingCopySelected: onCopy,
      onUserDrawingDeleteSelected: onDelete,
      onUserDrawingCancelDraft: onCancel,
      onUserDrawingClearAll: onClear,
      onUserDrawingMeasureModeChange: onMeasureModeChange,
      onUserDrawingZoomIn: onZoomIn,
      onUserDrawingUndo: onUndo,
      onUserDrawingRedo: onRedo,
      onUserDrawingZOrderChange: onZOrder,
      onUserDrawingPropertiesOpen: onProperties,
      onUserDrawingObjectTreeOpen: onObjectTree,
      onUserDrawingTextEditOpen: onTextEdit,
      onUserDrawingVisibilityChange: onVisibility,
      onUserDrawingLockedChange: onLocked,
    });
    const chartSurface = document.createElement('div');
    const chartGestureTarget = document.createElement('button');
    chartGestureTarget.setAttribute('aria-label', 'Chart gesture target');
    chartSurface.appendChild(chartGestureTarget);
    document.body.appendChild(chartSurface);
    topBar.mount(chartSurface);

    const selectedActionSurface = document.querySelector<HTMLElement>('[aria-label="Selected drawing actions"]');
    expect(selectedActionSurface).not.toBeNull();
    expect(selectedActionSurface?.style.pointerEvents).toBe('auto');

    const onSurfaceMouseDownFallthrough = vi.fn();
    const onSurfaceMouseUpFallthrough = vi.fn();
    const onSurfaceClickFallthrough = vi.fn();
    document.body.addEventListener('mousedown', onSurfaceMouseDownFallthrough);
    document.body.addEventListener('mouseup', onSurfaceMouseUpFallthrough);
    document.body.addEventListener('click', onSurfaceClickFallthrough);
    selectedActionSurface?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    selectedActionSurface?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    selectedActionSurface?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSurfaceMouseDownFallthrough).not.toHaveBeenCalled();
    expect(onSurfaceMouseUpFallthrough).not.toHaveBeenCalled();
    expect(onSurfaceClickFallthrough).not.toHaveBeenCalled();
    document.body.removeEventListener('mousedown', onSurfaceMouseDownFallthrough);
    document.body.removeEventListener('mouseup', onSurfaceMouseUpFallthrough);
    document.body.removeEventListener('click', onSurfaceClickFallthrough);

    const onChartAreaClick = vi.fn();
    chartSurface.addEventListener('click', onChartAreaClick);
    chartGestureTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChartAreaClick).toHaveBeenCalledTimes(1);
    chartSurface.removeEventListener('click', onChartAreaClick);

    document.querySelector<HTMLButtonElement>('button[aria-label="Open selected drawing properties"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Open drawing object tree"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Copy selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate while dragging selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Set as default style for this drawing type"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bring selected drawing forward"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Send selected drawing backward"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Bring selected drawing to front"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Send selected drawing to back"]')?.click();

    expect(onProperties).toHaveBeenCalledTimes(1);
    expect(onObjectTree).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDuplicateEditDrag).toHaveBeenCalledWith(true);
    expect(onSaveDefault).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onZOrder).toHaveBeenCalledWith('bringForward');
    expect(onZOrder).toHaveBeenCalledWith('sendBackward');
    expect(onZOrder).toHaveBeenCalledWith('bringToFront');
    expect(onZOrder).toHaveBeenCalledWith('sendToBack');

    topBar.setUserDrawingState({
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
        {
          id: 'hidden-locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: false,
          locked: true,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 12,
        },
      ],
    });
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')).toBeNull();
    document.querySelector<HTMLButtonElement>('button[aria-label="Undo drawing command"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Redo drawing command"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Cancel draft drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Measure date and price range"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')?.click();
    // Mixed state (one visible+unlocked, one hidden+locked): the rail shows the
    // single "lock all" / "hide all" toggles, not their inverse labels.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Hide all drawings"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Lock all drawings"]')?.click();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Show all drawings"]')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Unlock all drawings"]')).toBeNull();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onMeasureModeChange).toHaveBeenCalledWith(true);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onVisibility).toHaveBeenCalledWith(false, { drawingIds: ['h', 'hidden-locked'], includeLocked: true });
    expect(onLocked).toHaveBeenCalledWith(true, { drawingIds: ['h', 'hidden-locked'] });
    confirmSpy.mockRestore();

    topBar.setUserDrawingState({
      ...baseDrawingState,
      measureMode: 'on',
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });
    document.querySelector<HTMLButtonElement>('button[aria-label="Measure date and price range"]')?.click();
    expect(onMeasureModeChange).toHaveBeenCalledWith(false);
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Measure date and price range"]')?.getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    document.querySelector<HTMLButtonElement>('button[aria-label="Edit drawing text"]')?.click();
    expect(onTextEdit).toHaveBeenCalledWith('label');

    topBar.setUserDrawingState(baseDrawingState);

    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Cancel draft drawing"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')?.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Clear all drawings"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Hide all drawings"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Lock all drawings"]')?.disabled).toBe(true);

    topBar.unmount();
    chartSurface.remove();
  });

  it('rerenders drawing toolbar undo and redo availability changes', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-undo-redo-availability',
      symbol: 'BTCUSDT',
      userDrawingState: baseDrawingState,
      userDrawingCommandAvailability: { canUndo: false, canRedo: false },
      onUserDrawingUndo: onUndo,
      onUserDrawingRedo: onRedo,
    });
    topBar.mount(document.body);

    const getUndo = () => document.querySelector<HTMLButtonElement>('button[aria-label="Undo drawing command"]');
    const getRedo = () => document.querySelector<HTMLButtonElement>('button[aria-label="Redo drawing command"]');

    expect(getUndo()?.disabled).toBe(true);
    expect(getRedo()?.disabled).toBe(true);

    topBar.setUserDrawingCommandAvailability({ canUndo: true, canRedo: false });
    getUndo()?.click();
    getRedo()?.click();
    expect(getUndo()?.disabled).toBe(false);
    expect(getRedo()?.disabled).toBe(true);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();

    topBar.setUserDrawingCommandAvailability({ canUndo: false, canRedo: true });
    getUndo()?.click();
    getRedo()?.click();
    expect(getUndo()?.disabled).toBe(true);
    expect(getRedo()?.disabled).toBe(false);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);

    topBar.unmount();
  });

  it('exposes local text edit only for selected text drawings while keeping properties reachable', () => {
    const onProperties = vi.fn();
    const onTextEdit = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-selected-text-action-parity',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
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
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingPropertiesOpen: onProperties,
      onUserDrawingTextEditOpen: onTextEdit,
    });
    topBar.mount(document.body);

    document.querySelector<HTMLButtonElement>('button[aria-label="Open selected drawing properties"]')?.click();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Edit drawing text"]')?.disabled).toBe(true);
    expect(onProperties).toHaveBeenCalledTimes(1);

    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });

    document.querySelector<HTMLButtonElement>('button[aria-label="Edit drawing text"]')?.click();
    expect(onTextEdit).toHaveBeenCalledWith('label');
    document.querySelector<HTMLButtonElement>('button[aria-label="Open selected drawing properties"]')?.click();
    expect(onProperties).toHaveBeenCalledTimes(2);

    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'locked-label' },
      drawings: [
        {
          id: 'locked-label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Locked',
          textAlign: 'center',
        },
      ],
    });

    document.querySelector<HTMLButtonElement>('button[aria-label="Edit drawing text"]')?.click();
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Edit drawing text"]')?.disabled).toBe(true);
    expect(onTextEdit).toHaveBeenCalledTimes(1);
    document.querySelector<HTMLButtonElement>('button[aria-label="Open selected drawing properties"]')?.click();
    expect(onProperties).toHaveBeenCalledTimes(3);

    topBar.unmount();
  });

  it('dispatches selected drawing style controls', () => {
    const onStyle = vi.fn();
    const onVisibility = vi.fn();
    const onLocked = vi.fn();
    const onTextAlign = vi.fn();
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
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingStyleChange: onStyle,
      onUserDrawingTextAlignChange: onTextAlign,
      onUserDrawingVisibilityChange: onVisibility,
      onUserDrawingLockedChange: onLocked,
    });
    topBar.mount(document.body);

    openSelectedDrawingStylePopover();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing line color to #22c55e"]')
      ?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="75 percent opacity"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Hide selected drawing border"]')?.click();
    expect(document.querySelector<HTMLElement>('[aria-label="Selected drawing style controls"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('button[aria-label="Duplicate selected drawing"]')?.click();
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Style selected drawing"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
    expect(document.querySelector<HTMLElement>('[aria-label="Selected drawing style controls"]')).toBeNull();
    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'h2' },
      drawings: [
        {
          id: 'h2',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          price: 11,
        },
      ],
    });
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Style selected drawing"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
    expect(document.querySelector<HTMLElement>('[aria-label="Selected drawing style controls"]')).toBeNull();
    openSelectedDrawingStylePopover();
    document.querySelector<HTMLButtonElement>('button[aria-label="Hide selected drawing"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Lock selected drawing"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ lineColor: '#22c55e' });
    expect(onStyle).toHaveBeenCalledWith({ opacity: 0.75 });
    expect(onStyle).toHaveBeenCalledWith({ lineVisible: false });
    expect(onVisibility).toHaveBeenCalledWith(false);
    expect(onLocked).toHaveBeenCalledWith(true, undefined);

    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'marker' },
      drawings: [
        {
          id: 'marker',
          kind: 'highlighter',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 8, lineStyle: 'solid', opacity: 0.35 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });
    openSelectedDrawingStylePopover();
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Medium highlighter stroke width"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="35 percent highlighter opacity"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');

    topBar.setUserDrawingState({
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
    });
    openSelectedDrawingStylePopover();
    document
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Cycle selected drawing fill color to rgba(34, 197, 94, 0.12)"]',
      )
      ?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Hide selected drawing fill"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(34, 197, 94, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ fillVisible: false });

    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
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
            textColor: '#f5c542',
            fontSize: 14,
            fontFamily: 'sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
          },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });
    openSelectedDrawingStylePopover();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing text color to #22c55e"]')
      ?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="12 pixel font size"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="16 pixel font size"]')?.click();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing font family to serif"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing font weight to bold"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing font style to italic"]')
      ?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Underline selected drawing text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Strike selected drawing text"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="Wrap selected drawing text"]')?.click();
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing text alignment to right"]')
      ?.click();

    expect(onStyle).toHaveBeenCalledWith({ textColor: '#22c55e' });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 12 });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 16 });
    expect(onStyle).toHaveBeenCalledWith({ fontFamily: 'serif' });
    expect(onStyle).toHaveBeenCalledWith({ fontWeight: 'bold' });
    expect(onStyle).toHaveBeenCalledWith({ fontStyle: 'italic' });
    expect(onStyle).toHaveBeenCalledWith({ textUnderline: true });
    expect(onStyle).toHaveBeenCalledWith({ textLineThrough: true });
    expect(onStyle).toHaveBeenCalledWith({ textWrap: true, textMaxWidth: 180 });
    expect(onTextAlign).toHaveBeenCalledWith('right');

    topBar.setUserDrawingState({
      ...baseDrawingState,
      selection: { drawingId: 'wrapped-label' },
      drawings: [
        {
          id: 'wrapped-label',
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
            textWrap: true,
            textMaxWidth: 180,
          },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });
    openSelectedDrawingStylePopover();
    document.querySelector<HTMLButtonElement>('button[aria-label="120 pixel text box width"]')?.click();
    document.querySelector<HTMLButtonElement>('button[aria-label="240 pixel text box width"]')?.click();

    expect(onStyle).toHaveBeenCalledWith({ textMaxWidth: 120 });
    expect(onStyle).toHaveBeenCalledWith({ textMaxWidth: 240 });

    topBar.unmount();
  });

  it('dismisses selected style popovers from outside chart gestures without swallowing them', () => {
    const chartSurface = document.createElement('div');
    const chartGestureTarget = document.createElement('button');
    chartGestureTarget.setAttribute('aria-label', 'Chart gesture target');
    chartSurface.appendChild(chartGestureTarget);
    document.body.appendChild(chartSurface);
    const onChartMouseDown = vi.fn();
    chartSurface.addEventListener('mousedown', onChartMouseDown);
    const topBar = new ChartTopBar({
      chartKey: 'topbar-selected-style-outside-dismiss',
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
      userDrawingSelectionActionAnchor: selectionActionAnchor,
    });
    topBar.mount(chartSurface);

    openSelectedDrawingStylePopover();
    chartGestureTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onChartMouseDown).toHaveBeenCalledTimes(1);
    expect(
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Style selected drawing"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
    expect(document.querySelector<HTMLElement>('[aria-label="Selected drawing style controls"]')).toBeNull();

    topBar.unmount();
    chartSurface.remove();
  });

  it('clamps selected style popovers inside the overlay height', () => {
    const overlay = document.createElement('div');
    overlay.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 360,
        bottom: 240,
        width: 360,
        height: 240,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(overlay);
    const bottomAnchor = {
      ...selectionActionAnchor,
      anchor: { x: 160, y: 230 },
    };
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-style-bottom-clamp',
      symbol: 'BTCUSDT',
      drawingOverlayParent: overlay,
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
      userDrawingSelectionActionAnchor: bottomAnchor,
    });
    topBar.mount(document.body);

    openSelectedDrawingStylePopover();
    const selectedActionSurface = document.querySelector<HTMLElement>('[aria-label="Selected drawing actions"]');
    expect(Number.parseFloat(selectedActionSurface?.style.top ?? 'NaN')).toBeLessThanOrEqual(124);

    topBar.unmount();
  });

  it('keeps selected actions clear of the top bar, left drawing rail, and symbol legend when space allows', () => {
    const overlay = document.createElement('div');
    overlay.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 720,
        bottom: 360,
        width: 720,
        height: 360,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(overlay);
    const topLeftAnchor = {
      ...selectionActionAnchor,
      anchor: { x: 12, y: 24 },
      bounds: { x: 0, y: 24, width: 24, height: 24 },
    };
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-selected-left-rail-clamp',
      symbol: 'BTCUSDT',
      drawingOverlayParent: overlay,
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
      userDrawingSelectionActionAnchor: topLeftAnchor,
    });
    topBar.mount(document.body);

    const selectedActionSurface = document.querySelector<HTMLElement>('[aria-label="Selected drawing actions"]');
    expect(Number.parseFloat(selectedActionSurface?.style.left ?? 'NaN')).toBe(66);
    // Anchor sits under the top-left legend (y 40..84), so the surface drops below it.
    expect(Number.parseFloat(selectedActionSurface?.style.top ?? 'NaN')).toBe(90);

    topBar.unmount();
  });

  it('keeps selected actions inside constrained overlay widths when full rail avoidance cannot fit', () => {
    const overlay = document.createElement('div');
    overlay.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 340,
        bottom: 240,
        width: 340,
        height: 240,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(overlay);
    const topLeftAnchor = {
      ...selectionActionAnchor,
      anchor: { x: 12, y: 24 },
      bounds: { x: 0, y: 24, width: 24, height: 24 },
    };
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-selected-constrained-left-clamp',
      symbol: 'BTCUSDT',
      drawingOverlayParent: overlay,
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
      userDrawingSelectionActionAnchor: topLeftAnchor,
    });
    topBar.mount(document.body);

    try {
      const selectedActionSurface = document.querySelector<HTMLElement>('[aria-label="Selected drawing actions"]');
      expect(Number.parseFloat(selectedActionSurface?.style.left ?? 'NaN')).toBe(28);
      // Anchor sits under the top-left legend (y 40..84), so the surface drops below it.
      expect(Number.parseFloat(selectedActionSurface?.style.top ?? 'NaN')).toBe(90);
    } finally {
      topBar.unmount();
    }
  });

  it('dispatches hidden selected drawing show control', () => {
    const onVisibility = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-hidden-drawing-style',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: false,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            price: 10,
          },
        ],
      },
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingVisibilityChange: onVisibility,
    });
    topBar.mount(document.body);

    const hide = document.querySelector<HTMLButtonElement>('button[aria-label="Hide selected drawing"]');
    const show = document.querySelector<HTMLButtonElement>('button[aria-label="Show selected drawing"]');
    expect(hide?.disabled).toBe(true);
    expect(show?.disabled).toBe(false);
    hide?.click();
    show?.click();

    expect(onVisibility).toHaveBeenCalledTimes(1);
    expect(onVisibility).toHaveBeenCalledWith(true);

    topBar.unmount();
  });

  it('dispatches selected trend-line extension controls only for trend lines', () => {
    const onExtend = vi.fn();
    const topBar = new ChartTopBar({
      chartKey: 'topbar-drawing-trend-extend',
      symbol: 'BTCUSDT',
      userDrawingState: {
        ...baseDrawingState,
        selection: { drawingId: 'trend' },
        drawings: [
          {
            id: 'trend',
            kind: 'trendLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            points: [
              { time: 1, price: 10 },
              { time: 2, price: 12 },
            ],
            extend: 'none',
          },
        ],
      },
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingTrendLineExtendChange: onExtend,
    });
    topBar.mount(document.body);

    openSelectedDrawingStylePopover();
    const extendCallsBefore = onExtend.mock.calls.length;
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Cycle selected trend line extension to left"]')
      ?.click();
    expect(onExtend).toHaveBeenCalledTimes(extendCallsBefore + 1);
    expect(onExtend).toHaveBeenLastCalledWith('left');

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
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingIconNameChange: onIconName,
    });
    topBar.mount(document.body);

    openSelectedDrawingStylePopover();
    const iconCallsBefore = onIconName.mock.calls.length;
    document.querySelector<HTMLButtonElement>('button[aria-label="Cycle selected drawing icon to circle"]')?.click();

    expect(onIconName).toHaveBeenCalledTimes(iconCallsBefore + 1);
    expect(onIconName).toHaveBeenLastCalledWith('circle');

    topBar.unmount();
  });

  it('disables locked selected drawing style controls and one-way actions', () => {
    const onStyle = vi.fn();
    const onLocked = vi.fn();
    const onDeleteSelected = vi.fn();
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
      userDrawingSelectionActionAnchor: selectionActionAnchor,
      onUserDrawingStyleChange: onStyle,
      onUserDrawingLockedChange: onLocked,
      onUserDrawingDeleteSelected: onDeleteSelected,
    });
    topBar.mount(document.body);

    const deleteSelected = document.querySelector<HTMLButtonElement>('button[aria-label="Delete selected drawing"]');
    expect(deleteSelected?.disabled).toBe(true);
    deleteSelected?.click();
    const lock = document.querySelector<HTMLButtonElement>('button[aria-label="Lock selected drawing"]');
    expect(lock?.disabled).toBe(true);
    lock?.click();
    const unlock = document.querySelector<HTMLButtonElement>('button[aria-label="Unlock selected drawing"]');
    expect(unlock?.disabled).toBe(false);
    unlock?.click();

    expect(onStyle).not.toHaveBeenCalled();
    expect(onDeleteSelected).not.toHaveBeenCalled();
    expect(onLocked).toHaveBeenCalledWith(false, { includeLocked: true });

    topBar.unmount();
  });
});
