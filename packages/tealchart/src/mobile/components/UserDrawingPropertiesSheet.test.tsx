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
    const sheet = screen.getByLabelText('Drawing properties');
    expect(sheet.getAttribute('data-style')).toContain('"maxHeight":"72%"');
    const lineControls = screen.getByLabelText('Drawing properties controls for Line');
    expect(lineControls.getAttribute('data-style')).toContain('"flexWrap":"wrap"');
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

    expect(screen.getByText('Templates')).not.toBeNull();
    expect(screen.getByLabelText('Yellow highlighter template').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Stroke')).not.toBeNull();
    expect(screen.getByLabelText('Medium highlighter stroke width').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByLabelText('Pink highlighter template'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { lineColor: '#ec4899', lineWidth: 12, lineStyle: 'solid', opacity: 0.25 },
    });
    fireEvent.click(screen.getByLabelText('35 percent highlighter opacity'));
    expect(onDispatch).toHaveBeenCalledWith({ type: 'updateStyle', style: { opacity: 0.35 } });
  });

  it('renders volume profile guide visibility from the shared properties surface', () => {
    const onDispatch = vi.fn(() => true);
    const volumeProfileState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'volume-profile' },
      drawings: [
        {
          id: 'volume-profile',
          kind: 'anchoredVolumeProfile',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 45 },
        },
      ],
    };

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(volumeProfileState)}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Geometry')).not.toBeNull();
    expect(screen.getByLabelText('Hide volume profile guides').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('12 volume profile rows').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('24 volume profile rows').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('70 percent value area').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('80 percent value area').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('100 percent profile width').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('50 percent profile width').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByLabelText('Hide volume profile guides'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { volumeProfileGuidesVisible: false },
    });
    fireEvent.click(screen.getByLabelText('24 volume profile rows'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { volumeProfileRowCount: 24 },
    });
    fireEvent.click(screen.getByLabelText('80 percent value area'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { volumeProfileValueAreaRatio: 0.8 },
    });
    fireEvent.click(screen.getByLabelText('50 percent profile width'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { volumeProfileWidthRatio: 0.5 },
    });
  });

  it('renders risk reward stats mode controls from the shared properties surface', () => {
    const onDispatch = vi.fn(() => true);
    const riskRewardState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'long' },
      drawings: [
        {
          id: 'long',
          kind: 'longPosition',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
            { time: 2, price: 95 },
          ],
        },
      ],
    };

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(riskRewardState)}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Position')).not.toBeNull();
    expect(screen.getByLabelText('Full position stats').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Compact position stats').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('Center position labels').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByLabelText('Compact position stats'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { riskRewardStatsMode: 'compact' },
    });
    fireEvent.click(screen.getByLabelText('Right position labels'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { riskRewardLabelAlignment: 'right' },
    });
  });

  it('renders bars pattern display controls from the shared properties surface', () => {
    const onDispatch = vi.fn(() => true);
    const barsPatternState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'bars' },
      drawings: [
        {
          id: 'bars',
          kind: 'barsPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
            { time: 3, price: 105 },
          ],
          bars: [
            { time: 1, open: 100, high: 104, low: 99, close: 102 },
            { time: 2, open: 102, high: 105, low: 101, close: 101 },
          ],
        },
      ],
    };

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(barsPatternState)}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Geometry')).not.toBeNull();
    expect(screen.getByText('Bars Pattern')).not.toBeNull();
    expect(screen.getByLabelText('Candlestick bars pattern').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Line bars pattern').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByLabelText('Line bars pattern'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { barsPatternDisplayMode: 'line' },
    });
    fireEvent.click(screen.getByLabelText('Blue up bars'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { barsPatternUpColor: '#38bdf8' },
    });
    fireEvent.click(screen.getByLabelText('Orange down bars'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { barsPatternDownColor: '#f97316' },
    });
  });

  it('renders range label position controls from the shared properties surface', () => {
    const onDispatch = vi.fn(() => true);
    const rangeState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'range' },
      drawings: [
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
          ],
        },
      ],
    };

    render(
      <UserDrawingPropertiesSheet
        visible
        surface={resolveUserDrawingPropertiesSurface(rangeState)}
        onDispatch={onDispatch}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Labels')).not.toBeNull();
    expect(screen.getByLabelText('Center measurement label').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Top measurement label').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('Right aligned measurement label').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByLabelText('Top measurement label'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { measurementLabelPosition: 'top' },
    });
    fireEvent.click(screen.getByLabelText('Right aligned measurement label'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { measurementLabelAlignment: 'right' },
    });
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
