import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  cancelUserDrawingDraft,
  createUserDrawingState,
  handleUserDrawingInput,
  selectUserDrawingAtPoint,
  selectUserDrawing,
  setUserDrawingTool,
} from './input';
import type { DrawingCoordinateSpace } from './coordinates';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
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
const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };

describe('user drawing input controller', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('creates default drawing state', () => {
    expect(createUserDrawingState()).toMatchObject({
      version: 1,
      drawings: [],
      activeTool: 'select',
      selection: null,
      draft: null,
    });
  });

  it('switches tools while clearing active drafts', () => {
    const state = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        startedAt: 1,
      },
    });

    expect(setUserDrawingTool(state, 'rectangle')).toMatchObject({
      activeTool: 'rectangle',
      selection: null,
      draft: null,
    });
  });

  it('accumulates a two-anchor draft then commits a drawing', () => {
    const options = { createId: () => 'drawing-1', now: () => 20 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'trendLine'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);

    expect(first.draft).toMatchObject({
      tool: 'trendLine',
      paneId: 'main',
      anchors: [anchorA],
    });
    expect(first.drawings).toEqual([]);

    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'drawing-1' });
    expect(second.drawings[0]).toMatchObject({
      id: 'drawing-1',
      kind: 'trendLine',
      points: [anchorA, anchorB],
      createdAt: 20,
      updatedAt: 20,
    });
  });

  it('commits single-anchor drawings immediately', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'horizontalLine');
    const next = handleUserDrawingInput(state, { paneId: 'main', anchor: anchorA }, { createId: () => 'h' });

    expect(next.draft).toBeNull();
    expect(next.drawings[0]).toMatchObject({
      id: 'h',
      kind: 'horizontalLine',
      price: anchorA.price,
    });
  });

  it('starts a new draft when the pane changes mid-drawing', () => {
    const state = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'rectangle'), {
      paneId: 'main',
      anchor: anchorA,
    }, { createId: () => 'unused' });

    const next = handleUserDrawingInput(state, { paneId: 'indicator', anchor: anchorB }, { createId: () => 'unused' });

    expect(next.drawings).toEqual([]);
    expect(next.draft).toMatchObject({
      paneId: 'indicator',
      anchors: [anchorB],
    });
  });

  it('selects and cancels without mutating drawings', () => {
    const drawingState = createUserDrawingState({
      drawings: [
        {
          id: 'h',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
      ],
    });

    const selected = selectUserDrawing(drawingState, { drawingId: 'h', handle: 'center' });

    expect(selected.selection).toEqual({ drawingId: 'h', handle: 'center' });
    expect(selected.drawings).toBe(drawingState.drawings);
    expect(cancelUserDrawingDraft(selected)).toBe(selected);
  });

  it('selects the topmost hit drawing at a screen point', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'bottom',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
        {
          id: 'top',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style,
          price: 50,
        },
      ],
    });

    expect(selectUserDrawingAtPoint(state, { x: 40, y: 50 }, new Map([['main', space]])).selection).toEqual({
      drawingId: 'top',
    });
  });

  it('clears selection and draft when selection misses', () => {
    const state = createUserDrawingState({
      activeTool: 'trendLine',
      selection: { drawingId: 'old' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [
        {
          id: 'old',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
      ],
    });

    const next = selectUserDrawingAtPoint(state, { x: 40, y: 20 }, new Map([['main', space]]));

    expect(next.selection).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.activeTool).toBe('select');
  });
});
