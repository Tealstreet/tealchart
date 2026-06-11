import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  appendUserDrawingPathDragPoint,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft,
  cancelUserDrawingTextEdit,
  clearUserDrawings,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawing,
  handleUserDrawingInput,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingAtPoint,
  selectUserDrawingById,
  selectUserDrawing,
  setUserDrawingLocked,
  setUserDrawingText,
  setUserDrawingTextAlign,
  setUserDrawingTool,
  setUserDrawingVisibility,
  updateUserDrawingStyle,
  updateUserDrawingTextEdit,
} from './input';
import type { DrawingCoordinateSpace } from './coordinates';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 2_000, price: 95 };
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
      textEdit: null,
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
      textEdit: { drawingId: 'label', value: 'A', originalValue: 'A', startedAt: 1 },
    });

    expect(setUserDrawingTool(state, 'rectangle')).toMatchObject({
      activeTool: 'rectangle',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('clears active text editing even when selecting the current tool again', () => {
    const state = createUserDrawingState({
      activeTool: 'select',
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
    });

    const next = setUserDrawingTool(state, 'select');

    expect(next).not.toBe(state);
    expect(next.textEdit).toBeNull();
    expect(next.selection).toEqual({ drawingId: 'label' });
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

    const vwap = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'anchoredVwap'), {
      paneId: 'main',
      anchor: anchorA,
    }, { createId: () => 'vwap', now: () => 21 });

    expect(vwap).toMatchObject({
      selection: { drawingId: 'vwap' },
      draft: null,
      drawings: [
        {
          id: 'vwap',
          kind: 'anchoredVwap',
          point: anchorA,
          createdAt: 21,
          updatedAt: 21,
        },
      ],
    });
  });

  it('commits fib fan drawings from two anchors', () => {
    const options = { createId: () => 'fib-fan', now: () => 22 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibFan'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-fan' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-fan',
      kind: 'fibFan',
      points: [anchorA, anchorB],
      createdAt: 22,
      updatedAt: 22,
    });
  });

  it('commits fib speed resistance fan drawings from two anchors', () => {
    const options = { createId: () => 'fib-speed-fan', now: () => 23 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibSpeedResistanceFan'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-speed-fan' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
      points: [anchorA, anchorB],
      createdAt: 23,
      updatedAt: 23,
    });
  });

  it('commits fib speed resistance arc drawings from two anchors', () => {
    const options = { createId: () => 'fib-speed-arcs', now: () => 24 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibSpeedResistanceArcs'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-speed-arcs' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
      points: [anchorA, anchorB],
      createdAt: 24,
      updatedAt: 24,
    });
  });

  it('commits fib circle drawings from two anchors', () => {
    const options = { createId: () => 'fib-circles', now: () => 25 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibCircles'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-circles' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-circles',
      kind: 'fibCircles',
      points: [anchorA, anchorB],
      createdAt: 25,
      updatedAt: 25,
    });
  });

  it('commits gann fan drawings from two anchors', () => {
    const options = { createId: () => 'gann-fan', now: () => 25 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'gannFan'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'gann-fan' });
    expect(second.drawings[0]).toMatchObject({
      id: 'gann-fan',
      kind: 'gannFan',
      points: [anchorA, anchorB],
      createdAt: 25,
      updatedAt: 25,
    });
  });

  it('commits fib time zone drawings from two anchors', () => {
    const options = { createId: () => 'fib-time-zone', now: () => 25 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibTimeZone'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-time-zone' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      points: [anchorA, anchorB],
      createdAt: 25,
      updatedAt: 25,
    });
  });

  it('commits trend-based fib time drawings from three anchors', () => {
    const options = { createId: () => 'trend-fib-time', now: () => 26 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'trendBasedFibTime'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(first.drawings).toEqual([]);
    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'trend-fib-time' });
    expect(third.drawings[0]).toMatchObject({
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      points: [anchorA, anchorB, anchorC],
      createdAt: 26,
      updatedAt: 26,
    });
  });

  it('commits fib channel drawings from three anchors', () => {
    const options = { createId: () => 'fib-channel', now: () => 24 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibChannel'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'fib-channel' });
    expect(third.drawings[0]).toMatchObject({
      id: 'fib-channel',
      kind: 'fibChannel',
      points: [anchorA, anchorB, anchorC],
      createdAt: 24,
      updatedAt: 24,
    });
  });

  it('builds variable-point path drawings from drag samples', () => {
    const started = beginUserDrawingPathDrag(
      setUserDrawingTool(createUserDrawingState(), 'path'),
      { paneId: 'main', anchor: anchorA },
      { now: () => 10, style },
    );
    const duplicate = appendUserDrawingPathDragPoint(started, { paneId: 'main', anchor: anchorA });
    const second = appendUserDrawingPathDragPoint(duplicate, { paneId: 'main', anchor: anchorB });
    const third = appendUserDrawingPathDragPoint(second, { paneId: 'main', anchor: { time: 3_000, price: 90 } });
    const committed = commitUserDrawingPathDrag(third, { createId: () => 'freehand', now: () => 20 });

    expect(duplicate).toBe(started);
    expect(third.draft?.anchors).toEqual([anchorA, anchorB, { time: 3_000, price: 90 }]);
    expect(committed).toMatchObject({
      selection: { drawingId: 'freehand' },
      draft: null,
      drawings: [
        {
          id: 'freehand',
          kind: 'path',
          points: [anchorA, anchorB, { time: 3_000, price: 90 }],
          createdAt: 20,
          updatedAt: 20,
        },
      ],
    });
  });

  it('builds variable-point brush drawings from drag samples', () => {
    const started = beginUserDrawingPathDrag(
      setUserDrawingTool(createUserDrawingState(), 'brush'),
      { paneId: 'main', anchor: anchorA },
      { now: () => 10, style },
    );
    const second = appendUserDrawingPathDragPoint(started, { paneId: 'main', anchor: anchorB });
    const third = appendUserDrawingPathDragPoint(second, { paneId: 'main', anchor: { time: 3_000, price: 90 } });
    const committed = commitUserDrawingPathDrag(third, { createId: () => 'brush', now: () => 20 });

    expect(third.draft?.tool).toBe('brush');
    expect(committed).toMatchObject({
      selection: { drawingId: 'brush' },
      draft: null,
      drawings: [
        {
          id: 'brush',
          kind: 'brush',
          points: [anchorA, anchorB, { time: 3_000, price: 90 }],
          createdAt: 20,
          updatedAt: 20,
        },
      ],
    });
  });

  it('commits long position drawings from three anchors', () => {
    const options = { createId: () => 'long-position', now: () => 30 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'longPosition'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'long-position' });
    expect(third.drawings[0]).toMatchObject({
      id: 'long-position',
      kind: 'longPosition',
      points: [anchorA, anchorB, anchorC],
    });
  });

  it('commits flat top and bottom drawings from three anchors', () => {
    const options = { createId: () => 'flat-top-bottom', now: () => 31 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'flatTopBottom'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'flat-top-bottom' });
    expect(third.drawings[0]).toMatchObject({
      id: 'flat-top-bottom',
      kind: 'flatTopBottom',
      points: [anchorA, anchorB, anchorC],
    });
  });

  it('commits pitchfork drawings from three anchors', () => {
    const options = { createId: () => 'pitchfork', now: () => 32 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'pitchfork'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'pitchfork' });
    expect(third.drawings[0]).toMatchObject({
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [anchorA, anchorB, anchorC],
    });
  });

  it('commits pitchfork variant drawings from three anchors', () => {
    for (const tool of ['schiffPitchfork', 'modifiedSchiffPitchfork', 'insidePitchfork'] as const) {
      const options = { createId: () => tool, now: () => 33 };
      const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), tool), {
        paneId: 'main',
        anchor: anchorA,
      }, options);
      const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
      const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

      expect(second.drawings).toEqual([]);
      expect(third.draft).toBeNull();
      expect(third.selection).toEqual({ drawingId: tool });
      expect(third.drawings[0]).toMatchObject({
        id: tool,
        kind: tool,
        points: [anchorA, anchorB, anchorC],
      });
    }
  });

  it('commits pitchfan drawings from three anchors', () => {
    const options = { createId: () => 'pitchfan', now: () => 34 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'pitchfan'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'pitchfan' });
    expect(third.drawings[0]).toMatchObject({
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [anchorA, anchorB, anchorC],
    });
  });

  it('commits disjoint channel drawings from four anchors', () => {
    const anchorD = { time: 3_000, price: 90 };
    const options = { createId: () => 'disjoint-channel', now: () => 32 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'disjointChannel'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);
    const fourth = handleUserDrawingInput(third, { paneId: 'main', anchor: anchorD }, options);

    expect(third.drawings).toEqual([]);
    expect(fourth.draft).toBeNull();
    expect(fourth.selection).toEqual({ drawingId: 'disjoint-channel' });
    expect(fourth.drawings[0]).toMatchObject({
      id: 'disjoint-channel',
      kind: 'disjointChannel',
      points: [anchorA, anchorB, anchorC, anchorD],
    });
  });

  it('commits bars pattern drawings from three anchors', () => {
    const options = { createId: () => 'bars-pattern', now: () => 31 };
    const bars = [
      { time: 1_000, open: 100, high: 104, low: 99, close: 102 },
      { time: 2_000, open: 102, high: 105, low: 101, close: 101 },
    ];
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'barsPattern'), {
      paneId: 'main',
      anchor: anchorA,
      bars,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB, bars }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC, bars }, options);

    expect(second.drawings).toEqual([]);
    expect(third.draft).toBeNull();
    expect(third.selection).toEqual({ drawingId: 'bars-pattern' });
    expect(third.drawings[0]).toMatchObject({
      id: 'bars-pattern',
      kind: 'barsPattern',
      points: [anchorA, anchorB, anchorC],
      bars,
    });
  });

  it('does not commit bars pattern drawings without source bars', () => {
    const options = { createId: () => 'bars-pattern', now: () => 32 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'barsPattern'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);
    const third = handleUserDrawingInput(second, { paneId: 'main', anchor: anchorC }, options);

    expect(third.drawings).toEqual([]);
    expect(third.selection).toBeNull();
    expect(third.draft).toBeNull();
  });

  it('clears too-short path drags without creating drawings', () => {
    const started = beginUserDrawingPathDrag(setUserDrawingTool(createUserDrawingState(), 'path'), {
      paneId: 'main',
      anchor: anchorA,
    });
    const committed = commitUserDrawingPathDrag(started, { createId: () => 'unused' });

    expect(committed.drawings).toEqual([]);
    expect(committed.draft).toBeNull();
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

  it('preserves path point indexes during point selection', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'path',
          kind: 'path',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 50, price: 50 },
            { time: 90, price: 90 },
          ],
        },
      ],
    });

    const selected = resolveUserDrawingSelectionAtPoint(state, { x: 50, y: 50 }, new Map([['main', space]]));

    expect(selected.hit).toBe(true);
    expect(selected.state.selection).toEqual({ drawingId: 'path', handle: 'center', pointIndex: 1 });
  });

  it('begins, updates, commits, and cancels text label edits', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const state = createUserDrawingState({
      activeTool: 'rectangle',
      drawings: [textLabel],
      draft: {
        tool: 'rectangle',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
    });

    const editing = beginUserDrawingTextEdit(state, 'label', { now: () => 10 });

    expect(editing).toMatchObject({
      activeTool: 'select',
      selection: { drawingId: 'label' },
      draft: null,
      textEdit: {
        drawingId: 'label',
        value: 'Note',
        originalValue: 'Note',
        startedAt: 10,
      },
    });

    const updated = updateUserDrawingTextEdit(editing, 'Updated note\nSecond line');
    const committed = commitUserDrawingTextEdit(updated, { now: () => 11 });

    expect(committed.textEdit).toBeNull();
    expect(committed.selection).toEqual({ drawingId: 'label' });
    expect(committed.drawings[0]).toMatchObject({
      id: 'label',
      text: 'Updated note\nSecond line',
      updatedAt: 11,
    });

    const secondEdit = beginUserDrawingTextEdit(committed, 'label', { now: () => 12 });
    expect(cancelUserDrawingTextEdit(updateUserDrawingTextEdit(secondEdit, 'Draft')).drawings[0]).toMatchObject({
      text: 'Updated note\nSecond line',
    });
  });

  it('sets text directly without changing ids or editing unsupported drawings', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const line = {
      id: 'line',
      kind: 'horizontalLine' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      price: 100,
    };
    const locked = { ...textLabel, id: 'locked', locked: true };
    const state = createUserDrawingState({
      drawings: [textLabel, line, locked],
    });

    const changed = setUserDrawingText(state, 'label', 'Changed', { now: () => 20 });

    expect(changed.drawings.map((drawing) => drawing.id)).toEqual(['label', 'line', 'locked']);
    expect(changed.drawings[0]).toMatchObject({ text: 'Changed', updatedAt: 20 });
    expect(setUserDrawingText(changed, 'line', 'Ignored')).toBe(changed);
    expect(setUserDrawingText(changed, 'locked', 'Ignored')).toBe(changed);
    expect(beginUserDrawingTextEdit(changed, 'line')).toBe(changed);
    expect(beginUserDrawingTextEdit(changed, 'locked')).toBe(changed);
  });

  it('updates selected drawing style while preserving identity and selection', () => {
    const state = createUserDrawingState({
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
          style,
          price: 100,
        },
      ],
    });

    const updated = updateUserDrawingStyle(
      state,
      {
        lineColor: '#00ffcc',
        lineWidth: 3,
        lineStyle: 'dashed',
        opacity: 0.5,
        lineVisible: false,
        fillVisible: false,
      },
      { now: () => 10 },
    );

    expect(updated.drawings[0]).toMatchObject({
      id: 'line',
      updatedAt: 10,
      style: {
        lineColor: '#00ffcc',
        lineWidth: 3,
        lineStyle: 'dashed',
        opacity: 0.5,
        lineVisible: false,
        fillVisible: false,
      },
    });
    expect(updated.selection).toEqual({ drawingId: 'line' });
    expect(updateUserDrawingStyle(updated, { lineColor: '#00ffcc' })).toBe(updated);
  });

  it('normalizes updated text drawing font sizes', () => {
    const state = createUserDrawingState({
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
          style,
          point: anchorA,
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });

    const updated = updateUserDrawingStyle(state, { fontSize: 15 }, { now: () => 11 });

    expect(updated.drawings[0]).toMatchObject({
      updatedAt: 11,
      style: expect.objectContaining({ fontSize: 14 }),
    });
  });

  it('normalizes updated text drawing font families', () => {
    const state = createUserDrawingState({
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
          style,
          point: anchorA,
          text: 'Note',
          textAlign: 'center',
        },
      ],
    });

    const updated = updateUserDrawingStyle(state, { fontFamily: 'Comic Sans MS' }, { now: () => 12 });

    expect(updated.drawings[0]).toMatchObject({
      updatedAt: 12,
      style: expect.objectContaining({ fontFamily: 'sans-serif' }),
    });
  });

  it('updates selected or targeted text drawing alignment while respecting locks', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'left' as const,
    };
    const locked = { ...textLabel, id: 'locked', locked: true };
    const line = {
      id: 'line',
      kind: 'horizontalLine' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      price: 100,
    };
    const state = createUserDrawingState({
      selection: { drawingId: 'label' },
      drawings: [textLabel, locked, line],
    });

    const selected = setUserDrawingTextAlign(state, 'center', { now: () => 12 });
    expect(selected.drawings[0]).toMatchObject({ textAlign: 'center', updatedAt: 12 });
    expect(setUserDrawingTextAlign(selected, 'center')).toBe(selected);
    expect(setUserDrawingTextAlign(state, 'right', { drawingId: 'line' })).toBe(state);
    expect(setUserDrawingTextAlign(state, 'right', { drawingId: 'locked' })).toBe(state);

    const targeted = setUserDrawingTextAlign(state, 'right', {
      drawingId: 'locked',
      includeLocked: true,
      now: () => 13,
    });
    expect(targeted.drawings[1]).toMatchObject({ textAlign: 'right', updatedAt: 13 });
  });

  it('updates targeted drawing style and respects locked drawings by default', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'locked',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [anchorA, anchorB],
        },
      ],
    });

    expect(updateUserDrawingStyle(state, { fillColor: '#123456' }, { drawingId: 'locked' })).toBe(state);

    const updated = updateUserDrawingStyle(
      state,
      { fillColor: '#123456' },
      { drawingId: 'locked', includeLocked: true, now: () => 20 },
    );
    expect(updated.drawings[0]).toMatchObject({
      updatedAt: 20,
      style: expect.objectContaining({ fillColor: '#123456' }),
    });
  });

  it('toggles visibility and clears selection/edit state when hiding selected drawings', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const state = createUserDrawingState({
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
      drawings: [textLabel],
    });

    const hidden = setUserDrawingVisibility(state, false, { now: () => 30 });
    expect(hidden.drawings[0]).toMatchObject({ visible: false, updatedAt: 30 });
    expect(hidden.selection).toBeNull();
    expect(hidden.textEdit).toBeNull();

    const shown = setUserDrawingVisibility(hidden, true, { drawingId: 'label', now: () => 31 });
    expect(shown.drawings[0]).toMatchObject({ visible: true, updatedAt: 31 });
    expect(shown.selection).toBeNull();
  });

  it('requires explicit opt-in to change locked drawing visibility', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
      ],
    });

    expect(setUserDrawingVisibility(state, false, { drawingId: 'locked' })).toBe(state);
    expect(setUserDrawingVisibility(state, false, { drawingId: 'locked', includeLocked: true }).drawings[0]).toMatchObject({
      visible: false,
    });
  });

  it('toggles locked state and clears selection/edit state when locking selected drawings', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const state = createUserDrawingState({
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
      drawings: [textLabel],
    });

    const locked = setUserDrawingLocked(state, true, { now: () => 40 });
    expect(locked.drawings[0]).toMatchObject({ locked: true, updatedAt: 40 });
    expect(locked.selection).toBeNull();
    expect(locked.textEdit).toBeNull();

    const unlocked = setUserDrawingLocked(locked, false, { drawingId: 'label', now: () => 41 });
    expect(unlocked).toBe(locked);

    const forceUnlocked = setUserDrawingLocked(locked, false, { drawingId: 'label', includeLocked: true, now: () => 41 });
    expect(forceUnlocked.drawings[0]).toMatchObject({ locked: false, updatedAt: 41 });
  });

  it('requires explicit opt-in to unlock locked drawings by id', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
      ],
    });

    expect(setUserDrawingLocked(state, false, { drawingId: 'locked' })).toBe(state);
    const unlocked = setUserDrawingLocked(state, false, { drawingId: 'locked', includeLocked: true, now: () => 50 });
    expect(unlocked.drawings[0]).toMatchObject({ locked: false, updatedAt: 50 });
  });

  it('clears stale text edits when the edited drawing is removed or selection changes', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const other = { ...textLabel, id: 'other' };
    const state = createUserDrawingState({
      drawings: [textLabel, other],
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
    });

    expect(deleteUserDrawing(state).textEdit).toBeNull();
    expect(clearUserDrawings(state).textEdit).toBeNull();
    expect(selectUserDrawing(state, { drawingId: 'other' }).textEdit).toBeNull();
  });

  it('selects an existing drawing by id', () => {
    const state = createUserDrawingState({
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

    const selected = selectUserDrawingById(state, 'h', 'center');

    expect(selected.selection).toEqual({ drawingId: 'h', handle: 'center' });
    expect(selected.drawings).toBe(state.drawings);
    expect(selectUserDrawingById(selected, 'missing')).toBe(selected);
  });

  it('deletes the selected drawing while preserving other ids', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'b' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [
        {
          id: 'a',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 90,
        },
        {
          id: 'b',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style,
          price: 100,
        },
      ],
    });

    const next = deleteUserDrawing(state);

    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['a']);
    expect(next.drawings[0]).toBe(state.drawings[0]);
    expect(next.selection).toBeNull();
    expect(next.draft).toBeNull();
  });

  it('does not delete locked drawings unless requested', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'locked' },
      drawings: [
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
      ],
    });

    expect(deleteUserDrawing(state)).toBe(state);
    expect(deleteUserDrawing(state, { includeLocked: true }).drawings).toEqual([]);
  });

  it('clears drawings, selection, and draft', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'h' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
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
          style,
          price: 100,
        },
      ],
    });

    expect(clearUserDrawings(state)).toMatchObject({
      drawings: [],
      selection: null,
      draft: null,
    });
    expect(clearUserDrawings(createUserDrawingState())).toEqual(createUserDrawingState());
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

  it('reports hit metadata even when selection is unchanged', () => {
    const state = createUserDrawingState({
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
          style,
          price: 50,
        },
      ],
    });

    expect(resolveUserDrawingSelectionAtPoint(state, { x: 40, y: 50 }, new Map([['main', space]]))).toEqual({
      state,
      hit: true,
      changed: false,
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
    const result = resolveUserDrawingSelectionAtPoint(state, { x: 40, y: 20 }, new Map([['main', space]]));

    expect(next.selection).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.activeTool).toBe('select');
    expect(result.hit).toBe(false);
    expect(result.changed).toBe(true);
  });
});
