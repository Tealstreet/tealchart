import type { UserDrawingState } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingPropertiesSurface } from '../../drawings';
import { clearChartStoreCache } from '../../state/chartState';
import { UserDrawingPropertiesSheet } from './UserDrawingPropertiesSheet';

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
      id: 'locked',
      kind: 'rectangle',
      paneId: 'main',
      visible: true,
      locked: true,
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

describe('UserDrawingPropertiesSheet', () => {
  afterEach(() => {
    cleanup();
    clearChartStoreCache();
  });

  it('renders the shared properties surface and dispatches enabled controls', () => {
    const onChartTouch = vi.fn();
    const onDispatch = vi.fn(() => true);
    const onClose = vi.fn();

    render(
      <div onClick={onChartTouch}>
        <UserDrawingPropertiesSheet
          visible
          surface={resolveUserDrawingPropertiesSurface(state)}
          onDispatch={onDispatch}
          onClose={onClose}
        />
      </div>,
    );

    expect(screen.getByLabelText('Drawing properties').getAttribute('data-start-should-set-responder')).toBe('true');
    expect(screen.getByText('horizontalLine properties')).not.toBeNull();
    expect(screen.getByText('Line')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Blue line color'));
    expect(onDispatch).toHaveBeenCalledWith({ type: 'updateStyle', style: { lineColor: '#38bdf8' } });

    fireEvent.click(screen.getByLabelText('Close drawing properties'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChartTouch).not.toHaveBeenCalled();
  });

  it('renders disabled controls for locked drawings', () => {
    const onDispatch = vi.fn(() => true);

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(state, 'locked')}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Blue line color'));
    expect(screen.getByLabelText('Blue line color').getAttribute('aria-disabled')).toBe('true');
    expect(onDispatch).not.toHaveBeenCalled();
  });

  it('renders freehand stroke presets from the shared properties surface', () => {
    const onDispatch = vi.fn(() => true);
    const freehandState: UserDrawingState = {
      ...state,
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
            { time: 1, price: 45 },
            { time: 2, price: 55 },
          ],
        },
      ],
    };

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(freehandState)}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Stroke')).not.toBeNull();
    expect(screen.getByLabelText('Medium highlighter stroke width').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByLabelText('35 percent highlighter opacity'));
    expect(onDispatch).toHaveBeenCalledWith({ type: 'updateStyle', style: { opacity: 0.35 } });
  });

  it('renders an empty state', () => {
    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface({ ...state, selection: null, drawings: [] })}
        onDispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('No editable drawing')).not.toBeNull();
  });
});
