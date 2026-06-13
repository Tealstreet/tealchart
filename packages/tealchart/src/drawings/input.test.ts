import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  appendUserDrawingPathDragPoint,
  beginUserDrawingPlacementDrag,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft,
  cancelUserDrawingTextEdit,
  clearUserDrawings,
  commitUserDrawingPlacementDrag,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawingTableColumn,
  deleteUserDrawingTableRow,
  deleteUserDrawing,
  duplicateUserDrawing,
  getUserDrawingSelectionIds,
  handleUserDrawingInput,
  insertUserDrawingTableColumn,
  insertUserDrawingTableRow,
  reorderUserDrawings,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingAtPoint,
  selectUserDrawingById,
  selectUserDrawingsById,
  selectUserDrawing,
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingLocked,
  setUserDrawingTableCell,
  setUserDrawingTableCells,
  setUserDrawingTableDimensions,
  setUserDrawingText,
  setUserDrawingTextContent,
  setUserDrawingTextAlign,
  setUserDrawingTrendLineExtend,
  setUserDrawingTool,
  setUserDrawingVisibility,
  updateUserDrawingStyle,
  updateUserDrawingTextEdit,
} from './input';
import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingTool } from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 2_000, price: 95 };
const anchorD = { time: 3_000, price: 115 };
const anchorE = { time: 4_000, price: 105 };
const expandedDragPlacementTools: UserDrawingTool[] = [
  'trendAngle',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'forecast',
  'fixedRangeVolumeProfile',
  'callout',
  'priceNote',
  'image',
  'fibRetracement',
  'fibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibCircles',
  'fibSpiral',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibTimeZone',
  'cyclicLines',
  'timeCycles',
  'sineLine',
];
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

  it('commits two-anchor drag placement from the drag start and end anchors', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const started = beginUserDrawingPlacementDrag(
      state,
      { paneId: 'main', anchor: anchorA, position: { x: 10, y: 20 } },
      { now: () => 10, style },
    );

    expect(started.draft).toMatchObject({
      tool: 'rectangle',
      paneId: 'main',
      anchors: [anchorA],
      positions: [{ x: 1, y: 1 }],
    });

    const committed = commitUserDrawingPlacementDrag(
      started,
      { paneId: 'main', anchor: anchorB, position: { x: 80, y: 60 } },
      { createId: () => 'drag-rect', now: () => 11, style },
    );

    expect(committed.draft).toBeNull();
    expect(committed.selection).toEqual({ drawingId: 'drag-rect' });
    expect(committed.drawings).toHaveLength(1);
    expect(committed.drawings[0]).toMatchObject({
      id: 'drag-rect',
      kind: 'rectangle',
      points: [anchorA, anchorB],
    });
  });

  it('commits expanded two-anchor tools through drag placement', () => {
    for (const tool of expandedDragPlacementTools) {
      const started = beginUserDrawingPlacementDrag(
        setUserDrawingTool(createUserDrawingState(), tool),
        { paneId: 'main', anchor: anchorA },
        { now: () => 10, style, text: 'Draft label' },
      );
      const committed = commitUserDrawingPlacementDrag(started, { paneId: 'main', anchor: anchorB }, {
        createId: () => `drag-${tool}`,
        now: () => 11,
        style,
        text: 'Draft label',
      });

      expect(committed.draft, tool).toBeNull();
      expect(committed.selection, tool).toEqual({ drawingId: `drag-${tool}` });
      expect(committed.drawings[0], tool).toMatchObject({
        id: `drag-${tool}`,
        kind: tool,
        points: [anchorA, anchorB],
      });
    }
  });

  it('ignores drag placement commands for tools without drag placement semantics', () => {
    const horizontalLineState = setUserDrawingTool(createUserDrawingState(), 'horizontalLine');

    expect(beginUserDrawingPlacementDrag(horizontalLineState, { paneId: 'main', anchor: anchorA })).toBe(
      horizontalLineState,
    );
    expect(
      commitUserDrawingPlacementDrag(horizontalLineState, { paneId: 'main', anchor: anchorB }, { createId: () => 'line' }),
    ).toBe(horizontalLineState);
  });

  it('cancels two-anchor drag placement when the drag never reaches a distinct endpoint', () => {
    const started = beginUserDrawingPlacementDrag(
      setUserDrawingTool(createUserDrawingState(), 'rectangle'),
      { paneId: 'main', anchor: anchorA },
      { now: () => 10, style },
    );
    const cancelled = commitUserDrawingPlacementDrag(started, { paneId: 'main', anchor: anchorA }, {
      createId: () => 'drag-rect',
      now: () => 11,
      style,
    });

    expect(cancelled.drawings).toEqual([]);
    expect(cancelled.draft).toBeNull();
    expect(cancelled.selection).toBeNull();
  });

  it('commits fixed range volume profiles from two anchors', () => {
    const options = { createId: () => 'volume-profile', now: () => 21 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fixedRangeVolumeProfile'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'volume-profile' });
    expect(second.drawings[0]).toMatchObject({
      id: 'volume-profile',
      kind: 'fixedRangeVolumeProfile',
      points: [anchorA, anchorB],
      createdAt: 21,
      updatedAt: 21,
    });
  });

  it('commits table drawings from a single anchor with default cells', () => {
    const options = { createId: () => 'table', now: () => 23 };
    const next = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'table'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);

    expect(next.draft).toBeNull();
    expect(next.selection).toEqual({ drawingId: 'table' });
    expect(next.drawings[0]).toMatchObject({
      id: 'table',
      kind: 'table',
      point: anchorA,
      cells: [
        ['Label', 'Value'],
        ['Price', ''],
      ],
      textAlign: 'left',
      createdAt: 23,
      updatedAt: 23,
    });
  });

  it('commits image annotations from two anchors', () => {
    const options = { createId: () => 'image', now: () => 22 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'image'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'image' });
    expect(second.drawings[0]).toMatchObject({
      id: 'image',
      kind: 'image',
      points: [anchorA, anchorB],
      src: '',
      alt: 'Image placeholder',
      createdAt: 22,
      updatedAt: 22,
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

  it('commits fib arc drawings from two anchors', () => {
    const options = { createId: () => 'fib-arcs', now: () => 25 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'fibArcs'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);
    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(first.drawings).toEqual([]);
    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'fib-arcs' });
    expect(second.drawings[0]).toMatchObject({
      id: 'fib-arcs',
      kind: 'fibArcs',
      points: [anchorA, anchorB],
      createdAt: 25,
      updatedAt: 25,
    });
  });

  it('commits fib circle drawings from two anchors', () => {
    const options = { createId: () => 'fib-circles', now: () => 26 };
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
      createdAt: 26,
      updatedAt: 26,
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

  it('builds variable-point highlighter drawings from drag samples', () => {
    const started = beginUserDrawingPathDrag(
      setUserDrawingTool(createUserDrawingState(), 'highlighter'),
      { paneId: 'main', anchor: anchorA },
      { now: () => 10, style },
    );
    const second = appendUserDrawingPathDragPoint(started, { paneId: 'main', anchor: anchorB });
    const third = appendUserDrawingPathDragPoint(second, { paneId: 'main', anchor: { time: 3_000, price: 90 } });
    const committed = commitUserDrawingPathDrag(third, { createId: () => 'highlighter', now: () => 20 });

    expect(third.draft?.tool).toBe('highlighter');
    expect(committed).toMatchObject({
      selection: { drawingId: 'highlighter' },
      draft: null,
      drawings: [
        {
          id: 'highlighter',
          kind: 'highlighter',
          points: [anchorA, anchorB, { time: 3_000, price: 90 }],
          createdAt: 20,
          updatedAt: 20,
        },
      ],
    });
  });

  it('seeds supported multi-anchor drawings from placement drag before final click', () => {
    const dragSeedTools = [
      'triangle',
      'curve',
      'arc',
      'polyline',
      'rotatedRectangle',
      'parallelChannel',
      'regressionTrend',
      'flatTopBottom',
      'pitchfork',
      'schiffPitchfork',
      'modifiedSchiffPitchfork',
      'insidePitchfork',
      'pitchfan',
      'trendBasedFibExtension',
      'fibWedge',
      'fibChannel',
      'trendBasedFibTime',
    ] as const;

    for (const tool of dragSeedTools) {
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const started = beginUserDrawingPlacementDrag(
        state,
        { paneId: 'main', anchor: anchorA },
        { now: () => 10, style },
      );
      const seeded = commitUserDrawingPlacementDrag(
        started,
        { paneId: 'main', anchor: anchorB },
        {
          createId: () => `${tool}-drawing`,
          now: () => 11,
          style,
        },
      );
      const committed = handleUserDrawingInput(
        seeded,
        { paneId: 'main', anchor: anchorC },
        {
          createId: () => `${tool}-drawing`,
          now: () => 12,
          style,
        },
      );

      expect(started.draft?.anchors, tool).toEqual([anchorA]);
      expect(seeded.drawings, tool).toEqual([]);
      expect(seeded.draft, tool).toMatchObject({
        tool,
        paneId: 'main',
        anchors: [anchorA, anchorB],
      });
      expect(committed.draft, tool).toBeNull();
      expect(committed.selection, tool).toEqual({ drawingId: `${tool}-drawing` });
      expect(committed.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB, anchorC],
      });
    }
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

  it('selects multiple drawings by id while preserving a primary drawing id', () => {
    const state = createUserDrawingState({
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
      ],
    });

    const selected = selectUserDrawingsById(state, ['b', 'a', 'missing', 'b']);

    expect(selected.selection).toEqual({ drawingId: 'b', drawingIds: ['b', 'a'] });
    expect(getUserDrawingSelectionIds(selected.selection)).toEqual(['b', 'a']);
    expect(selected.draft).toBeNull();
    expect(selectUserDrawingsById(selected, ['b', 'a'])).toBe(selected);
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

  it('updates selected or targeted text content while respecting locks', () => {
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
    const note = { ...textLabel, id: 'note', kind: 'note' as const, text: 'Note target' };
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
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 2 },
      drawings: [textLabel, note, line, locked],
    });

    const selected = setUserDrawingTextContent(state, 'Selected text', { now: () => 30 });

    expect(selected.selection).toEqual({ drawingId: 'label' });
    expect(selected.textEdit).toBeNull();
    expect(selected.drawings[0]).toMatchObject({ text: 'Selected text', updatedAt: 30 });
    expect(setUserDrawingTextContent(selected, 'Selected text')).toBe(selected);
    expect(setUserDrawingTextContent(selected, 'Ignored', { drawingId: 'line' })).toBe(selected);
    expect(setUserDrawingTextContent(selected, 'Ignored', { drawingId: 'locked' })).toBe(selected);

    const targeted = setUserDrawingTextContent(selected, 'Targeted text', { drawingId: 'note', now: () => 31 });
    expect(targeted.selection).toEqual({ drawingId: 'note' });
    expect(targeted.drawings[1]).toMatchObject({ text: 'Targeted text', updatedAt: 31 });
    expect(
      setUserDrawingTextContent(targeted, 'Unlocked', { drawingId: 'locked', includeLocked: true }).drawings[3],
    ).toMatchObject({ text: 'Unlocked' });
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

  it('normalizes updated text drawing font weights', () => {
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

    const bold = updateUserDrawingStyle(
      state,
      {
        fontWeight: 'bold',
        fontStyle: 'italic',
        textUnderline: true,
        textLineThrough: true,
        textWrap: true,
        textMaxWidth: 190,
      },
      { now: () => 13 },
    );
    const normalized = updateUserDrawingStyle(
      bold,
      { fontWeight: 'heavy' as never, fontStyle: 'oblique' as never },
      { now: () => 14 },
    );

    expect(bold.drawings[0]).toMatchObject({
      updatedAt: 13,
      style: expect.objectContaining({
        fontWeight: 'bold',
        fontStyle: 'italic',
        textUnderline: true,
        textLineThrough: true,
        textWrap: true,
        textMaxWidth: 180,
      }),
    });
    expect(normalized.drawings[0]).toMatchObject({
      updatedAt: 14,
      style: expect.objectContaining({ fontWeight: 'normal', fontStyle: 'normal' }),
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
    const table = {
      id: 'table',
      kind: 'table' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      cells: [['Metric', 'Value']],
      textAlign: 'left' as const,
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
    const state = createUserDrawingState({
      selection: { drawingId: 'label' },
      drawings: [textLabel, locked, table, line],
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

    const tableAligned = setUserDrawingTextAlign(state, 'right', { drawingId: 'table', now: () => 14 });
    expect(tableAligned.drawings[2]).toMatchObject({ textAlign: 'right', updatedAt: 14 });
  });

  it('updates selected trend-line extension while respecting locks', () => {
    const trendLine = {
      id: 'trend',
      kind: 'trendLine' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      points: [anchorA, anchorB] as const,
      extend: 'none' as const,
    };
    const locked = { ...trendLine, id: 'locked', locked: true };
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
      selection: { drawingId: 'trend' },
      drawings: [trendLine, locked, line],
    });

    const selected = setUserDrawingTrendLineExtend(state, 'both', { now: () => 22 });
    expect(selected.drawings[0]).toMatchObject({ extend: 'both', updatedAt: 22 });
    expect(setUserDrawingTrendLineExtend(selected, 'both')).toBe(selected);
    expect(setUserDrawingTrendLineExtend(state, 'right', { drawingId: 'line' })).toBe(state);
    expect(setUserDrawingTrendLineExtend(state, 'right', { drawingId: 'locked' })).toBe(state);

    const targeted = setUserDrawingTrendLineExtend(state, 'left', {
      drawingId: 'locked',
      includeLocked: true,
      now: () => 23,
    });
    expect(targeted.drawings[1]).toMatchObject({ extend: 'left', updatedAt: 23 });
  });

  it('updates selected or targeted icon drawings while respecting locks', () => {
    const icon = {
      id: 'icon',
      kind: 'icon' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      iconName: 'star' as const,
    };
    const locked = { ...icon, id: 'locked', locked: true };
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
      selection: { drawingId: 'icon' },
      drawings: [icon, locked, line],
    });

    const selected = setUserDrawingIconName(state, 'flag', { now: () => 12 });
    expect(selected.drawings[0]).toMatchObject({ iconName: 'flag', updatedAt: 12 });
    expect(setUserDrawingIconName(selected, 'flag')).toBe(selected);
    expect(setUserDrawingIconName(state, 'circle', { drawingId: 'line' })).toBe(state);
    expect(setUserDrawingIconName(state, 'circle', { drawingId: 'locked' })).toBe(state);

    const targeted = setUserDrawingIconName(state, 'arrowUp', {
      drawingId: 'locked',
      includeLocked: true,
      now: () => 13,
    });
    expect(targeted.drawings[1]).toMatchObject({ iconName: 'arrowUp', updatedAt: 13 });
  });

  it('updates image sources for selected or targeted image drawings', () => {
    const image = {
      id: 'image',
      kind: 'image' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      points: [anchorA, anchorB] as const,
      src: '',
      alt: 'Image',
    };
    const locked = { ...image, id: 'locked', locked: true };
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
      selection: { drawingId: 'image' },
      drawings: [image, locked, line],
    });

    const selected = setUserDrawingImageSource(
      state,
      { src: 'https://example.test/chart.png', alt: 'Chart snapshot' },
      { now: () => 14 },
    );
    expect(selected.drawings[0]).toMatchObject({
      src: 'https://example.test/chart.png',
      alt: 'Chart snapshot',
      updatedAt: 14,
    });
    expect(setUserDrawingImageSource(selected, { src: 'https://example.test/chart.png' })).toBe(selected);
    expect(setUserDrawingImageSource(state, { src: 'ignored.png' }, { drawingId: 'line' })).toBe(state);
    expect(setUserDrawingImageSource(state, { src: 'ignored.png' }, { drawingId: 'locked' })).toBe(state);

    const targeted = setUserDrawingImageSource(
      state,
      { src: 'locked.png' },
      { drawingId: 'locked', includeLocked: true, now: () => 15 },
    );
    expect(targeted.drawings[1]).toMatchObject({ src: 'locked.png', alt: 'Image', updatedAt: 15 });
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

  it('updates grouped selected drawing style while skipping locked drawings', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'b', 'locked'] },
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 80,
        },
      ],
    });

    const updated = updateUserDrawingStyle(state, { lineColor: '#00ffcc', lineWidth: 3 }, { now: () => 21 });

    expect(updated.drawings[0]).toMatchObject({ updatedAt: 21, style: expect.objectContaining({ lineColor: '#00ffcc' }) });
    expect(updated.drawings[1]).toMatchObject({ updatedAt: 21, style: expect.objectContaining({ lineWidth: 3 }) });
    expect(updated.drawings[2]).toBe(state.drawings[2]);
    expect(updated.selection).toEqual({ drawingId: 'a', drawingIds: ['a', 'b', 'locked'] });
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

  it('toggles grouped selected drawing visibility and preserves locked selection', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'b', 'locked'] },
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 80,
        },
      ],
    });

    const hidden = setUserDrawingVisibility(state, false, { now: () => 32 });

    expect(hidden.drawings.map((drawing) => drawing.visible)).toEqual([false, false, true]);
    expect(hidden.drawings[0]).toMatchObject({ updatedAt: 32 });
    expect(hidden.drawings[1]).toMatchObject({ updatedAt: 32 });
    expect(hidden.selection).toEqual({ drawingId: 'locked' });
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

  it('toggles grouped selected drawing locks and clears newly locked selection ids', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'b'] },
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
      ],
    });

    const locked = setUserDrawingLocked(state, true, { now: () => 42 });

    expect(locked.drawings.map((drawing) => drawing.locked)).toEqual([true, true]);
    expect(locked.drawings[0]).toMatchObject({ updatedAt: 42 });
    expect(locked.drawings[1]).toMatchObject({ updatedAt: 42 });
    expect(locked.selection).toBeNull();
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

  it('deletes unlocked grouped selections and preserves locked selected drawings', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'b', 'c'] },
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
        {
          id: 'c',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 80,
        },
      ],
    });

    const next = deleteUserDrawing(state);

    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['b']);
    expect(next.selection).toEqual({ drawingId: 'b' });
    expect(deleteUserDrawing(state, { includeLocked: true }).drawings).toEqual([]);
  });

  it('duplicates selected drawings with a new id, timestamp, and deep-cloned payload', () => {
    const state = createUserDrawingState({
      activeTool: 'rectangle',
      selection: { drawingId: 'pattern' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Text', startedAt: 1 },
      drawings: [
        {
          id: 'pattern',
          kind: 'barsPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC],
          bars: [{ time: 1, open: 10, high: 12, low: 9, close: 11 }],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 20 });

    expect(next.activeTool).toBe('select');
    expect(next.selection).toEqual({ drawingId: 'copy' });
    expect(next.draft).toBeNull();
    expect(next.textEdit).toBeNull();
    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['pattern', 'copy']);
    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'barsPattern',
      createdAt: 20,
      updatedAt: 20,
      points: [anchorA, anchorB, anchorC],
      bars: [{ time: 1, open: 10, high: 12, low: 9, close: 11 }],
    });
    expect(next.drawings[1]).not.toBe(state.drawings[0]);
    if (next.drawings[1]?.kind !== 'barsPattern' || state.drawings[0]?.kind !== 'barsPattern') {
      throw new Error('expected bars pattern drawings');
    }
    expect(next.drawings[1].style).not.toBe(state.drawings[0].style);
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.drawings[1].bars[0]).not.toBe(state.drawings[0].bars[0]);
  });

  it('duplicates table drawings with deep-cloned cell matrices', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'table' },
      drawings: [
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'right',
          cells: [
            ['Metric', 'Value'],
            ['Price', '101.25'],
          ],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 21 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'table',
      createdAt: 21,
      updatedAt: 21,
      point: anchorA,
      textAlign: 'right',
      cells: [
        ['Metric', 'Value'],
        ['Price', '101.25'],
      ],
    });
    if (next.drawings[1]?.kind !== 'table' || state.drawings[0]?.kind !== 'table') {
      throw new Error('expected table drawings');
    }
    expect(next.drawings[1].point).not.toBe(state.drawings[0].point);
    expect(next.drawings[1].cells).not.toBe(state.drawings[0].cells);
    expect(next.drawings[1].cells[0]).not.toBe(state.drawings[0].cells[0]);
  });

  it('updates table drawing cells with normalized matrices', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'table' },
      drawings: [
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'left',
          cells: [
            ['Metric', 'Value'],
            ['Price', '101.25'],
          ],
        },
      ],
    });

    const next = setUserDrawingTableCells(state, [['Metric', 'Value'], ['Volume']], { now: () => 30 });

    expect(next.selection).toEqual({ drawingId: 'table' });
    expect(next.drawings[0]).toMatchObject({
      id: 'table',
      kind: 'table',
      updatedAt: 30,
      textAlign: 'left',
      cells: [
        ['Metric', 'Value'],
        ['Volume', ''],
      ],
    });
    expect(setUserDrawingTableCells(next, [['Metric', 'Value'], ['Volume', '']])).toBe(next);
  });

  it('updates a single existing table cell while preserving the matrix shape', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'table' },
      drawings: [
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'left',
          cells: [
            ['Metric', 'Value'],
            ['Price', '101.25'],
          ],
        },
      ],
    });

    const next = setUserDrawingTableCell(state, 1, 1, 102.5, { now: () => 31 });

    expect(next.selection).toEqual({ drawingId: 'table' });
    expect(next.drawings[0]).toMatchObject({
      id: 'table',
      kind: 'table',
      updatedAt: 31,
      cells: [
        ['Metric', 'Value'],
        ['Price', '102.5'],
      ],
    });
    expect(setUserDrawingTableCell(next, 1, 1, '102.5')).toBe(next);
    expect(setUserDrawingTableCell(next, 4, 0, 'ignored')).toBe(next);
    expect(setUserDrawingTableCell(next, -1, 0, 'ignored')).toBe(next);
    expect(setUserDrawingTableCell(next, 0, Number.NaN, 'ignored')).toBe(next);
  });

  it('resizes table drawing dimensions while preserving overlapping cells', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'table' },
      drawings: [
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'left',
          cells: [
            ['Metric', 'Value'],
            ['Price', '101.25'],
          ],
        },
      ],
    });

    const expanded = setUserDrawingTableDimensions(state, 3, 3, { now: () => 32 });

    expect(expanded.selection).toEqual({ drawingId: 'table' });
    expect(expanded.drawings[0]).toMatchObject({
      id: 'table',
      kind: 'table',
      updatedAt: 32,
      cells: [
        ['Metric', 'Value', ''],
        ['Price', '101.25', ''],
        ['', '', ''],
      ],
    });
    expect(setUserDrawingTableDimensions(expanded, 3, 3)).toBe(expanded);

    expect(setUserDrawingTableDimensions(expanded, 1, 1, { now: () => 33 }).drawings[0]).toMatchObject({
      updatedAt: 33,
      cells: [['Metric']],
    });
    expect(setUserDrawingTableDimensions(expanded, 0, 2)).toBe(expanded);
    expect(setUserDrawingTableDimensions(expanded, 2, -1)).toBe(expanded);
    expect(setUserDrawingTableDimensions(expanded, Number.NaN, 2)).toBe(expanded);
  });

  it('inserts and deletes table rows and columns while preserving existing cells', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'table' },
      drawings: [
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'left',
          cells: [
            ['Metric', 'Value'],
            ['Price', '101.25'],
          ],
        },
      ],
    });

    const withRow = insertUserDrawingTableRow(state, 1, ['Volume', 10_000, 'ignored'], { now: () => 34 });
    expect(withRow.selection).toEqual({ drawingId: 'table' });
    expect(withRow.drawings[0]).toMatchObject({
      updatedAt: 34,
      cells: [
        ['Metric', 'Value'],
        ['Volume', '10000'],
        ['Price', '101.25'],
      ],
    });

    const withoutRow = deleteUserDrawingTableRow(withRow, 0, { now: () => 35 });
    expect(withoutRow.drawings[0]).toMatchObject({
      updatedAt: 35,
      cells: [
        ['Volume', '10000'],
        ['Price', '101.25'],
      ],
    });

    const withColumn = insertUserDrawingTableColumn(withoutRow, 1, ['Type', 'Spot'], { now: () => 36 });
    expect(withColumn.drawings[0]).toMatchObject({
      updatedAt: 36,
      cells: [
        ['Volume', 'Type', '10000'],
        ['Price', 'Spot', '101.25'],
      ],
    });

    expect(deleteUserDrawingTableColumn(withColumn, 2, { now: () => 37 }).drawings[0]).toMatchObject({
      updatedAt: 37,
      cells: [
        ['Volume', 'Type'],
        ['Price', 'Spot'],
      ],
    });
    expect(insertUserDrawingTableRow(state, -1)).toBe(state);
    expect(deleteUserDrawingTableRow(state, 4)).toBe(state);
    expect(insertUserDrawingTableColumn(state, Number.NaN)).toBe(state);
    expect(deleteUserDrawingTableColumn(state, -1)).toBe(state);
    const oneRow = setUserDrawingTableDimensions(state, 1, 2);
    const oneColumn = setUserDrawingTableDimensions(state, 2, 1);
    expect(deleteUserDrawingTableRow(oneRow, 0)).toBe(oneRow);
    expect(deleteUserDrawingTableColumn(oneColumn, 0)).toBe(oneColumn);
  });

  it('ignores table cell updates for non-table and locked drawings without opt-in', () => {
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
        {
          id: 'table',
          kind: 'table',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 2,
          style,
          point: anchorA,
          textAlign: 'left',
          cells: [['Metric', 'Value']],
        },
      ],
    });

    expect(setUserDrawingTableCells(state, [['Ignored']])).toBe(state);
    expect(setUserDrawingTableCell(state, 0, 0, 'Ignored')).toBe(state);
    expect(setUserDrawingTableDimensions(state, 2, 2)).toBe(state);
    expect(insertUserDrawingTableRow(state, 0)).toBe(state);
    expect(deleteUserDrawingTableRow(state, 0)).toBe(state);
    expect(insertUserDrawingTableColumn(state, 0)).toBe(state);
    expect(deleteUserDrawingTableColumn(state, 0)).toBe(state);
    expect(setUserDrawingTableCells(state, [['Updated']], { drawingId: 'table' })).toBe(state);
    expect(setUserDrawingTableCell(state, 0, 0, 'Updated', { drawingId: 'table' })).toBe(state);
    expect(setUserDrawingTableDimensions(state, 2, 2, { drawingId: 'table' })).toBe(state);
    expect(insertUserDrawingTableRow(state, 0, undefined, { drawingId: 'table' })).toBe(state);
    expect(deleteUserDrawingTableRow(state, 0, { drawingId: 'table' })).toBe(state);
    expect(insertUserDrawingTableColumn(state, 0, undefined, { drawingId: 'table' })).toBe(state);
    expect(deleteUserDrawingTableColumn(state, 0, { drawingId: 'table' })).toBe(state);
    expect(
      setUserDrawingTableCells(state, [['Updated']], { drawingId: 'table', includeLocked: true }).drawings[1],
    ).toMatchObject({
      cells: [['Updated']],
    });
    expect(
      setUserDrawingTableCell(state, 0, 1, null, { drawingId: 'table', includeLocked: true }).drawings[1],
    ).toMatchObject({
      cells: [['Metric', '']],
    });
    expect(
      setUserDrawingTableDimensions(state, 2, 2, { drawingId: 'table', includeLocked: true }).drawings[1],
    ).toMatchObject({
      cells: [
        ['Metric', 'Value'],
        ['', ''],
      ],
    });
    expect(
      insertUserDrawingTableRow(state, 1, ['Added', 1], { drawingId: 'table', includeLocked: true }).drawings[1],
    ).toMatchObject({
      cells: [
        ['Metric', 'Value'],
        ['Added', '1'],
      ],
    });
    expect(
      insertUserDrawingTableColumn(state, 1, ['Added'], { drawingId: 'table', includeLocked: true }).drawings[1],
    ).toMatchObject({
      cells: [['Metric', 'Added', 'Value']],
    });
  });

  it('duplicates XABCD pattern drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'xabcd' },
      drawings: [
        {
          id: 'xabcd',
          kind: 'xabcdPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 20 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'xabcdPattern',
      createdAt: 20,
      updatedAt: 20,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'xabcdPattern' || state.drawings[0]?.kind !== 'xabcdPattern') {
      throw new Error('expected XABCD pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates cypher pattern drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'cypher' },
      drawings: [
        {
          id: 'cypher',
          kind: 'cypherPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 20 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'cypherPattern',
      createdAt: 20,
      updatedAt: 20,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'cypherPattern' || state.drawings[0]?.kind !== 'cypherPattern') {
      throw new Error('expected cypher pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates three drives pattern drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'three-drives' },
      drawings: [
        {
          id: 'three-drives',
          kind: 'threeDrivesPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 22 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'threeDrivesPattern',
      createdAt: 22,
      updatedAt: 22,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'threeDrivesPattern' || state.drawings[0]?.kind !== 'threeDrivesPattern') {
      throw new Error('expected three drives pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates head and shoulders pattern drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'head-shoulders' },
      drawings: [
        {
          id: 'head-shoulders',
          kind: 'headShouldersPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 23 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'headShouldersPattern',
      createdAt: 23,
      updatedAt: 23,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'headShouldersPattern' || state.drawings[0]?.kind !== 'headShouldersPattern') {
      throw new Error('expected head and shoulders pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates Elliott impulse wave drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'elliott-impulse' },
      drawings: [
        {
          id: 'elliott-impulse',
          kind: 'elliottImpulseWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 24 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'elliottImpulseWave',
      createdAt: 24,
      updatedAt: 24,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'elliottImpulseWave' || state.drawings[0]?.kind !== 'elliottImpulseWave') {
      throw new Error('expected Elliott impulse wave drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates Elliott corrective wave drawings with deep-cloned three-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'elliott-corrective' },
      drawings: [
        {
          id: 'elliott-corrective',
          kind: 'elliottCorrectiveWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 25 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'elliottCorrectiveWave',
      createdAt: 25,
      updatedAt: 25,
      points: [anchorA, anchorB, anchorC],
    });
    if (next.drawings[1]?.kind !== 'elliottCorrectiveWave' || state.drawings[0]?.kind !== 'elliottCorrectiveWave') {
      throw new Error('expected Elliott corrective wave drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates Elliott double combo wave drawings with deep-cloned three-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'elliott-double-combo' },
      drawings: [
        {
          id: 'elliott-double-combo',
          kind: 'elliottDoubleComboWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 25 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'elliottDoubleComboWave',
      createdAt: 25,
      updatedAt: 25,
      points: [anchorA, anchorB, anchorC],
    });
    if (
      next.drawings[1]?.kind !== 'elliottDoubleComboWave' ||
      state.drawings[0]?.kind !== 'elliottDoubleComboWave'
    ) {
      throw new Error('expected Elliott double combo wave drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates Elliott triangle wave drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'elliott-triangle' },
      drawings: [
        {
          id: 'elliott-triangle',
          kind: 'elliottTriangleWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 26 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'elliottTriangleWave',
      createdAt: 26,
      updatedAt: 26,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (next.drawings[1]?.kind !== 'elliottTriangleWave' || state.drawings[0]?.kind !== 'elliottTriangleWave') {
      throw new Error('expected Elliott triangle wave drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates Elliott triple combo wave drawings with deep-cloned five-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'elliott-triple-combo' },
      drawings: [
        {
          id: 'elliott-triple-combo',
          kind: 'elliottTripleComboWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD, anchorE],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 26 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'elliottTripleComboWave',
      createdAt: 26,
      updatedAt: 26,
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
    });
    if (
      next.drawings[1]?.kind !== 'elliottTripleComboWave' ||
      state.drawings[0]?.kind !== 'elliottTripleComboWave'
    ) {
      throw new Error('expected Elliott triple combo wave drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates ABCD pattern drawings with deep-cloned four-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'abcd' },
      drawings: [
        {
          id: 'abcd',
          kind: 'abcdPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 20 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'abcdPattern',
      createdAt: 20,
      updatedAt: 20,
      points: [anchorA, anchorB, anchorC, anchorD],
    });
    if (next.drawings[1]?.kind !== 'abcdPattern' || state.drawings[0]?.kind !== 'abcdPattern') {
      throw new Error('expected ABCD pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates triangle pattern drawings with deep-cloned four-point payloads', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'triangle-pattern' },
      drawings: [
        {
          id: 'triangle-pattern',
          kind: 'trianglePattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 2,
          style,
          points: [anchorA, anchorB, anchorC, anchorD],
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => 'copy', now: () => 21 });

    expect(next.drawings[1]).toMatchObject({
      id: 'copy',
      kind: 'trianglePattern',
      createdAt: 21,
      updatedAt: 21,
      points: [anchorA, anchorB, anchorC, anchorD],
    });
    if (next.drawings[1]?.kind !== 'trianglePattern' || state.drawings[0]?.kind !== 'trianglePattern') {
      throw new Error('expected triangle pattern drawings');
    }
    expect(next.drawings[1].points[0]).not.toBe(state.drawings[0].points[0]);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('duplicates grouped selections after each source drawing and selects the copies', () => {
    let id = 0;
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'c'] },
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
          price: 100,
        },
        {
          id: 'b',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 20,
        },
        {
          id: 'c',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 80,
        },
      ],
    });

    const next = duplicateUserDrawing(state, { createId: () => `copy-${++id}`, now: () => 20 });

    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['a', 'copy-1', 'b', 'c', 'copy-2']);
    expect(next.selection).toEqual({ drawingId: 'copy-1', drawingIds: ['copy-1', 'copy-2'] });
    expect(next.drawings[1]).toMatchObject({ kind: 'horizontalLine', price: 100, createdAt: 20, updatedAt: 20 });
    expect(next.drawings[4]).toMatchObject({ kind: 'horizontalLine', price: 80, createdAt: 20, updatedAt: 20 });
  });

  it('does not duplicate locked drawings unless requested', () => {
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

    expect(duplicateUserDrawing(state, { createId: () => 'copy' })).toBe(state);
    expect(
      duplicateUserDrawing(state, { createId: () => 'copy', includeLocked: true, now: () => 2 }).drawings,
    ).toMatchObject([
      { id: 'locked', locked: true },
      { id: 'copy', locked: true, createdAt: 2, updatedAt: 2 },
    ]);
  });

  it('reorders selected drawings while preserving selected group membership', () => {
    const createLine = (id: string, price: number, locked = false) => ({
      id,
      kind: 'horizontalLine' as const,
      paneId: 'main',
      visible: true,
      locked,
      createdAt: 1,
      updatedAt: 1,
      style,
      price,
    });
    const state = createUserDrawingState({
      selection: { drawingId: 'a', drawingIds: ['a', 'c'] },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [createLine('a', 100), createLine('b', 90), createLine('c', 80), createLine('d', 70)],
    });

    const forward = reorderUserDrawings(state, 'bringForward');
    expect(forward.drawings.map((drawing) => drawing.id)).toEqual(['b', 'a', 'd', 'c']);
    expect(forward.selection).toEqual({ drawingId: 'a', drawingIds: ['a', 'c'] });
    expect(forward.draft).toBeNull();
    expect(forward.drawings[1]).toBe(state.drawings[0]);

    expect(reorderUserDrawings(forward, 'bringToFront').drawings.map((drawing) => drawing.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(reorderUserDrawings(state, 'sendBackward').drawings.map((drawing) => drawing.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
    expect(reorderUserDrawings(state, 'sendToBack').drawings.map((drawing) => drawing.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
  });

  it('reorders targeted drawings and requires explicit opt-in for locked drawings', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'locked' },
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
          price: 100,
        },
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 80,
        },
        {
          id: 'c',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 60,
        },
      ],
    });

    expect(reorderUserDrawings(state, 'bringForward')).toBe(state);
    expect(reorderUserDrawings(state, 'bringForward', { includeLocked: true }).drawings.map((drawing) => drawing.id)).toEqual([
      'a',
      'c',
      'locked',
    ]);
    expect(reorderUserDrawings(state, 'sendToBack', { drawingId: 'c' }).drawings.map((drawing) => drawing.id)).toEqual([
      'c',
      'a',
      'locked',
    ]);
    expect(reorderUserDrawings(state, 'bringForward', { drawingId: 'missing' })).toBe(state);
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

  it('adds and removes drawings from selection with additive point selection', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'bottom' },
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
          price: 40,
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

    const added = resolveUserDrawingSelectionAtPoint(state, { x: 40, y: 50 }, new Map([['main', space]]), {
      additive: true,
    });

    expect(added.state.selection).toEqual({ drawingId: 'bottom', drawingIds: ['bottom', 'top'] });
    expect(added.hit).toBe(true);
    expect(added.changed).toBe(true);

    const removed = resolveUserDrawingSelectionAtPoint(added.state, { x: 40, y: 50 }, new Map([['main', space]]), {
      additive: true,
    });
    expect(removed.state.selection).toEqual({ drawingId: 'bottom' });

    const missed = resolveUserDrawingSelectionAtPoint(added.state, { x: 40, y: 20 }, new Map([['main', space]]), {
      additive: true,
    });
    expect(missed).toEqual({ state: added.state, hit: false, changed: false });
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
