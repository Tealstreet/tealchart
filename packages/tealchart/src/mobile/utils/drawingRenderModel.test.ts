import type { DrawingCoordinateSpace, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { describe, expect, it } from 'vitest';

import { resolveMobileUserDrawingRenderModel } from './drawingRenderModel';

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
const clip = { x: 0, y: 0, width: 100, height: 100 };

describe('mobile user drawing render model', () => {
  it('returns Skia-ready primitives for selected drawings and draft previews', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'rectangle',
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
            { time: 100, price: 50 },
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
    };

    expect(
      resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), {
        draftPreviewAnchor: { time: 90, price: 10 },
        draftOpacity: 0.4,
        handleRadius: 6,
      }),
    ).toEqual([
      {
        kind: 'line',
        id: 'line',
        phase: 'committed',
        selected: true,
        opacity: 1,
        clip,
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        style,
      },
      {
        kind: 'rectangle',
        id: '__draft__',
        phase: 'draft',
        selected: false,
        opacity: 0.4,
        clip,
        rect: { x: 10, y: 10, width: 80, height: 80 },
        style,
      },
      {
        kind: 'handle',
        id: 'line:handle:0',
        drawingId: 'line',
        clip,
        point: { x: 0, y: 50 },
        strokeColor: '#f5c542',
        fillColor: '#ffffff',
        radius: 6,
      },
      {
        kind: 'handle',
        id: 'line:handle:1',
        drawingId: 'line',
        clip,
        point: { x: 100, y: 50 },
        strokeColor: '#f5c542',
        fillColor: '#ffffff',
        radius: 6,
      },
    ]);
  });

  it('skips invisible selected drawings and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'hidden' },
      drawings: [
        {
          id: 'hidden',
          kind: 'trendLine',
          paneId: 'main',
          visible: false,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 0, price: 50 },
            { time: 100, price: 50 },
          ],
          extend: 'none',
        },
      ],
      draft: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))).toEqual([]);
  });

  it('preserves text label alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
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
          point: { time: 50, price: 50 },
          text: 'Left note',
          textAlign: 'left',
        },
      ],
      draft: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'textLabel',
      id: 'label',
      clip,
      point: { x: 50, y: 50 },
      text: 'Left note',
      textAlign: 'left',
    });
  });
});
