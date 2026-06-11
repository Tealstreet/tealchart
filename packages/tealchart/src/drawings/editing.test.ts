import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawing, UserDrawingStyle } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { resolveUserDrawingGeometry } from './coordinates';
import { applyUserDrawingEditDrag, beginUserDrawingEditDragAtPoint } from './editing';
import { createUserDrawingState } from './input';

const style: UserDrawingStyle = {
  lineColor: '#fff',
  lineWidth: 1,
  lineStyle: 'solid',
};

const space: DrawingCoordinateSpace = {
  viewport: {
    startTime: 0,
    endTime: 100,
    priceMin: 0,
    priceMax: 100,
  },
  pane: {
    id: 'main',
    top: 0,
    height: 100,
    bottom: 100,
    yMin: 0,
    yMax: 100,
  },
  chartLeft: 0,
  chartRight: 100,
};

const base = {
  paneId: 'main',
  visible: true,
  locked: false,
  createdAt: 1,
  updatedAt: 1,
  style,
};

describe('user drawing editing', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('begins an edit drag from the topmost hit drawing', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
      extend: 'none',
    };
    const state = createUserDrawingState({
      drawings: [drawing],
    });

    const result = beginUserDrawingEditDragAtPoint(state, { x: 10, y: 10 }, new Map([['main', space]]));

    expect(result.hit).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.state.selection).toEqual({ drawingId: 'line', handle: 'start' });
    expect(result.drag).toMatchObject({
      selection: { drawingId: 'line', handle: 'start' },
      startDrawing: drawing,
      startPoint: { x: 10, y: 10 },
    });
  });

  it('moves a selected two-anchor drawing by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
      extend: 'none',
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'line' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'line' },
        startPoint: { x: 10, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 15, y: 25 },
      { now: () => 2 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 15, price: 75 },
        { time: 25, price: 55 },
      ],
      updatedAt: 2,
    });
    expect(next.selection).toEqual({ drawingId: 'line' });
  });

  it('drags callout endpoint handles without moving the text anchor', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'callout',
      kind: 'callout',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
      ],
      text: 'Callout',
      textAlign: 'center',
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'callout', handle: 'center', pointIndex: 0 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'callout', handle: 'center', pointIndex: 0 },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 20 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 80 },
        { time: 50, price: 50 },
      ],
      updatedAt: 3,
    });
  });

  it('drags price note endpoint handles without moving the label anchor', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'price-note',
      kind: 'priceNote',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
      ],
      text: 'Price note',
      textAlign: 'center',
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'price-note', handle: 'center', pointIndex: 0 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'price-note', handle: 'center', pointIndex: 0 },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 20 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 80 },
        { time: 50, price: 50 },
      ],
      updatedAt: 4,
    });
  });

  it('moves selected date ranges by time delta without changing anchor prices', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'date-range' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'date-range' },
        startPoint: { x: 10, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 15, y: 25 },
      { now: () => 2 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 15, price: 80 },
        { time: 25, price: 60 },
      ],
      updatedAt: 2,
    });
  });

  it('returns the existing state when drag movement is zero', () => {
    const drawing: UserDrawing = { ...base, id: 'h', kind: 'horizontalLine', price: 50 };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'h' },
    });

    expect(
      applyUserDrawingEditDrag(
        state,
        { selection: { drawingId: 'h' }, startPoint: { x: 50, y: 50 }, startDrawing: drawing, space },
        { x: 50, y: 50 },
      ),
    ).toBe(state);
  });

  it('drags line endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'ray',
      kind: 'ray',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'ray', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'ray', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('drags trend angle endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'angle',
      kind: 'trendAngle',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'angle', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'angle', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('drags arrow line endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'arrow',
      kind: 'arrowLine',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'arrow', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'arrow', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('drags arrow marker endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'marker',
      kind: 'arrowMarker',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'marker', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'marker', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('moves arrow marks by dragging the center handle', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'up',
      kind: 'arrowMarkUp',
      point: { time: 20, price: 60 },
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'up', handle: 'center' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'up', handle: 'center' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      point: { time: 70, price: 70 },
      updatedAt: 3,
    });
  });

  it('moves pins by dragging the center handle', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pin',
      kind: 'pin',
      point: { time: 20, price: 60 },
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'pin', handle: 'center' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'pin', handle: 'center' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      point: { time: 70, price: 70 },
      updatedAt: 3,
    });
  });

  it('drags extended line endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'extended', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'extended', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('drags info line endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'info',
      kind: 'infoLine',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'info', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'info', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 3 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 3,
    });
  });

  it('drags forecast endpoints without moving the opposite endpoint', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'forecast',
      kind: 'forecast',
      points: [
        { time: 10, price: 80 },
        { time: 20, price: 60 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'forecast', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'forecast', handle: 'end' },
        startPoint: { x: 20, y: 40 },
        startDrawing: drawing,
        space,
      },
      { x: 70, y: 30 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 80 },
        { time: 70, price: 70 },
      ],
      updatedAt: 4,
    });
  });

  it('drags rectangle corner handles around the opposite corner', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'rect', handle: 'topLeft' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'rect', handle: 'topLeft' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 10 },
      ],
      updatedAt: 4,
    });
  });

  it('drags circle corner handles around the opposite corner', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'circle',
      kind: 'circle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'circle', handle: 'topLeft' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'circle', handle: 'topLeft' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 10 },
      ],
      updatedAt: 4,
    });
  });

  it('drags ellipse corner handles around the opposite corner', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'ellipse',
      kind: 'ellipse',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'ellipse', handle: 'topLeft' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'ellipse', handle: 'topLeft' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 10 },
      ],
      updatedAt: 4,
    });
  });

  it('drags price range corner handles around the opposite corner', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'range', handle: 'topLeft' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'range', handle: 'topLeft' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 4 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 10 },
      ],
      updatedAt: 4,
    });
  });

  it('drags date and price range corner handles around the opposite corner', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'date-price-range',
      kind: 'datePriceRange',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'date-price-range', handle: 'topLeft' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'date-price-range', handle: 'topLeft' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 5 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 10 },
      ],
      updatedAt: 5,
    });
  });

  it('drags date range boundary handles without changing prices', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 10, price: 80 },
        { time: 90, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'date-range', handle: 'start' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'date-range', handle: 'start' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 25, y: 20 },
      { now: () => 5 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 25, price: 80 },
        { time: 90, price: 20 },
      ],
      updatedAt: 5,
    });
  });

  it('drags path point handles without moving other points', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'path',
      kind: 'path',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'path', handle: 'center', pointIndex: 1 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'path', handle: 'center', pointIndex: 1 },
        startPoint: { x: 50, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 40 },
      { now: () => 6 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 90 },
        { time: 60, price: 60 },
        { time: 90, price: 90 },
      ],
      updatedAt: 6,
    });
  });

  it('moves selected paths by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'path',
      kind: 'path',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'path' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'path' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 20 },
      { now: () => 7 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 80 },
        { time: 60, price: 40 },
        { time: 100, price: 80 },
      ],
      updatedAt: 7,
    });
  });

  it('drags polyline point handles without moving other points', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'polyline',
      kind: 'polyline',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'polyline', handle: 'center', pointIndex: 1 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'polyline', handle: 'center', pointIndex: 1 },
        startPoint: { x: 50, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 40 },
      { now: () => 8 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 90 },
        { time: 60, price: 60 },
        { time: 90, price: 90 },
      ],
      updatedAt: 8,
    });
  });

  it('moves selected polylines by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'polyline',
      kind: 'polyline',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'polyline' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'polyline' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 20 },
      { now: () => 9 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 80 },
        { time: 60, price: 40 },
        { time: 100, price: 80 },
      ],
      updatedAt: 9,
    });
  });

  it('drags triangle point handles without moving other points', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'triangle', handle: 'center', pointIndex: 1 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'triangle', handle: 'center', pointIndex: 1 },
        startPoint: { x: 50, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 40 },
      { now: () => 8 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 90 },
        { time: 60, price: 60 },
        { time: 90, price: 90 },
      ],
      updatedAt: 8,
    });
  });

  it('moves selected triangles by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'triangle' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'triangle' },
        startPoint: { x: 10, y: 10 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 20 },
      { now: () => 9 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 80 },
        { time: 60, price: 40 },
        { time: 100, price: 80 },
      ],
      updatedAt: 9,
    });
  });

  it('moves selected anchored VWAP anchors by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'vwap',
      kind: 'anchoredVwap',
      point: { time: 10, price: 50 },
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'vwap' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'vwap' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 9 },
    );

    expect(next.drawings[0]).toMatchObject({
      point: { time: 20, price: 40 },
      updatedAt: 9,
    });
  });

  it('drags parallel channel width handles without moving the baseline', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'channel', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'channel', handle: 'center', pointIndex: 2 },
        startPoint: { x: 10, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 30 },
      { now: () => 10 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 20, price: 70 },
      ],
      updatedAt: 10,
    });
  });

  it('moves selected parallel channels by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'channel' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'channel' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 11 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 40 },
        { time: 100, price: 40 },
        { time: 20, price: 70 },
      ],
      updatedAt: 11,
    });
  });

  it('drags rotated rectangle width handles without moving the baseline', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'rotated', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'rotated', handle: 'center', pointIndex: 2 },
        startPoint: { x: 10, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 30 },
      { now: () => 12 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 20, price: 70 },
      ],
      updatedAt: 12,
    });
  });

  it('drags pitchfork handles without moving the other anchors', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'pitchfork', handle: 'center', pointIndex: 1 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'pitchfork', handle: 'center', pointIndex: 1 },
        startPoint: { x: 50, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 30 },
      { now: () => 12 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 50 },
        { time: 60, price: 70 },
        { time: 50, price: 20 },
      ],
      updatedAt: 12,
    });
  });

  it('moves selected pitchforks by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'pitchfork' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'pitchfork' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 13 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 40 },
        { time: 60, price: 70 },
        { time: 60, price: 10 },
      ],
      updatedAt: 13,
    });
  });

  it('drags pitchfork variant handles without changing kind', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'inside',
      kind: 'insidePitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'inside', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'inside', handle: 'center', pointIndex: 2 },
        startPoint: { x: 50, y: 80 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 70 },
      { now: () => 14 },
    );

    expect(next.drawings[0]).toMatchObject({
      kind: 'insidePitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 60, price: 30 },
      ],
      updatedAt: 14,
    });
  });

  it('drags pitchfan handles without changing kind', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'pitchfan', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'pitchfan', handle: 'center', pointIndex: 2 },
        startPoint: { x: 50, y: 80 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 70 },
      { now: () => 15 },
    );

    expect(next.drawings[0]).toMatchObject({
      kind: 'pitchfan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 60, price: 30 },
      ],
      updatedAt: 15,
    });
  });

  it('moves selected rotated rectangles by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'rotated' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'rotated' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 13 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 40 },
        { time: 100, price: 40 },
        { time: 20, price: 70 },
      ],
      updatedAt: 13,
    });
  });

  it('drags flat top and bottom point handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'flat',
      kind: 'flatTopBottom',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'flat', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'flat', handle: 'center', pointIndex: 2 },
        startPoint: { x: 10, y: 80 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 70 },
      { now: () => 12 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 20, price: 30 },
      ],
      updatedAt: 12,
    });
  });

  it('moves selected flat top and bottom drawings by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'flat',
      kind: 'flatTopBottom',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'flat' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'flat' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 13 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 40 },
        { time: 100, price: 70 },
        { time: 20, price: 10 },
      ],
      updatedAt: 13,
    });
  });

  it('drags disjoint channel point handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'disjoint', handle: 'center', pointIndex: 3 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'disjoint', handle: 'center', pointIndex: 3 },
        startPoint: { x: 90, y: 90 },
        startDrawing: drawing,
        space,
      },
      { x: 80, y: 80 },
      { now: () => 14 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
        { time: 80, price: 20 },
      ],
      updatedAt: 14,
    });
  });

  it('moves selected disjoint channels by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
        { time: 90, price: 10 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'disjoint' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'disjoint' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 15 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 40 },
        { time: 100, price: 70 },
        { time: 20, price: 10 },
        { time: 100, price: 0 },
      ],
      updatedAt: 15,
    });
  });

  it('moves selected regression trends by time delta without distorting fitted prices', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'regression',
      kind: 'regressionTrend',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'regression' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'regression' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 60 },
      { now: () => 12 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 50 },
        { time: 100, price: 50 },
        { time: 20, price: 80 },
      ],
      updatedAt: 12,
    });
  });

  it('preserves regression trend channel width when moving across bar-backed ranges', () => {
    const regressionSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 62, low: 48, close: 60, volume: 1 },
        { time: 50, open: 60, high: 72, low: 58, close: 70, volume: 1 },
        { time: 90, open: 70, high: 82, low: 68, close: 80, volume: 1 },
      ],
    };
    const drawing: UserDrawing = {
      ...base,
      id: 'regression',
      kind: 'regressionTrend',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'regression' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'regression' },
        startPoint: { x: 10, y: 40 },
        startDrawing: drawing,
        space: regressionSpace,
      },
      { x: 20, y: 40 },
      { now: () => 13 },
    );
    const moved = next.drawings[0];

    if (moved?.kind !== 'regressionTrend') throw new Error('expected regression trend');
    expect(moved.updatedAt).toBe(13);
    expect(moved.points[0]).toEqual({ time: 20, price: 50 });
    expect(moved.points[1]).toEqual({ time: 100, price: 50 });
    expect(moved.points[2].time).toBe(20);
    expect(moved.points[2].price).toBeCloseTo(82.5);
  });

  it('edits variable-point path handles without truncating sampled points', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'path',
      kind: 'path',
      points: [
        { time: 10, price: 90 },
        { time: 30, price: 70 },
        { time: 50, price: 50 },
        { time: 70, price: 30 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'path', handle: 'center', pointIndex: 2 },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'path', handle: 'center', pointIndex: 2 },
        startPoint: { x: 50, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 55, y: 45 },
      { now: () => 14 },
    );

    const moved = next.drawings[0];
    if (moved?.kind !== 'path') throw new Error('expected path');
    expect(moved.updatedAt).toBe(14);
    expect(moved.points).toHaveLength(4);
    expect(moved.points[0]).toEqual({ time: 10, price: 90 });
    expect(moved.points[1]).toEqual({ time: 30, price: 70 });
    expect(moved.points[2]?.time).toBeCloseTo(55);
    expect(moved.points[2]?.price).toBe(55);
    expect(moved.points[3]).toEqual({ time: 70, price: 30 });
  });

  it('moves long position anchors together', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'long',
      kind: 'longPosition',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 90, price: 40 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'long' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'long' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 45 },
      { now: () => 15 },
    );

    const moved = next.drawings[0];
    if (moved?.kind !== 'longPosition') throw new Error('expected long position');
    expect(moved.updatedAt).toBe(15);
    expect(moved.points[0]).toEqual({ time: 20, price: 55 });
    expect(moved.points[1]).toEqual({ time: 100, price: 85 });
    expect(moved.points[2]).toEqual({ time: 100, price: 45 });
  });

  it('moves bars pattern anchors without dropping stored bars', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'bars',
      kind: 'barsPattern',
      points: [
        { time: 10, price: 50 },
        { time: 20, price: 50 },
        { time: 40, price: 50 },
      ],
      bars: [
        { time: 10, open: 50, high: 60, low: 49, close: 52 },
        { time: 20, open: 52, high: 58, low: 51, close: 53 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'bars' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'bars' },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 50, y: 50 },
      { now: () => 16 },
    );

    const moved = next.drawings[0];
    if (moved?.kind !== 'barsPattern') throw new Error('expected bars pattern');
    const geometry = resolveUserDrawingGeometry(moved, space);
    if (geometry.kind !== 'barsPattern') throw new Error('expected bars pattern geometry');
    expect(moved.updatedAt).toBe(16);
    expect(moved.points[0].time).toBe(50);
    expect(moved.points[1].time).toBe(60);
    expect(moved.points[2].time).toBe(80);
    expect(moved.bars).toHaveLength(2);
    expect(geometry.pattern.bars).toHaveLength(2);
    expect(geometry.pattern.bars.map((bar) => bar.time)).toEqual([80, 90]);
  });

  it('edits only the bars pattern placement handle', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'bars',
      kind: 'barsPattern',
      points: [
        { time: 10, price: 50 },
        { time: 20, price: 50 },
        { time: 40, price: 50 },
      ],
      bars: [
        { time: 10, open: 50, high: 60, low: 49, close: 52 },
        { time: 20, open: 52, high: 58, low: 51, close: 53 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'bars', handle: 'center', pointIndex: 0 },
    });

    const ignored = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'bars', handle: 'center', pointIndex: 0 },
        startPoint: { x: 10, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 15, y: 45 },
      { now: () => 17 },
    );
    expect(ignored.drawings[0]).toBe(drawing);

    const movedPlacement = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'bars', handle: 'center', pointIndex: 2 },
        startPoint: { x: 40, y: 50 },
        startDrawing: drawing,
        space,
      },
      { x: 60, y: 45 },
      { now: () => 18 },
    );
    const moved = movedPlacement.drawings[0];
    if (moved?.kind !== 'barsPattern') throw new Error('expected bars pattern');
    expect(moved.points[0]).toEqual(drawing.points[0]);
    expect(moved.points[1]).toEqual(drawing.points[1]);
    expect(moved.points[2]).toEqual({ time: 60, price: 55 });
    expect(moved.bars).toEqual(drawing.bars);
    expect(moved.updatedAt).toBe(18);
  });

  it('edits Fibonacci retracement endpoints', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'fib', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'fib', handle: 'end' },
        startPoint: { x: 90, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 80, y: 30 },
      { now: () => 12 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 20 },
        { time: 80, price: 70 },
      ],
      updatedAt: 12,
    });
  });

  it('moves selected Fibonacci retracements by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'fib' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'fib' },
        startPoint: { x: 10, y: 80 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 90 },
      { now: () => 13 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 10 },
        { time: 100, price: 70 },
      ],
      updatedAt: 13,
    });
  });

  it('edits Fibonacci extension endpoints', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'fib-ext', handle: 'end' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'fib-ext', handle: 'end' },
        startPoint: { x: 90, y: 20 },
        startDrawing: drawing,
        space,
      },
      { x: 80, y: 30 },
      { now: () => 14 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 10, price: 20 },
        { time: 80, price: 70 },
      ],
      updatedAt: 14,
    });
  });

  it('moves selected Fibonacci extensions by screen delta', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };
    const state = createUserDrawingState({
      drawings: [drawing],
      selection: { drawingId: 'fib-ext' },
    });

    const next = applyUserDrawingEditDrag(
      state,
      {
        selection: { drawingId: 'fib-ext' },
        startPoint: { x: 10, y: 80 },
        startDrawing: drawing,
        space,
      },
      { x: 20, y: 90 },
      { now: () => 15 },
    );

    expect(next.drawings[0]).toMatchObject({
      points: [
        { time: 20, price: 10 },
        { time: 100, price: 70 },
      ],
      updatedAt: 15,
    });
  });

  it('moves horizontal, vertical, horizontal ray, cross line, and text drawings on their editable axis', () => {
    const horizontal: UserDrawing = { ...base, id: 'h', kind: 'horizontalLine', price: 50 };
    const vertical: UserDrawing = { ...base, id: 'v', kind: 'verticalLine', time: 50 };
    const horizontalRay: UserDrawing = { ...base, id: 'hr', kind: 'horizontalRay', point: { time: 50, price: 50 } };
    const crossLine: UserDrawing = { ...base, id: 'cross', kind: 'crossLine', point: { time: 50, price: 50 } };
    const label: UserDrawing = {
      ...base,
      id: 't',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    };
    const state = createUserDrawingState({
      drawings: [horizontal, vertical, horizontalRay, crossLine, label],
      selection: { drawingId: 'h' },
    });

    const movedHorizontal = applyUserDrawingEditDrag(
      state,
      { selection: { drawingId: 'h' }, startPoint: { x: 50, y: 50 }, startDrawing: horizontal, space },
      { x: 60, y: 60 },
    ).drawings[0];
    const movedVertical = applyUserDrawingEditDrag(
      state,
      { selection: { drawingId: 'v' }, startPoint: { x: 50, y: 50 }, startDrawing: vertical, space },
      { x: 60, y: 60 },
    ).drawings[1];
    const movedLabel = applyUserDrawingEditDrag(
      state,
      { selection: { drawingId: 't' }, startPoint: { x: 50, y: 50 }, startDrawing: label, space },
      { x: 60, y: 60 },
    ).drawings[4];
    const movedHorizontalRay = applyUserDrawingEditDrag(
      state,
      { selection: { drawingId: 'hr' }, startPoint: { x: 50, y: 50 }, startDrawing: horizontalRay, space },
      { x: 60, y: 60 },
    ).drawings[2];
    const movedCrossLine = applyUserDrawingEditDrag(
      state,
      { selection: { drawingId: 'cross' }, startPoint: { x: 50, y: 50 }, startDrawing: crossLine, space },
      { x: 60, y: 60 },
    ).drawings[3];

    expect(movedHorizontal).toMatchObject({ price: 40 });
    expect(movedVertical).toMatchObject({ time: 60 });
    expect(movedHorizontalRay).toMatchObject({ point: { time: 60, price: 40 } });
    expect(movedCrossLine).toMatchObject({ point: { time: 60, price: 40 } });
    expect(movedLabel).toMatchObject({ point: { time: 60, price: 40 } });
  });
});
