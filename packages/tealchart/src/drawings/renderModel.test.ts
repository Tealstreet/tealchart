import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingState, UserDrawingStyle } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { resolveUserDrawingHandlePoints, resolveUserDrawingRenderEntries } from './renderModel';

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
});
