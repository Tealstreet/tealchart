import type { DrawingCoordinateSpace, ExtendedLineDrawing, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { describe, expect, it } from 'vitest';

import {
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRenderModel,
  resolveMobileUserDrawingTextLabelLayout,
} from './drawingRenderModel';

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
    const fadedStyle = { ...style, opacity: 0.5 };
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
          style: fadedStyle,
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
        style: fadedStyle,
        startedAt: 2,
      },
      textEdit: null,
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
        opacity: 0.5,
        clip,
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        arrowHead: null,
        style: fadedStyle,
      },
      {
        kind: 'rectangle',
        id: '__draft__',
        phase: 'draft',
        selected: false,
        opacity: 0.2,
        clip,
        rect: { x: 10, y: 10, width: 80, height: 80 },
        style: fadedStyle,
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
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))).toEqual([]);
  });

  it('returns Skia-ready arrowhead geometry for arrow lines', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'arrow',
          kind: 'arrowLine',
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
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'line',
      id: 'arrow',
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
      arrowHead: {
        left: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        right: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      },
    });
  });

  it('returns Skia-ready horizontal ray line primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'line',
      id: 'horizontal-ray',
      start: { x: 30, y: 30 },
      end: { x: 100, y: 30 },
      arrowHead: null,
      style,
    });
  });

  it('returns Skia-ready arrow marker polygons', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'marker',
          kind: 'arrowMarker',
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
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'arrowMarker',
      id: 'marker',
      points: [
        { x: 100, y: 50 },
        { x: 78, y: 59 },
        { x: 0, y: 53.5 },
        { x: 0, y: 46.5 },
        { x: 78, y: 41 },
      ],
    });
  });

  it('returns Skia-ready arrow mark polygons', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'up',
          kind: 'arrowMarkUp',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'arrowMark',
      id: 'up',
      points: [
        { x: 50, y: 50 },
        { x: 59, y: 60.8 },
        { x: 53.5, y: 60.8 },
        { x: 53.5, y: 74 },
        { x: 46.5, y: 74 },
        { x: 46.5, y: 60.8 },
        { x: 41, y: 60.8 },
      ],
    });
  });

  it('returns Skia-ready circle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'circle',
          kind: 'circle',
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

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'circle',
      id: 'circle',
      center: { x: 50, y: 50 },
      radius: 40,
      rect: { x: 10, y: 10, width: 80, height: 80 },
    });
  });

  it('returns Skia-ready ellipse primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'ellipse',
          kind: 'ellipse',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 90, price: 30 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'ellipse',
      id: 'ellipse',
      center: { x: 50, y: 40 },
      radiusX: 40,
      radiusY: 30,
      rect: { x: 10, y: 10, width: 80, height: 60 },
    });
  });

  it('returns Skia-ready triangle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'triangle',
          kind: 'triangle',
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
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'triangle',
      id: 'triangle',
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 90, y: 10 },
      ],
    });
  });

  it('returns Skia-ready parallel channel primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'channel',
          kind: 'parallelChannel',
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
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'parallelChannel',
      id: 'channel',
      points: [
        { x: 10, y: 50 },
        { x: 90, y: 50 },
        { x: 90, y: 20 },
        { x: 10, y: 20 },
      ],
      base: { start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
      parallel: { start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
    });
  });

  it('returns Skia-ready Fibonacci retracement primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 10, price: 20 },
            { time: 90, price: 80 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibRetracement',
      id: 'fib',
      levels: [
        { ratio: 0, label: '0 20.00', price: 20, start: { x: 10, y: 80 }, end: { x: 90, y: 80 } },
        { ratio: 0.236, label: '0.236 34.16', price: 34.16, start: { x: 10, y: 65.84 }, end: { x: 90, y: 65.84 } },
        { ratio: 0.382, label: '0.382 42.92', price: 42.92, start: { x: 10, y: 57.08 }, end: { x: 90, y: 57.08 } },
        { ratio: 0.5, label: '0.5 50.00', price: 50, start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
        { ratio: 0.618, label: '0.618 57.08', price: 57.08, start: { x: 10, y: 42.92 }, end: { x: 90, y: 42.92 } },
        { ratio: 0.786, label: '0.786 67.16', price: 67.16, start: { x: 10, y: 32.84 }, end: { x: 90, y: 32.84 } },
        { ratio: 1, label: '1 80.00', price: 80, start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
        {
          ratio: 1.618,
          label: '1.618 117.08',
          price: expect.closeTo(117.08),
          start: { x: 10, y: expect.closeTo(-17.08) },
          end: { x: 90, y: expect.closeTo(-17.08) },
        },
        {
          ratio: 2.618,
          label: '2.618 177.08',
          price: expect.closeTo(177.08),
          start: { x: 10, y: expect.closeTo(-77.08) },
          end: { x: 90, y: expect.closeTo(-77.08) },
        },
      ],
      style,
    });
  });

  it('returns Skia-ready Fibonacci extension primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 10, price: 20 },
            { time: 90, price: 80 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibExtension',
      id: 'fib-ext',
      levels: [
        { ratio: 0, label: '0 20.00', price: 20, start: { x: 10, y: 80 }, end: { x: 90, y: 80 } },
        { ratio: 0.382, label: '0.382 42.92', price: 42.92, start: { x: 10, y: 57.08 }, end: { x: 90, y: 57.08 } },
        { ratio: 0.618, label: '0.618 57.08', price: 57.08, start: { x: 10, y: 42.92 }, end: { x: 90, y: 42.92 } },
        { ratio: 1, label: '1 80.00', price: 80, start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
        {
          ratio: 1.272,
          label: '1.272 96.32',
          price: expect.closeTo(96.32),
          start: { x: 10, y: expect.closeTo(3.68) },
          end: { x: 90, y: expect.closeTo(3.68) },
        },
        {
          ratio: 1.414,
          label: '1.414 104.84',
          price: expect.closeTo(104.84),
          start: { x: 10, y: expect.closeTo(-4.84) },
          end: { x: 90, y: expect.closeTo(-4.84) },
        },
        {
          ratio: 1.618,
          label: '1.618 117.08',
          price: expect.closeTo(117.08),
          start: { x: 10, y: expect.closeTo(-17.08) },
          end: { x: 90, y: expect.closeTo(-17.08) },
        },
        {
          ratio: 2,
          label: '2.000 140.00',
          price: 140,
          start: { x: 10, y: -40 },
          end: { x: 90, y: -40 },
        },
        {
          ratio: 2.618,
          label: '2.618 177.08',
          price: expect.closeTo(177.08),
          start: { x: 10, y: expect.closeTo(-77.08) },
          end: { x: 90, y: expect.closeTo(-77.08) },
        },
      ],
      style,
    });
  });

  it('returns Skia-ready extended line segments to chart bounds', () => {
    const extended: ExtendedLineDrawing = {
      id: 'extended',
      kind: 'extendedLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      points: [
        { time: 25, price: 50 },
        { time: 75, price: 25 },
      ],
    };
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [extended],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'line',
      id: 'extended',
      start: { x: 0, y: 37.5 },
      end: { x: 100, y: 87.5 },
      arrowHead: null,
    });

    const verticalState: UserDrawingState = {
      ...state,
      drawings: [
        {
          ...extended,
          points: [
            { time: 50, price: 25 },
            { time: 50, price: 75 },
          ],
        },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(verticalState, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'line',
      id: 'extended',
      start: { x: 50, y: 0 },
      end: { x: 50, y: 100 },
      arrowHead: null,
    });
  });

  it('returns Skia-ready info line primitives with shared labels', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 10_000, price: 50 },
            { time: 70_000, price: 75 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const durationSpace = { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]))[0]).toMatchObject({
      kind: 'infoLine',
      id: 'info',
      clip,
      start: { x: 10, y: 50 },
      end: { x: 70, y: 25 },
      labelPoint: { x: 40, y: 33.5 },
      label: '+25.00 (+50.00%) / 1 minute',
      style,
    });
  });

  it('positions info line labels from the shared bottom-baseline point', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'info',
          kind: 'infoLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { ...style, fontSize: 14, fontFamily: 'monospace' },
          points: [
            { time: 10_000, price: 50 },
            { time: 70_000, price: 75 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const durationSpace = { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } };
    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]));
    if (!primitive || primitive.kind !== 'infoLine') throw new Error('expected info line primitive');

    expect(resolveMobileUserDrawingInfoLineLabelPosition(primitive, { x: 0, y: -10, width: 84, height: 14 })).toEqual({
      fontSize: 14,
      fontFamily: 'monospace',
      x: -2,
      y: 29.5,
    });
  });

  it('returns Skia-ready price range primitives with shared labels', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 10, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'priceRange',
      id: 'range',
      clip,
      rect: { x: 10, y: 10, width: 80, height: 20 },
      labelPoint: { x: 50, y: 20 },
      label: '+20.00 (+28.57%)',
      style,
    });
  });

  it('keeps price range labels stable when anchor order changes', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 90, price: 90 },
            { time: 10, price: 70 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'priceRange',
      label: '+20.00 (+28.57%)',
    });
  });

  it('returns Skia-ready date range primitives with shared duration labels', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 10_000, price: 90 },
            { time: 70_000, price: 10 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const durationSpace = { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]))[0]).toMatchObject({
      kind: 'dateRange',
      id: 'date-range',
      clip,
      rect: { x: 10, y: 0, width: 60, height: 100 },
      labelPoint: { x: 40, y: 50 },
      label: '1 minute',
      style,
    });
  });

  it('returns Skia-ready path primitives with shared polyline points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
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
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'path',
      id: 'path',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 90, y: 10 },
      ],
      style,
    });
  });

  it('positions price range labels with a Skia baseline offset', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { ...style, fontSize: 14, fontFamily: 'monospace' },
          points: [
            { time: 10, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));
    if (!primitive || primitive.kind !== 'priceRange') throw new Error('expected price range primitive');

    expect(resolveMobileUserDrawingPriceRangeLabelPosition(primitive, { x: 0, y: -10, width: 84, height: 14 })).toEqual({
      fontSize: 14,
      fontFamily: 'monospace',
      x: 8,
      y: 23,
    });
  });

  it('falls back to normalized font size when measured price range label height is unavailable', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { ...style, fontSize: 14, fontFamily: 'monospace' },
          points: [
            { time: 10, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));
    if (!primitive || primitive.kind !== 'priceRange') throw new Error('expected price range primitive');

    expect(resolveMobileUserDrawingPriceRangeLabelPosition(primitive, { width: 84 })).toEqual({
      fontSize: 14,
      fontFamily: 'monospace',
      x: 8,
      y: 27,
    });
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
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'textLabel',
      id: 'label',
      clip,
      point: { x: 50, y: 50 },
      text: 'Left note',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('marks active text edits with the draft value for mobile overlays', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
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
          point: { time: 50, price: 50 },
          text: 'Committed',
          textAlign: 'center',
        },
      ],
      draft: null,
      textEdit: {
        drawingId: 'label',
        value: 'Draft value',
        originalValue: 'Committed',
        startedAt: 2,
      },
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'textLabel',
      id: 'label',
      text: 'Committed',
      editing: true,
      editValue: 'Draft value',
    });
  });

  it('resolves text label fill and font layout for Skia rendering', () => {
    const textStyle: UserDrawingStyle = {
      ...style,
      fillColor: 'rgba(56, 189, 248, 0.12)',
      textColor: '#38bdf8',
      fontSize: 16,
      fontFamily: 'monospace',
    };
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
          style: textStyle,
          point: { time: 50, price: 50 },
          text: 'Note',
          textAlign: 'right',
        },
      ],
      draft: null,
      textEdit: null,
    };

    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));
    expect(primitive).toMatchObject({
      kind: 'textLabel',
      style: textStyle,
    });
    if (!primitive || primitive.kind !== 'textLabel') throw new Error('expected text label primitive');

    expect(resolveMobileUserDrawingTextLabelLayout(primitive, 48)).toEqual({
      fontSize: 16,
      fontFamily: 'monospace',
      labelPadding: 6,
      labelHeight: 20,
      box: { x: 20, y: 40, width: 60, height: 20 },
      text: { x: 26, y: 50 },
      lines: [{ text: 'Note', width: 48, x: 26, y: 50 }],
    });

    expect(
      resolveMobileUserDrawingTextLabelLayout(
        { ...primitive, style: { ...primitive.style, fontSize: 15, fontFamily: 'fantasy' } },
        48,
      ),
    ).toMatchObject({
      fontSize: 14,
      fontFamily: 'sans-serif',
    });
  });

  it('resolves multiline text label layout for Skia rendering', () => {
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
          text: 'Longer\nB',
          textAlign: 'right',
        },
      ],
      draft: null,
      textEdit: null,
    };
    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));
    if (!primitive || primitive.kind !== 'textLabel') throw new Error('expected text label primitive');

    expect(resolveMobileUserDrawingTextLabelLayout(primitive, [36, 6])).toMatchObject({
      labelHeight: 38,
      box: { x: 26, y: 31, width: 48, height: 38 },
      lines: [
        { text: 'Longer', width: 36, x: 32, y: 41 },
        { text: 'B', width: 6, x: 62, y: 59 },
      ],
    });
  });
});
