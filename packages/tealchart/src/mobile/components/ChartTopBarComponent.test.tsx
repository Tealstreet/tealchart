import type { UserDrawingState, UserDrawingTool } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../../state/chartState';
import { ChartTopBarComponent } from './ChartTopBarComponent';

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

describe('ChartTopBarComponent drawing toolbar', () => {
  afterEach(() => {
    cleanup();
    clearChartStoreCache();
  });

  it('renders categorized drawing tools and dispatches tool changes', () => {
    const onTool = vi.fn();
    const { container } = render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, activeTool: 'rectangle' }}
        onUserDrawingToolSelect={onTool}
      />,
    );

    expect(container.firstElementChild?.getAttribute('data-pointer-events')).toBe('box-none');
    expect(screen.getByLabelText('Lines drawing tools')).toBeTruthy();
    expect(screen.getByLabelText('Channels drawing tools')).toBeTruthy();
    expect(screen.getByLabelText('Gann and Fibonacci drawing tools')).toBeTruthy();
    expect(screen.getByLabelText('Drawing tool category list')).toBeTruthy();
    expect(screen.getByLabelText('Geometric Shapes drawing tools').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Geometric Shapes drawing tools').getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByLabelText('Geometric Shapes drawing tools'));
    expect(screen.getByLabelText('Geometric Shapes drawing tools').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Geometric Shapes drawing tools').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Rectangle')).toBeTruthy();
    expect(screen.getByLabelText('Geometric Shapes tool list')).toBeTruthy();
    expect(screen.getByLabelText('Pin drawing tools')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close drawing tools'));
    expect(screen.queryByLabelText('Rectangle')).toBeNull();
    fireEvent.click(screen.getByLabelText('Lines drawing tools'));
    fireEvent.click(screen.getByLabelText('Trend line'));

    expect(onTool).toHaveBeenCalledWith('trendLine');

    fireEvent.click(screen.getByLabelText('Geometric Shapes drawing tools'));
    fireEvent.click(screen.getByLabelText('Rectangle'));
    expect(onTool).toHaveBeenCalledWith('rectangle');
  });

  it('toggles tool favorites from the flyout star buttons without selecting the tool', () => {
    const onTool = vi.fn();
    const onToggleFavorite = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, activeTool: 'select', favoriteTools: ['trendLine'] }}
        onUserDrawingToolSelect={onTool}
        onUserDrawingToggleFavoriteTool={onToggleFavorite}
      />,
    );

    fireEvent.click(screen.getByLabelText('Lines drawing tools'));

    const removeTrend = screen.getByLabelText('Remove Trend line from favorites');
    expect(removeTrend.getAttribute('aria-pressed')).toBe('true');
    const addHorizontal = screen.getByLabelText('Add Horizontal line to favorites');
    expect(addHorizontal.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(addHorizontal);
    expect(onToggleFavorite).toHaveBeenCalledWith('horizontalLine');
    fireEvent.click(removeTrend);
    expect(onToggleFavorite).toHaveBeenCalledWith('trendLine');
    expect(onTool).not.toHaveBeenCalled();
  });

  it('dispatches audited placement tools from the rendered mobile drawing sidebar', () => {
    const onTool = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={baseDrawingState}
        onUserDrawingToolSelect={onTool}
      />,
    );

    for (const { tool, label, categoryLabel } of auditedPlacementToolbarTools) {
      const category = screen.getByLabelText(`${categoryLabel} drawing tools`);
      fireEvent.click(category);

      fireEvent.click(screen.getByLabelText(label));
      expect(onTool).toHaveBeenLastCalledWith(tool);
      expect(category.getAttribute('aria-expanded')).toBe('false');
    }

    expect(onTool).toHaveBeenCalledTimes(auditedPlacementToolbarTools.length);
  });

  it('keeps a drawing tool flyout open when pinned', () => {
    const onTool = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, activeTool: 'rectangle' }}
        onUserDrawingToolSelect={onTool}
      />,
    );

    fireEvent.click(screen.getByLabelText('Lines drawing tools'));
    fireEvent.click(screen.getByLabelText('Pin drawing tools'));
    expect(screen.getByLabelText('Unpin drawing tools')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Trend line'));
    expect(onTool).toHaveBeenCalledWith('trendLine');
    expect(screen.getByLabelText('Trend line')).toBeTruthy();
    expect(screen.queryByLabelText('Close drawing tools')).toBeNull();

    fireEvent.click(screen.getByLabelText('Unpin drawing tools'));
    expect(screen.getByLabelText('Pin drawing tools')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Trend line'));
    expect(screen.queryByLabelText('Trend line')).toBeNull();
  });

  it('shows the active tool icon on its category button', () => {
    const { rerender } = render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, activeTool: 'horizontalLine' }}
      />,
    );

    // Color-independent geometry signature (child node tags) of a category icon.
    const iconShape = (label: string): string => {
      const svgEl = screen.getByLabelText(label).querySelector('[data-svg="svg"]');
      expect(svgEl).toBeTruthy();
      return Array.from(svgEl?.querySelectorAll('[data-svg]') ?? [])
        .map((node) => node.getAttribute('data-svg'))
        .join(',');
    };

    const linesShape = iconShape('Lines drawing tools');
    expect(linesShape.length).toBeGreaterThan(0);

    rerender(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, activeTool: 'rectangle' }}
      />,
    );

    // Lines button keeps its recent tool icon; Shapes button shows a distinct one.
    expect(iconShape('Lines drawing tools')).toBe(linesShape);
    expect(iconShape('Geometric Shapes drawing tools')).not.toBe(linesShape);
  });

  it('dispatches global drawing actions from shared toolbar descriptors', () => {
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const onMeasureModeChange = vi.fn();
    const onZoomIn = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onZOrder = vi.fn();
    const onVisibility = vi.fn();
    const onLocked = vi.fn();
    const { rerender } = render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
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
              visible: false,
              locked: true,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 12,
            },
          ],
        }}
        userDrawingCommandAvailability={{ canUndo: true, canRedo: true }}
        onUserDrawingDuplicateSelected={onDuplicate}
        onUserDrawingDeleteSelected={onDelete}
        onUserDrawingUndo={onUndo}
        onUserDrawingRedo={onRedo}
        onUserDrawingCancelDraft={onCancel}
        onUserDrawingClearAll={onClear}
        onUserDrawingMeasureModeChange={onMeasureModeChange}
        onUserDrawingZoomIn={onZoomIn}
        onUserDrawingZOrderChange={onZOrder}
        onUserDrawingVisibilityChange={onVisibility}
        onUserDrawingLockedChange={onLocked}
      />,
    );

    expect(screen.queryByLabelText('Duplicate selected drawing')).toBeNull();
    expect(screen.queryByLabelText('Delete selected drawing')).toBeNull();
    expect(screen.queryByLabelText('Bring selected drawing forward')).toBeNull();
    expect(screen.queryByLabelText('Send selected drawing backward')).toBeNull();
    expect(screen.queryByLabelText('Bring selected drawing to front')).toBeNull();
    expect(screen.queryByLabelText('Send selected drawing to back')).toBeNull();
    fireEvent.click(screen.getByLabelText('Undo drawing command'));
    fireEvent.click(screen.getByLabelText('Redo drawing command'));
    fireEvent.click(screen.getByLabelText('Cancel draft drawing'));
    fireEvent.click(screen.getByLabelText('Measure date and price range'));
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Clear all drawings'));
    fireEvent.click(screen.getByLabelText('Hide all drawings'));
    fireEvent.click(screen.getByLabelText('Show all drawings'));
    fireEvent.click(screen.getByLabelText('Lock all drawings'));
    fireEvent.click(screen.getByLabelText('Unlock all drawings'));

    expect(onDuplicate).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onMeasureModeChange).toHaveBeenCalledWith(true);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onVisibility).toHaveBeenCalledWith(false, { drawingIds: ['back', 'h', 'front'], includeLocked: true });
    expect(onVisibility).toHaveBeenCalledWith(true, { drawingIds: ['back', 'h', 'front'], includeLocked: true });
    expect(onLocked).toHaveBeenCalledWith(true, { drawingIds: ['back', 'h', 'front'] });
    expect(onLocked).toHaveBeenCalledWith(false, { drawingIds: ['back', 'h', 'front'], includeLocked: true });
    expect(onZOrder).not.toHaveBeenCalled();

    rerender(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{ ...baseDrawingState, measureMode: 'on' }}
        onUserDrawingMeasureModeChange={onMeasureModeChange}
      />,
    );

    expect(screen.getByLabelText('Measure date and price range').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByLabelText('Measure date and price range'));
    expect(onMeasureModeChange).toHaveBeenCalledWith(false);
  });

  it('rerenders mobile drawing toolbar undo and redo availability changes', () => {
    const { rerender } = render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={baseDrawingState}
        userDrawingCommandAvailability={{ canUndo: false, canRedo: false }}
      />,
    );

    const getUndo = () => screen.getByLabelText('Undo drawing command') as HTMLButtonElement;
    const getRedo = () => screen.getByLabelText('Redo drawing command') as HTMLButtonElement;

    expect(getUndo().disabled).toBe(true);
    expect(getUndo().getAttribute('aria-disabled')).toBe('true');
    expect(getRedo().disabled).toBe(true);
    expect(getRedo().getAttribute('aria-disabled')).toBe('true');

    rerender(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={baseDrawingState}
        userDrawingCommandAvailability={{ canUndo: true, canRedo: false }}
      />,
    );

    expect(getUndo().disabled).toBe(false);
    expect(getUndo().getAttribute('aria-disabled')).toBeNull();
    expect(getRedo().disabled).toBe(true);
    expect(getRedo().getAttribute('aria-disabled')).toBe('true');

    rerender(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={baseDrawingState}
        userDrawingCommandAvailability={{ canUndo: false, canRedo: true }}
      />,
    );

    expect(getUndo().disabled).toBe(true);
    expect(getUndo().getAttribute('aria-disabled')).toBe('true');
    expect(getRedo().disabled).toBe(false);
    expect(getRedo().getAttribute('aria-disabled')).toBeNull();
  });

  it('does not render selected visibility actions in the top bar', () => {
    const onVisibility = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
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
        }}
        onUserDrawingVisibilityChange={onVisibility}
      />,
    );

    expect(screen.queryByLabelText('Hide selected drawing')).toBeNull();
    expect(screen.queryByLabelText('Show selected drawing')).toBeNull();
    expect(onVisibility).not.toHaveBeenCalled();
  });

});
