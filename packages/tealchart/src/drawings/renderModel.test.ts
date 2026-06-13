import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingState, UserDrawingStyle } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  resolveUserDrawingHandlePoints,
  resolveUserDrawingRenderEntries,
  resolveUserDrawingScreenBounds,
  resolveUserDrawingSelectionActionAnchor,
} from './renderModel';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
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

const lowerPaneSpace: DrawingCoordinateSpace = {
  ...space,
  pane: {
    id: 'macd',
    top: 100,
    height: 80,
    bottom: 180,
    yMin: -10,
    yMax: 10,
  },
};

describe('user drawing render model', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('marks committed selection and appends draft previews', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'trendLine',
      selection: { drawingId: 'line' },
      drawings: [
        {
          id: 'line',
          kind: 'trendLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 0, price: 50 },
            { time: 50, price: 50 },
          ],
          extend: 'none',
        },
      ],
      draft: {
        tool: 'rectangle',
        paneId: 'main',
        anchors: [{ time: 10, price: 90 }],
        style,
        startedAt: 2,
      },
      textEdit: null,
    };

    const entries = resolveUserDrawingRenderEntries(state, {
      draftPreviewAnchor: { time: 90, price: 10 },
      draftId: 'draft',
    });

    expect(entries.map((entry) => [entry.drawing.id, entry.phase, entry.selected])).toEqual([
      ['line', 'committed', true],
      ['draft', 'draft', false],
    ]);
    expect(entries[1]?.drawing).toMatchObject({
      kind: 'rectangle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    });
  });

  it('keeps drag-seeded multi-anchor drafts renderable after drag release', () => {
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
      'projection',
      'sector',
      'longPosition',
      'shortPosition',
      'elliottCorrectiveWave',
      'elliottDoubleComboWave',
    ] as const;

    for (const tool of dragSeedTools) {
      const state: UserDrawingState = {
        version: 1,
        activeTool: tool,
        selection: null,
        drawings: [],
        draft: {
          tool,
          paneId: 'main',
          anchors: [
            { time: 10, price: 90 },
            { time: 40, price: 60 },
          ],
          style,
          startedAt: 2,
        },
        textEdit: null,
      };

      expect(resolveUserDrawingRenderEntries(state), tool).toHaveLength(1);
      expect(resolveUserDrawingRenderEntries(state)[0]?.drawing, tool).toMatchObject({
        id: '__draft__',
        kind: tool,
        points: [
          { time: 10, price: 90 },
          { time: 40, price: 60 },
          { time: 40, price: 60 },
        ],
      });
    }
  });

  it('keeps drag-seeded four-anchor drafts renderable after drag release', () => {
    const dragSeedTools = ['doubleCurve', 'disjointChannel'] as const;

    for (const tool of dragSeedTools) {
      const state: UserDrawingState = {
        version: 1,
        activeTool: tool,
        selection: null,
        drawings: [],
        draft: {
          tool,
          paneId: 'main',
          anchors: [
            { time: 10, price: 90 },
            { time: 40, price: 60 },
          ],
          style,
          startedAt: 2,
        },
        textEdit: null,
      };

      expect(resolveUserDrawingRenderEntries(state), tool).toHaveLength(1);
      expect(resolveUserDrawingRenderEntries(state)[0]?.drawing, tool).toMatchObject({
        id: '__draft__',
        kind: tool,
        points: [
          { time: 10, price: 90 },
          { time: 40, price: 60 },
          { time: 40, price: 60 },
          { time: 40, price: 60 },
        ],
      });
    }
  });

  it('keeps drag-seeded multi-anchor drafts renderable during active drag preview', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'parallelChannel',
      selection: null,
      drawings: [],
      draft: {
        tool: 'parallelChannel',
        paneId: 'main',
        anchors: [{ time: 10, price: 90 }],
        style,
        startedAt: 2,
      },
      textEdit: null,
    };

    expect(
      resolveUserDrawingRenderEntries(state, {
        draftPreviewAnchor: { time: 40, price: 60 },
      })[0]?.drawing,
    ).toMatchObject({
      id: '__draft__',
      kind: 'parallelChannel',
      points: [
        { time: 10, price: 90 },
        { time: 40, price: 60 },
        { time: 40, price: 60 },
      ],
    });
  });

  it('marks every drawing in a grouped selection as selected', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
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
          price: 50,
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
          time: 25,
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveUserDrawingRenderEntries(state).map((entry) => [entry.drawing.id, entry.selected])).toEqual([
      ['a', true],
      ['b', true],
    ]);
  });

  it('resolves selection handles for rectangle corners', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ]);
  });

  it('resolves selection handles for info line endpoints', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'info',
          kind: 'infoLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ]);
  });

  it('resolves selection handles for trend angle endpoints', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'angle',
          kind: 'trendAngle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ]);
  });

  it('resolves selection handles for horizontal ray anchors', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'horizontal-ray',
          kind: 'horizontalRay',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 30, price: 70 },
        },
        space,
      ),
    ).toEqual([{ x: 30, y: 30 }]);
  });

  it('resolves selection handles for cross line anchors', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'cross-line',
          kind: 'crossLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 30, price: 70 },
        },
        space,
      ),
    ).toEqual([{ x: 30, y: 30 }]);
  });

  it('resolves selection handles for price range corners', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ]);
  });

  it('resolves selection handles for regression trend anchors', () => {
    const regressionSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 62, low: 48, close: 60, volume: 1 },
        { time: 50, open: 60, high: 72, low: 58, close: 70, volume: 1 },
        { time: 90, open: 70, high: 82, low: 68, close: 80, volume: 1 },
      ],
    };

    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'regression',
          kind: 'regressionTrend',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 90, price: 50 },
            { time: 10, price: 80 },
          ],
        },
        regressionSpace,
      ),
    ).toEqual([
      { x: 10, y: 40 },
      { x: 90, y: 20 },
      { x: 10, y: 20 },
    ]);
  });

  it('resolves selection handles for date range boundaries', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'date-range',
          kind: 'dateRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 50 },
      { x: 90, y: 50 },
    ]);
  });

  it('resolves selection handles for Fibonacci retracement endpoints', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'fib',
          kind: 'fibRetracement',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ]);
  });

  it('resolves selection handles for Fibonacci extension endpoints', () => {
    expect(
      resolveUserDrawingHandlePoints(
        {
          id: 'fib-ext',
          kind: 'fibExtension',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ]);
  });

  it('resolves selection handles for path points', () => {
    expect(
      resolveUserDrawingHandlePoints(
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
        space,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 90, y: 10 },
    ]);
  });

  it('resolves padded screen bounds for selected rectangle geometry', () => {
    expect(
      resolveUserDrawingScreenBounds(
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
        space,
        { padding: 4, minTargetSize: 16 },
      ),
    ).toEqual({ x: 6, y: 6, width: 88, height: 88 });
  });

  it('keeps single-anchor selection action targets usable', () => {
    expect(
      resolveUserDrawingScreenBounds(
        {
          id: 'label',
          kind: 'priceLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: 'Entry',
          textAlign: 'center',
        },
        space,
        { padding: 4, minTargetSize: 20 },
      ),
    ).toEqual({ x: 40, y: 40, width: 20, height: 20 });
  });

  it('uses rendered geometry bounds for extended line selections', () => {
    expect(
      resolveUserDrawingScreenBounds(
        {
          id: 'extended',
          kind: 'extendedLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 25, price: 75 },
            { time: 75, price: 25 },
          ],
        },
        space,
        { padding: 0, minTargetSize: 0 },
      ),
    ).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('resolves selection action anchor from visible selected drawings', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
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
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 10 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveUserDrawingSelectionActionAnchor(state, { main: space }, { padding: 4, minTargetSize: 16 })).toEqual({
      anchor: { x: 50, y: 6 },
      bounds: { x: 6, y: 6, width: 88, height: 88 },
      drawingIds: ['rect'],
      paneIds: ['main'],
      primaryPaneId: 'main',
    });
  });

  it('resolves grouped selection action bounds across panes', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'line', drawingIds: ['line', 'marker'] },
      drawings: [
        {
          id: 'line',
          kind: 'trendLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 20, price: 80 },
          ],
          extend: 'none',
        },
        {
          id: 'marker',
          kind: 'arrowMarkUp',
          paneId: 'macd',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 90, price: 0 },
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(
      resolveUserDrawingSelectionActionAnchor(
        state,
        new Map([
          ['main', space],
          ['macd', lowerPaneSpace],
        ]),
        { padding: 2, minTargetSize: 12 },
      ),
    ).toEqual({
      anchor: { x: 54.5, y: 8 },
      bounds: { x: 8, y: 8, width: 93, height: 158 },
      drawingIds: ['line', 'marker'],
      paneIds: ['main', 'macd'],
      primaryPaneId: 'main',
    });
  });

  it('preserves grouped selection order for drawing ids and primary pane', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'marker', drawingIds: ['marker', 'line'] },
      drawings: [
        {
          id: 'line',
          kind: 'trendLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 20, price: 80 },
          ],
          extend: 'none',
        },
        {
          id: 'marker',
          kind: 'arrowMarkUp',
          paneId: 'macd',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 90, price: 0 },
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(
      resolveUserDrawingSelectionActionAnchor(
        state,
        new Map([
          ['main', space],
          ['macd', lowerPaneSpace],
        ]),
        { padding: 2, minTargetSize: 12 },
      ),
    ).toMatchObject({
      drawingIds: ['marker', 'line'],
      paneIds: ['macd', 'main'],
      primaryPaneId: 'macd',
    });
  });

  it('resolves a fallback selection action anchor for hidden selected drawings', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'hidden' },
      drawings: [
        {
          id: 'hidden',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: false,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveUserDrawingSelectionActionAnchor(state, { main: space }, { padding: 4, minTargetSize: 16 })).toEqual({
      anchor: { x: 12, y: 4 },
      bounds: { x: 4, y: 4, width: 16, height: 16 },
      drawingIds: ['hidden'],
      paneIds: ['main'],
      primaryPaneId: 'main',
    });
  });
});
