import type { DrawingCoordinateSpace, ExtendedLineDrawing, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../../state/chartState';
import {
  resolveMobileUserDrawingBalloonLayout,
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRenderModel,
  resolveMobileUserDrawingRiskRewardLabelPosition,
  resolveMobileUserDrawingTextLabelLayout,
  resolveMobileUserDrawingTrendAngleLabelPosition,
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
  afterEach(() => {
    clearChartStoreCache();
  });

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

  it('returns selected Skia primitives and handles for grouped selections', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'a', drawingIds: ['a', 'b'] },
      drawings: [
        {
          id: 'a',
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
        {
          id: 'b',
          kind: 'trendLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 40 },
            { time: 90, price: 40 },
          ],
          extend: 'none',
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(
      model.filter((primitive) => primitive.kind === 'line').map((primitive) => [primitive.id, primitive.selected]),
    ).toEqual([
      ['a', true],
      ['b', true],
    ]);
    expect(model.filter((primitive) => primitive.kind === 'handle').map((primitive) => primitive.drawingId)).toEqual([
      'a',
      'a',
      'b',
      'b',
    ]);
  });

  it('returns Skia-ready image annotation primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'image',
          kind: 'image',
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
          src: 'https://example.test/chart.png',
          alt: 'Chart snapshot',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'image',
      id: 'image',
      rect: { x: 10, y: 10, width: 80, height: 80 },
      src: 'https://example.test/chart.png',
      alt: 'Chart snapshot',
    });
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

  it('returns Skia-ready line primitives for rays and axis lines', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'ray',
          kind: 'ray',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 30, price: 70 },
          ],
        },
        {
          id: 'horizontal-line',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 70,
        },
        {
          id: 'vertical-line',
          kind: 'verticalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          time: 30,
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))).toMatchObject([
      {
        kind: 'line',
        id: 'ray',
        start: { x: 10, y: 10 },
        end: { x: 100, y: 100 },
        arrowHead: null,
      },
      {
        kind: 'line',
        id: 'horizontal-line',
        start: { x: 0, y: 30 },
        end: { x: 100, y: 30 },
        arrowHead: null,
      },
      {
        kind: 'line',
        id: 'vertical-line',
        start: { x: 30, y: 0 },
        end: { x: 30, y: 100 },
        arrowHead: null,
      },
    ]);
  });

  it('returns Skia-ready trend angle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 0, price: 50 },
            { time: 100, price: 100 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));

    expect(primitive).toMatchObject({
      kind: 'trendAngle',
      id: 'angle',
      start: { x: 0, y: 50 },
      end: { x: 100, y: 0 },
      label: '26.6°',
      labelPoint: { x: 50, y: 21 },
      style,
    });
    if (!primitive || primitive.kind !== 'trendAngle') throw new Error('expected trend angle primitive');
    expect(resolveMobileUserDrawingTrendAngleLabelPosition(primitive, { x: 0, y: -10, width: 42, height: 14 })).toEqual({
      fontSize: 12,
      fontFamily: 'sans-serif',
      x: 29,
      y: 17,
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

  it('returns Skia-ready cross line primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'crossLine',
      id: 'cross-line',
      horizontal: { start: { x: 0, y: 30 }, end: { x: 100, y: 30 } },
      vertical: { start: { x: 30, y: 0 }, end: { x: 30, y: 100 } },
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
          id: 'left',
          kind: 'arrowMarkLeft',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
        },
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

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))).toMatchObject([
      {
        kind: 'arrowMark',
        id: 'left',
        points: [
          { x: 50, y: 50 },
          { x: 60.8, y: 59 },
          { x: 60.8, y: 53.5 },
          { x: 74, y: 53.5 },
          { x: 74, y: 46.5 },
          { x: 60.8, y: 46.5 },
          { x: 60.8, y: 41 },
        ],
      },
      {
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
      },
    ]);
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

  it('returns Skia-ready rotated rectangle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'rotated',
          kind: 'rotatedRectangle',
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
      kind: 'rotatedRectangle',
      id: 'rotated',
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

  it('returns Skia-ready pitchfork primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'pitchfork',
          kind: 'pitchfork',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 80 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'pitchfork',
      id: 'pitchfork',
      median: { start: { x: 10, y: 50 }, end: { x: 100, y: 50 } },
      upper: { start: { x: 50, y: 20 }, end: { x: 100, y: 20 } },
      lower: { start: { x: 50, y: 80 }, end: { x: 100, y: 80 } },
      parallels: [
        { ratio: -0.5, start: { x: 50, y: -10 }, end: { x: 100, y: -10 } },
        { ratio: 0.25, start: { x: 50, y: 35 }, end: { x: 100, y: 35 } },
        { ratio: 0.75, start: { x: 50, y: 65 }, end: { x: 100, y: 65 } },
        { ratio: 1.5, start: { x: 50, y: 110 }, end: { x: 100, y: 110 } },
      ],
      fill: [
        { x: 50, y: 20 },
        { x: 100, y: 20 },
        { x: 100, y: 80 },
        { x: 50, y: 80 },
      ],
    });
  });

  it('returns Skia-ready pitchfork variant primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'inside',
          kind: 'insidePitchfork',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 80 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'pitchfork',
      id: 'inside',
      median: { start: { x: 30, y: 35 }, end: { x: 100, y: expect.closeTo(192.5) } },
      upper: { start: { x: 10, y: 50 }, end: { x: 100, y: expect.closeTo(252.5) } },
      lower: { start: { x: 50, y: 20 }, end: { x: 100, y: expect.closeTo(132.5) } },
    });
  });

  it('returns Skia-ready pitchfan primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'pitchfan',
          kind: 'pitchfan',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 80 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'pitchfan',
      id: 'pitchfan',
      rays: expect.arrayContaining([
        { ratio: 0, start: { x: 10, y: 50 }, end: { x: 100, y: -17.5 } },
        { ratio: 0.5, start: { x: 10, y: 50 }, end: { x: 100, y: 50 } },
        { ratio: 1, start: { x: 10, y: 50 }, end: { x: 100, y: 117.5 } },
      ]),
      bands: expect.arrayContaining([
        {
          fromRatio: 0,
          toRatio: 0.236,
          points: [
            { x: 10, y: 50 },
            { x: 100, y: -17.5 },
            { x: 100, y: expect.closeTo(14.36) },
          ],
        },
        {
          fromRatio: 0.5,
          toRatio: 0.618,
          points: [
            { x: 10, y: 50 },
            { x: 100, y: 50 },
            { x: 100, y: expect.closeTo(65.93) },
          ],
        },
      ]),
    });
  });

  it('returns Skia-ready fib fan primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-fan',
          kind: 'fibFan',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibFan',
      id: 'fib-fan',
      rays: expect.arrayContaining([
        { ratio: 0, label: '0', start: { x: 10, y: 50 }, end: { x: 100, y: 50 }, labelPoint: { x: 96, y: 46 } },
        {
          ratio: 0.5,
          label: '0.5',
          start: { x: 10, y: 50 },
          end: { x: 100, y: 83.75 },
          labelPoint: { x: 96, y: 79.75 },
        },
        { ratio: 1, label: '1', start: { x: 10, y: 50 }, end: { x: 100, y: 117.5 }, labelPoint: { x: 96, y: 113.5 } },
      ]),
    });
  });

  it('returns Skia-ready fib speed resistance fan primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-speed-fan',
          kind: 'fibSpeedResistanceFan',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibSpeedResistanceFan',
      id: 'fib-speed-fan',
      rays: [
        {
          ratio: 1 / 3,
          label: '0.333',
          start: { x: 10, y: 50 },
          end: { x: 100, y: 72.5 },
          labelPoint: { x: 96, y: 68.5 },
        },
        {
          ratio: 2 / 3,
          label: '0.667',
          start: { x: 10, y: 50 },
          end: { x: 100, y: 95 },
          labelPoint: { x: 96, y: 91 },
        },
        { ratio: 1, label: '1', start: { x: 10, y: 50 }, end: { x: 100, y: 117.5 }, labelPoint: { x: 96, y: 113.5 } },
      ],
    });
  });

  it('returns Skia-ready fib speed resistance arc primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-speed-arcs',
          kind: 'fibSpeedResistanceArcs',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibSpeedResistanceArcs',
      id: 'fib-speed-arcs',
      center: { x: 10, y: 50 },
      reference: { x: 50, y: 80 },
      baseRadius: 50,
      arcs: expect.arrayContaining([
        expect.objectContaining({ ratio: 1 / 3, radius: expect.closeTo(50 / 3), startAngle: 0 }),
        expect.objectContaining({ ratio: 2 / 3, radius: expect.closeTo(100 / 3), startAngle: 0 }),
        expect.objectContaining({ ratio: 1, radius: 50, startAngle: 0 }),
      ]),
    });
  });

  it('returns Skia-ready fib arc primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-arcs',
          kind: 'fibArcs',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibArcs',
      id: 'fib-arcs',
      center: { x: 10, y: 50 },
      reference: { x: 50, y: 80 },
      baseRadius: 50,
      arcs: expect.arrayContaining([
        expect.objectContaining({ ratio: 0.236, radius: 11.799999999999999, startAngle: 0, endAngle: Math.PI }),
        expect.objectContaining({ ratio: 1, radius: 50, startAngle: 0, endAngle: Math.PI }),
        expect.objectContaining({ ratio: 2.618, radius: 130.9, startAngle: 0, endAngle: Math.PI }),
      ]),
    });
  });

  it('returns Skia-ready fib circle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-circles',
          kind: 'fibCircles',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibCircles',
      id: 'fib-circles',
      center: { x: 10, y: 50 },
      baseRadius: 50,
      circles: expect.arrayContaining([
        { ratio: 0.236, radius: 11.799999999999999 },
        { ratio: 1, radius: 50 },
        { ratio: 2.618, radius: 130.9 },
      ]),
    });
  });

  it('returns Skia-ready fib wedge primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-wedge',
          kind: 'fibWedge',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibWedge',
      id: 'fib-wedge',
      center: { x: 10, y: 50 },
      lower: { x: 50, y: 50 },
      upper: { x: 50, y: 80 },
      baseRadius: 50,
      boundaries: [
        { start: { x: 10, y: 50 }, end: { x: 50, y: 50 } },
        { start: { x: 10, y: 50 }, end: { x: 50, y: 80 } },
      ],
      arcs: expect.arrayContaining([
        expect.objectContaining({ ratio: 0.236, radius: 11.799999999999999, startAngle: 0 }),
        expect.objectContaining({ ratio: 1, radius: 50, startAngle: 0 }),
        expect.objectContaining({ ratio: 2.618, radius: 130.9, startAngle: 0 }),
      ]),
    });
  });

  it('returns Skia-ready fib spiral primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-spiral',
          kind: 'fibSpiral',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibSpiral',
      id: 'fib-spiral',
      center: { x: 10, y: 50 },
      reference: { x: 50, y: 50 },
      baseRadius: 40,
      startAngle: 0,
      points: expect.arrayContaining([
        { x: 50, y: 50 },
        { x: expect.closeTo(10), y: expect.closeTo(114.72) },
      ]),
    });
  });

  it('returns Skia-ready gann fan primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'gann-fan',
          kind: 'gannFan',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'gannFan',
      id: 'gann-fan',
      rays: expect.arrayContaining([
        {
          ratio: 0.125,
          label: '1/8',
          start: { x: 10, y: 50 },
          end: { x: 100, y: 58.4375 },
          labelPoint: { x: 96, y: 54.4375 },
        },
        { ratio: 1, label: '1/1', start: { x: 10, y: 50 }, end: { x: 100, y: 117.5 }, labelPoint: { x: 96, y: 113.5 } },
      ]),
    });
  });

  it('returns Skia-ready gann box primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'gann-box',
          kind: 'gannBox',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 80 },
            { time: 90, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'gannBox',
      id: 'gann-box',
      rect: { x: 10, y: 20, width: 80, height: 60 },
      levels: expect.arrayContaining([
        expect.objectContaining({
          ratio: 0.5,
          horizontal: { start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
          vertical: { start: { x: 50, y: 20 }, end: { x: 50, y: 80 } },
        }),
      ]),
      angles: expect.arrayContaining([
        { start: { x: 10, y: 20 }, end: { x: 90, y: 80 } },
        { start: { x: 10, y: 80 }, end: { x: 90, y: 20 } },
      ]),
    });
  });

  it('returns Skia-ready gann square primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'gann-square',
          kind: 'gannSquare',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 80 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'gannSquare',
      id: 'gann-square',
      rect: { x: 10, y: 20, width: 60, height: 60 },
      levels: expect.arrayContaining([
        expect.objectContaining({
          ratio: 0.5,
          horizontal: { start: { x: 10, y: 50 }, end: { x: 70, y: 50 } },
          vertical: { start: { x: 40, y: 20 }, end: { x: 40, y: 80 } },
        }),
      ]),
    });
  });

  it('returns Skia-ready fib channel primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-channel',
          kind: 'fibChannel',
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
      kind: 'fibChannel',
      id: 'fib-channel',
      points: [
        { x: 10, y: 50 },
        { x: 90, y: 50 },
        { x: 90, y: 20 },
        { x: 10, y: 20 },
      ],
      levels: expect.arrayContaining([
        { ratio: 0, start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
        { ratio: 0.5, start: { x: 10, y: 35 }, end: { x: 90, y: 35 } },
        { ratio: 1, start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
      ]),
    });
  });

  it('returns Skia-ready fib time zone primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'fib-time-zone',
          kind: 'fibTimeZone',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'fibTimeZone',
      id: 'fib-time-zone',
      levels: expect.arrayContaining([
        { ratio: 0, time: 10, x: 10, start: { x: 10, y: 0 }, end: { x: 10, y: 100 } },
        { ratio: 1, time: 20, x: 20, start: { x: 20, y: 0 }, end: { x: 20, y: 100 } },
      ]),
    });
  });

  it('returns Skia-ready trend-based fib time primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'trend-fib-time',
          kind: 'trendBasedFibTime',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 50 },
            { time: 30, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'trendBasedFibTime',
      id: 'trend-fib-time',
      levels: expect.arrayContaining([
        { ratio: 0, time: 30, x: 30, start: { x: 30, y: 0 }, end: { x: 30, y: 100 } },
        { ratio: 1, time: 40, x: 40, start: { x: 40, y: 0 }, end: { x: 40, y: 100 } },
      ]),
    });
  });

  it('returns Skia-ready cyclic line primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'cyclic-lines',
          kind: 'cyclicLines',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'cyclicLines',
      id: 'cyclic-lines',
      levels: expect.arrayContaining([
        { ratio: 0, time: 10, x: 10, start: { x: 10, y: 0 }, end: { x: 10, y: 100 } },
        { ratio: 1, time: 20, x: 20, start: { x: 20, y: 0 }, end: { x: 20, y: 100 } },
        { ratio: 2, time: 30, x: 30, start: { x: 30, y: 0 }, end: { x: 30, y: 100 } },
      ]),
    });
  });

  it('returns Skia-ready time cycle primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'time-cycles',
          kind: 'timeCycles',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 80 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'timeCycles',
      id: 'time-cycles',
      cycles: expect.arrayContaining([
        expect.objectContaining({
          ratio: 0,
          startTime: 10,
          endTime: 20,
          startBoundary: { start: { x: 10, y: 0 }, end: { x: 10, y: 100 } },
          endBoundary: { start: { x: 20, y: 0 }, end: { x: 20, y: 100 } },
          points: expect.arrayContaining([{ x: 15, y: 20 }]),
        }),
      ]),
    });
  });

  it('returns Skia-ready sine line primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'sine-line',
          kind: 'sineLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 80 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'sineLine',
      id: 'sine-line',
      points: expect.arrayContaining([
        { x: 10, y: 50 },
        { x: 20, y: 20 },
      ]),
    });
  });

  it('returns Skia-ready regression trend primitives', () => {
    const regressionSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 52, low: 48, close: 60, volume: 1 },
        { time: 50, open: 60, high: 72, low: 58, close: 70, volume: 1 },
        { time: 90, open: 70, high: 82, low: 68, close: 80, volume: 1 },
      ],
    };
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[regressionSpace.pane.id, regressionSpace]]))[0]).toMatchObject({
      kind: 'regressionTrend',
      id: 'regression',
      points: [
        { x: 10, y: 40 },
        { x: 90, y: 20 },
        { x: 90, y: 0 },
        { x: 10, y: 20 },
      ],
      base: { start: { x: 10, y: 40 }, end: { x: 90, y: 20 } },
      parallel: { start: { x: 10, y: 20 }, end: { x: 90, y: 0 } },
    });
  });

  it('returns Skia-ready flat top and bottom primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'flat',
          kind: 'flatTopBottom',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 90, price: 80 },
            { time: 50, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'flatTopBottom',
      id: 'flat',
      points: [
        { x: 10, y: 50 },
        { x: 90, y: 20 },
        { x: 90, y: 80 },
        { x: 10, y: 80 },
      ],
      base: { start: { x: 10, y: 50 }, end: { x: 90, y: 20 } },
      parallel: { start: { x: 10, y: 80 }, end: { x: 90, y: 80 } },
    });
  });

  it('returns Skia-ready disjoint channel primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'disjoint',
          kind: 'disjointChannel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 90, price: 80 },
            { time: 10, price: 20 },
            { time: 90, price: 10 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'disjointChannel',
      id: 'disjoint',
      points: [
        { x: 10, y: 50 },
        { x: 90, y: 20 },
        { x: 90, y: 90 },
        { x: 10, y: 80 },
      ],
      base: { start: { x: 10, y: 50 }, end: { x: 90, y: 20 } },
      parallel: { start: { x: 10, y: 80 }, end: { x: 90, y: 90 } },
    });
  });

  it('returns Skia-ready anchored VWAP primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'vwap',
          kind: 'anchoredVwap',
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

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, {
      ...space,
      bars: [
        { time: 50, open: 50, high: 54, low: 48, close: 51, volume: 20 },
        { time: 90, open: 56, high: 60, low: 54, close: 57, volume: 10 },
      ],
    }]]))[0]).toMatchObject({
      kind: 'anchoredVwap',
      id: 'vwap',
      anchor: { x: 50, y: 50 },
      points: [
        { x: 50, y: 49 },
        { x: 90, y: 47 },
      ],
    });
  });

  it('returns Skia-ready fixed range volume profile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'volume-profile',
          kind: 'fixedRangeVolumeProfile',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 80 },
            { time: 90, price: 20 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(
      resolveMobileUserDrawingRenderModel(state, new Map([[
        space.pane.id,
        {
          ...space,
          bars: [
            { time: 10, open: 70, high: 80, low: 70, close: 75, volume: 20 },
            { time: 50, open: 50, high: 60, low: 50, close: 55, volume: 10 },
            { time: 90, open: 20, high: 30, low: 20, close: 25, volume: 5 },
          ],
        },
      ]]))[0],
    ).toMatchObject({
      kind: 'fixedRangeVolumeProfile',
      id: 'volume-profile',
      bounds: { x: 10, y: 20, width: 80, height: 60 },
      maxVolume: 20,
      totalVolume: 35,
      guides: [
        {
          kind: 'pointOfControl',
          price: 77.5,
          volume: 20,
          segment: { start: { x: 10, y: 22.5 }, end: { x: 90, y: 22.5 } },
        },
        {
          kind: 'valueAreaHigh',
          price: 80,
          volume: 30,
          segment: { start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
        },
        {
          kind: 'valueAreaLow',
          price: 55,
          volume: 30,
          segment: { start: { x: 10, y: 45 }, end: { x: 90, y: 45 } },
        },
      ],
      bins: expect.arrayContaining([
        expect.objectContaining({
          priceMin: 75,
          priceMax: 80,
          volume: 20,
          rect: { x: 10, y: 20, width: 80, height: 5 },
        }),
        expect.objectContaining({
          priceMin: 55,
          priceMax: 60,
          volume: 10,
          rect: { x: 10, y: 40, width: 40, height: 5 },
        }),
        expect.objectContaining({
          priceMin: 25,
          priceMax: 30,
          volume: 5,
          rect: { x: 10, y: 70, width: 20, height: 5 },
        }),
      ]),
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

  it('returns Skia-ready trend-based Fibonacci extension primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'trend-fib-ext',
          kind: 'trendBasedFibExtension',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 20 },
            { time: 50, price: 80 },
            { time: 90, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'trendBasedFibExtension',
      id: 'trend-fib-ext',
      levels: expect.arrayContaining([
        { ratio: 0, label: '0 50.00', price: 50, start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
        { ratio: 0.382, label: '0.382 72.92', price: 72.92, start: { x: 10, y: 27.08 }, end: { x: 90, y: 27.08 } },
        {
          ratio: 0.618,
          label: '0.618 87.08',
          price: 87.08,
          start: { x: 10, y: expect.closeTo(12.92) },
          end: { x: 90, y: expect.closeTo(12.92) },
        },
        { ratio: 1, label: '1 110.00', price: 110, start: { x: 10, y: -10 }, end: { x: 90, y: -10 } },
      ]),
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
    const durationSpace: DrawingCoordinateSpace = {
      ...space,
      viewport: { ...space.viewport, startTime: 0, endTime: 100_000 },
      bars: [
        { time: 10_000, open: 50, high: 55, low: 45, close: 52, volume: 100 },
        { time: 40_000, open: 60, high: 65, low: 55, close: 62, volume: 100 },
        { time: 70_000, open: 75, high: 80, low: 70, close: 77, volume: 100 },
        { time: 90_000, open: 80, high: 85, low: 75, close: 82, volume: 100 },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]))[0]).toMatchObject({
      kind: 'infoLine',
      id: 'info',
      clip,
      start: { x: 10, y: 50 },
      end: { x: 70, y: 25 },
      labelPoint: { x: 40, y: 33.5 },
      label: '+25.00 (+50.00%) / 3 bars, 1 minute',
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
    const durationSpace: DrawingCoordinateSpace = {
      ...space,
      viewport: { ...space.viewport, startTime: 0, endTime: 100_000 },
      bars: [
        { time: 10_000, open: 90, high: 95, low: 85, close: 92, volume: 100 },
        { time: 40_000, open: 70, high: 75, low: 65, close: 72, volume: 100 },
        { time: 70_000, open: 10, high: 15, low: 5, close: 12, volume: 100 },
        { time: 90_000, open: 20, high: 25, low: 15, close: 22, volume: 100 },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]))[0]).toMatchObject({
      kind: 'dateRange',
      id: 'date-range',
      clip,
      rect: { x: 10, y: 0, width: 60, height: 100 },
      labelPoint: { x: 40, y: 50 },
      label: '3 bars, 1 minute',
      style,
    });
  });

  it('returns Skia-ready date and price range primitives with shared labels', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'date-price-range',
          kind: 'datePriceRange',
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
    const durationSpace: DrawingCoordinateSpace = {
      ...space,
      viewport: { ...space.viewport, startTime: 0, endTime: 100_000 },
      bars: [
        { time: 10_000, open: 90, high: 95, low: 85, close: 92, volume: 100 },
        { time: 40_000, open: 70, high: 75, low: 65, close: 72, volume: 100 },
        { time: 70_000, open: 10, high: 15, low: 5, close: 12, volume: 100 },
        { time: 90_000, open: 20, high: 25, low: 15, close: 22, volume: 100 },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[durationSpace.pane.id, durationSpace]]))[0]).toMatchObject({
      kind: 'datePriceRange',
      id: 'date-price-range',
      clip,
      rect: { x: 10, y: 10, width: 60, height: 80 },
      priceLabelPoint: { x: 40, y: 50 },
      priceLabel: '+80.00 (+800.00%)',
      dateLabelPoint: { x: 40, y: 78 },
      dateLabel: '3 bars, 1 minute',
      style,
    });
  });

  it('returns Skia-ready risk reward position primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'long',
          kind: 'longPosition',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 90, price: 80 },
            { time: 90, price: 40 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'riskRewardPosition',
      id: 'long',
      tool: 'longPosition',
      clip,
      profitRect: { x: 10, y: 20, width: 80, height: 30 },
      riskRect: { x: 10, y: 50, width: 80, height: 10 },
      rewardLabelPoint: { x: 50, y: 35 },
      riskLabelPoint: { x: 50, y: 55 },
      ratioLabelPoint: { x: 50, y: 38 },
      rewardLabel: 'Reward +30.00 (+60.00%)',
      riskLabel: 'Risk -10.00 (-20.00%)',
      ratioLabel: 'R:R 3.00',
      style,
    });
  });

  it('positions risk reward labels with a Skia baseline offset', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'long',
          kind: 'longPosition',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { ...style, fontSize: 14, fontFamily: 'monospace' },
          points: [
            { time: 10, price: 50 },
            { time: 90, price: 80 },
            { time: 90, price: 40 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };
    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));
    if (!primitive || primitive.kind !== 'riskRewardPosition') throw new Error('expected risk reward primitive');

    expect(
      resolveMobileUserDrawingRiskRewardLabelPosition(
        { labelPoint: primitive.rewardLabelPoint, style: primitive.style },
        { x: 0, y: -10, width: 84, height: 14 },
      ),
    ).toEqual({
      fontSize: 14,
      fontFamily: 'monospace',
      x: 8,
      y: 38,
    });
    expect(
      resolveMobileUserDrawingRiskRewardLabelPosition(
        { labelPoint: primitive.riskLabelPoint, style: primitive.style },
        { x: 0, y: -10, width: 84, height: 14 },
      ),
    ).toEqual({
      fontSize: 14,
      fontFamily: 'monospace',
      x: 8,
      y: 58,
    });
  });

  it('returns Skia-ready forecast primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'forecast',
          kind: 'forecast',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 70, price: 75 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const barSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 55, low: 45, close: 52, volume: 100 },
        { time: 40, open: 60, high: 65, low: 55, close: 62, volume: 100 },
        { time: 70, open: 75, high: 80, low: 70, close: 77, volume: 100 },
        { time: 90, open: 80, high: 85, low: 75, close: 82, volume: 100 },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[barSpace.pane.id, barSpace]]))[0]).toMatchObject({
      kind: 'forecast',
      id: 'forecast',
      clip,
      start: { x: 10, y: 50 },
      end: { x: 70, y: 25 },
      labelPoint: { x: 40, y: 33.5 },
      sourceLabel: 'Source 50.00',
      targetLabel: 'Target 75.00',
      changeLabel: '+25.00 (+50.00%) / 3 bars, 60 ms',
      style,
    });
  });

  it('returns Skia-ready projection primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'projection',
          kind: 'projection',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 40, price: 60 },
            { time: 70, price: 75 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const barSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 55, low: 45, close: 52, volume: 100 },
        { time: 40, open: 60, high: 65, low: 55, close: 62, volume: 100 },
        { time: 70, open: 75, high: 80, low: 70, close: 77, volume: 100 },
        { time: 90, open: 80, high: 85, low: 75, close: 82, volume: 100 },
      ],
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[barSpace.pane.id, barSpace]]))[0]).toMatchObject({
      kind: 'projection',
      id: 'projection',
      clip,
      start: { x: 10, y: 50 },
      pivot: { x: 40, y: 40 },
      target: { x: 70, y: 25 },
      labelPoint: { x: 55, y: 28.5 },
      startLabel: 'Start 50.00',
      pivotLabel: 'Pivot 60.00',
      targetLabel: 'Target 75.00',
      changeLabel: '+15.00 (+25.00%) / 2 bars, 30 ms',
      style,
    });
  });

  it('returns Skia-ready bars pattern primitives from source bars', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'bars' },
      drawings: [
        {
          id: 'bars',
          kind: 'barsPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 20, price: 50 },
            { time: 40, price: 50 },
          ],
          bars: [
            { time: 10, open: 50, high: 60, low: 49, close: 52 },
            { time: 20, open: 52, high: 58, low: 51, close: 53 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'barsPattern',
      id: 'bars',
      selected: true,
      clip,
      bounds: { x: 36.5, y: 42, width: 17, height: 11 },
      bars: [
        { time: 40, x: 40, openY: 52, highY: 42, lowY: 53, closeY: 50, bodyWidth: 7, up: true },
        { time: 50, x: 50, openY: 50, highY: 44, lowY: 51, closeY: 49, bodyWidth: 7, up: true },
      ],
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
            { time: 95, price: 80 },
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
        { x: 95, y: 20 },
      ],
      style,
    });
  });

  it('returns Skia-ready brush primitives with shared polyline points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'brush',
          kind: 'brush',
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
      kind: 'brush',
      id: 'brush',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 90, y: 10 },
      ],
      style,
    });
  });

  it('returns Skia-ready highlighter primitives with shared polyline points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'highlighter',
          kind: 'highlighter',
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
      kind: 'highlighter',
      id: 'highlighter',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 90, y: 10 },
      ],
      style,
    });
  });

  it('returns Skia-ready polyline primitives with shared polyline points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'polyline',
          kind: 'polyline',
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
      id: 'polyline',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 90, y: 10 },
      ],
      style,
    });
  });

  it('returns Skia-ready XABCD pattern primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'xabcd' },
      drawings: [
        {
          id: 'xabcd',
          kind: 'xabcdPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 30, price: 70 },
            { time: 50, price: 90 },
            { time: 70, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'xabcdPattern',
      id: 'xabcd',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        { x: 50, y: 10 },
        { x: 70, y: 30 },
        { x: 90, y: 10 },
      ],
      labels: [
        { text: 'X', point: { x: 10, y: 10 } },
        { text: 'A', point: { x: 30, y: 30 } },
        { text: 'B', point: { x: 50, y: 10 } },
        { text: 'C', point: { x: 70, y: 30 } },
        { text: 'D', point: { x: 90, y: 10 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready cypher pattern primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'cypher' },
      drawings: [
        {
          id: 'cypher',
          kind: 'cypherPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 30, price: 70 },
            { time: 50, price: 90 },
            { time: 70, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'cypherPattern',
      id: 'cypher',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        { x: 50, y: 10 },
        { x: 70, y: 30 },
        { x: 90, y: 10 },
      ],
      labels: [
        { text: 'X', point: { x: 10, y: 10 } },
        { text: 'A', point: { x: 30, y: 30 } },
        { text: 'B', point: { x: 50, y: 10 } },
        { text: 'C', point: { x: 70, y: 30 } },
        { text: 'D', point: { x: 90, y: 10 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready three drives pattern primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'three-drives' },
      drawings: [
        {
          id: 'three-drives',
          kind: 'threeDrivesPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 30, price: 70 },
            { time: 50, price: 90 },
            { time: 70, price: 70 },
            { time: 90, price: 90 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'threeDrivesPattern',
      id: 'three-drives',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        { x: 50, y: 10 },
        { x: 70, y: 30 },
        { x: 90, y: 10 },
      ],
      labels: [
        { text: '1', point: { x: 10, y: 10 } },
        { text: 'A', point: { x: 30, y: 30 } },
        { text: '2', point: { x: 50, y: 10 } },
        { text: 'C', point: { x: 70, y: 30 } },
        { text: '3', point: { x: 90, y: 10 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready head and shoulders pattern primitives with neckline labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'head-shoulders' },
      drawings: [
        {
          id: 'head-shoulders',
          kind: 'headShouldersPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 70 },
            { time: 30, price: 30 },
            { time: 50, price: 90 },
            { time: 70, price: 30 },
            { time: 90, price: 70 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'headShouldersPattern',
      id: 'head-shoulders',
      clip,
      points: [
        { x: 10, y: 30 },
        { x: 30, y: 70 },
        { x: 50, y: 10 },
        { x: 70, y: 70 },
        { x: 90, y: 30 },
      ],
      neckline: { start: { x: 30, y: 70 }, end: { x: 70, y: 70 } },
      labels: [
        { text: 'LS', point: { x: 10, y: 30 } },
        { text: 'N1', point: { x: 30, y: 70 } },
        { text: 'H', point: { x: 50, y: 10 } },
        { text: 'N2', point: { x: 70, y: 70 } },
        { text: 'RS', point: { x: 90, y: 30 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready Elliott impulse wave primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'elliott-impulse' },
      drawings: [
        {
          id: 'elliott-impulse',
          kind: 'elliottImpulseWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 30 },
            { time: 50, price: 70 },
            { time: 70, price: 40 },
            { time: 90, price: 80 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'elliottImpulseWave',
      id: 'elliott-impulse',
      clip,
      points: [
        { x: 10, y: 50 },
        { x: 30, y: 70 },
        { x: 50, y: 30 },
        { x: 70, y: 60 },
        { x: 90, y: 20 },
      ],
      labels: [
        { text: '1', point: { x: 10, y: 50 } },
        { text: '2', point: { x: 30, y: 70 } },
        { text: '3', point: { x: 50, y: 30 } },
        { text: '4', point: { x: 70, y: 60 } },
        { text: '5', point: { x: 90, y: 20 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready Elliott corrective wave primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'elliott-corrective' },
      drawings: [
        {
          id: 'elliott-corrective',
          kind: 'elliottCorrectiveWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 30 },
            { time: 50, price: 70 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'elliottCorrectiveWave',
      id: 'elliott-corrective',
      clip,
      points: [
        { x: 10, y: 50 },
        { x: 30, y: 70 },
        { x: 50, y: 30 },
      ],
      labels: [
        { text: 'A', point: { x: 10, y: 50 } },
        { text: 'B', point: { x: 30, y: 70 } },
        { text: 'C', point: { x: 50, y: 30 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(3);
  });

  it('returns Skia-ready Elliott double combo wave primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'elliott-double-combo' },
      drawings: [
        {
          id: 'elliott-double-combo',
          kind: 'elliottDoubleComboWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 30 },
            { time: 50, price: 70 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'elliottDoubleComboWave',
      id: 'elliott-double-combo',
      clip,
      points: [
        { x: 10, y: 50 },
        { x: 30, y: 70 },
        { x: 50, y: 30 },
      ],
      labels: [
        { text: 'W', point: { x: 10, y: 50 } },
        { text: 'X', point: { x: 30, y: 70 } },
        { text: 'Y', point: { x: 50, y: 30 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(3);
  });

  it('returns Skia-ready Elliott triangle wave primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'elliott-triangle' },
      drawings: [
        {
          id: 'elliott-triangle',
          kind: 'elliottTriangleWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 70 },
            { time: 50, price: 40 },
            { time: 70, price: 60 },
            { time: 90, price: 45 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'elliottTriangleWave',
      id: 'elliott-triangle',
      clip,
      points: [
        { x: 10, y: 50 },
        { x: 30, y: 30 },
        { x: 50, y: 60 },
        { x: 70, y: 40 },
        { x: 90, y: expect.closeTo(55) },
      ],
      labels: [
        { text: 'A', point: { x: 10, y: 50 } },
        { text: 'B', point: { x: 30, y: 30 } },
        { text: 'C', point: { x: 50, y: 60 } },
        { text: 'D', point: { x: 70, y: 40 } },
        { text: 'E', point: { x: 90, y: expect.closeTo(55) } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready Elliott triple combo wave primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'elliott-triple-combo' },
      drawings: [
        {
          id: 'elliott-triple-combo',
          kind: 'elliottTripleComboWave',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 70 },
            { time: 50, price: 40 },
            { time: 70, price: 60 },
            { time: 90, price: 45 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'elliottTripleComboWave',
      id: 'elliott-triple-combo',
      clip,
      points: [
        { x: 10, y: 50 },
        { x: 30, y: 30 },
        { x: 50, y: 60 },
        { x: 70, y: 40 },
        { x: 90, y: expect.closeTo(55) },
      ],
      labels: [
        { text: 'W', point: { x: 10, y: 50 } },
        { text: 'X', point: { x: 30, y: 30 } },
        { text: 'Y', point: { x: 50, y: 60 } },
        { text: 'X', point: { x: 70, y: 40 } },
        { text: 'Z', point: { x: 90, y: expect.closeTo(55) } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(5);
  });

  it('returns Skia-ready ABCD pattern primitives with labels and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'abcd' },
      drawings: [
        {
          id: 'abcd',
          kind: 'abcdPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 30, price: 70 },
            { time: 50, price: 90 },
            { time: 70, price: 70 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'abcdPattern',
      id: 'abcd',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        { x: 50, y: 10 },
        { x: 70, y: 30 },
      ],
      labels: [
        { text: 'A', point: { x: 10, y: 10 } },
        { text: 'B', point: { x: 30, y: 30 } },
        { text: 'C', point: { x: 50, y: 10 } },
        { text: 'D', point: { x: 70, y: 30 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(4);
  });

  it('returns Skia-ready triangle pattern primitives with labels, fill polygon, and handles', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'triangle-pattern' },
      drawings: [
        {
          id: 'triangle-pattern',
          kind: 'trianglePattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 90 },
            { time: 20, price: 20 },
            { time: 50, price: 70 },
            { time: 70, price: 35 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const model = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]), { handleRadius: 6 });

    expect(model[0]).toMatchObject({
      kind: 'trianglePattern',
      id: 'triangle-pattern',
      clip,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 80 },
        { x: 50, y: 30 },
        { x: 70, y: 65 },
      ],
      polygon: [
        { x: 10, y: 10 },
        { x: 50, y: 30 },
        { x: 70, y: 65 },
        { x: 20, y: 80 },
      ],
      boundaries: [
        { start: { x: 10, y: 10 }, end: { x: 50, y: 30 } },
        { start: { x: 20, y: 80 }, end: { x: 70, y: 65 } },
      ],
      labels: [
        { text: 'A', point: { x: 10, y: 10 } },
        { text: 'B', point: { x: 20, y: 80 } },
        { text: 'C', point: { x: 50, y: 30 } },
        { text: 'D', point: { x: 70, y: 65 } },
      ],
      style,
    });
    expect(model.filter((primitive) => primitive.kind === 'handle')).toHaveLength(4);
  });

  it('returns Skia-ready curve primitives with shared sampled points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'curve',
          kind: 'curve',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 80 },
            { time: 90, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const primitive = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0];

    expect(primitive).toMatchObject({
      kind: 'curve',
      id: 'curve',
      clip,
      start: { x: 10, y: 50 },
      control: { x: 50, y: 20 },
      end: { x: 90, y: 50 },
      style,
    });
    expect(primitive?.kind === 'curve' ? primitive.points[24] : null).toEqual({ x: 50, y: 35 });
  });

  it('returns Skia-ready double curve primitives with shared sampled points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'double-curve',
          kind: 'doubleCurve',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 30, price: 80 },
            { time: 70, price: 20 },
            { time: 90, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const primitive = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0];

    expect(primitive).toMatchObject({
      kind: 'doubleCurve',
      id: 'double-curve',
      clip,
      start: { x: 10, y: 50 },
      firstControl: { x: 30, y: 20 },
      secondControl: { x: 70, y: 80 },
      end: { x: 90, y: 50 },
      style,
    });
    expect(primitive?.kind === 'doubleCurve' ? primitive.points : []).toHaveLength(49);
    expect(primitive?.kind === 'doubleCurve' ? primitive.points[24] : null).toEqual({ x: 50, y: 50 });
  });

  it('returns Skia-ready arc primitives with shared sampled points', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'arc',
          kind: 'arc',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 50 },
            { time: 50, price: 80 },
            { time: 90, price: 50 },
          ],
        },
      ],
      draft: null,
      textEdit: null,
    };

    const primitive = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0];

    expect(primitive).toMatchObject({
      kind: 'arc',
      id: 'arc',
      clip,
      start: { x: 10, y: 50 },
      through: { x: 50, y: 20 },
      end: { x: 90, y: 50 },
      style,
    });
    expect(primitive?.kind === 'arc' ? primitive.center.x : null).toBeCloseTo(50);
    expect(primitive?.kind === 'arc' ? primitive.center.y : null).toBeCloseTo(61.6667);
    expect(primitive?.kind === 'arc' ? primitive.radius : null).toBeCloseTo(41.6667);
    expect(primitive?.kind === 'arc' ? primitive.points[48]?.y : null).toBeCloseTo(20);
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

  it('preserves note text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'note',
          kind: 'note',
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
      kind: 'note',
      id: 'note',
      clip,
      point: { x: 50, y: 50 },
      text: 'Left note',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('preserves emoji text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'emoji',
          kind: 'emoji',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: '🔥',
          textAlign: 'center',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'emoji',
      id: 'emoji',
      clip,
      point: { x: 50, y: 50 },
      text: '🔥',
      editing: false,
      editValue: null,
      textAlign: 'center',
    });
  });

  it('preserves sticker text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'sticker',
          kind: 'sticker',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: '★',
          textAlign: 'center',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'sticker',
      id: 'sticker',
      clip,
      point: { x: 50, y: 50 },
      text: '★',
      editing: false,
      editValue: null,
      textAlign: 'center',
    });
  });

  it('preserves comment text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'comment',
          kind: 'comment',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: 'Left comment',
          textAlign: 'left',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'comment',
      id: 'comment',
      clip,
      point: { x: 50, y: 50 },
      text: 'Left comment',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('preserves anchored annotation position, text, and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'anchored-text',
          kind: 'anchoredText',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          position: { x: 0.25, y: 0.75 },
          text: 'Anchored text',
          textAlign: 'right',
        },
        {
          id: 'anchored-note',
          kind: 'anchoredNote',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          position: { x: 0.75, y: 0.25 },
          text: 'Anchored note',
          textAlign: 'left',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))).toMatchObject([
      {
        kind: 'anchoredText',
        id: 'anchored-text',
        clip,
        point: { x: 25, y: 75 },
        text: 'Anchored text',
        editing: false,
        editValue: null,
        textAlign: 'right',
      },
      {
        kind: 'anchoredNote',
        id: 'anchored-note',
        clip,
        point: { x: 75, y: 25 },
        text: 'Anchored note',
        editing: false,
        editValue: null,
        textAlign: 'left',
      },
    ]);
  });

  it('preserves price label text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'price-label',
          kind: 'priceLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: 'Right price',
          textAlign: 'right',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'priceLabel',
      id: 'price-label',
      clip,
      point: { x: 50, y: 50 },
      text: 'Right price',
      editing: false,
      editValue: null,
      textAlign: 'right',
    });
  });

  it('preserves signpost text and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'signpost',
          kind: 'signpost',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: 'Left signpost',
          textAlign: 'left',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'signpost',
      id: 'signpost',
      clip,
      point: { x: 50, y: 50 },
      text: 'Left signpost',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('preserves callout anchors, text, and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'callout',
          kind: 'callout',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 10 },
            { time: 50, price: 50 },
          ],
          text: 'Left callout',
          textAlign: 'left',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'callout',
      id: 'callout',
      clip,
      tip: { x: 10, y: 90 },
      point: { x: 50, y: 50 },
      text: 'Left callout',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('preserves price note anchors, text, and alignment in mobile primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'price-note',
          kind: 'priceNote',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [
            { time: 10, price: 10 },
            { time: 50, price: 50 },
          ],
          text: 'Left price note',
          textAlign: 'left',
        },
      ],
      draft: null,
      textEdit: null,
    };

    expect(resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]))[0]).toMatchObject({
      kind: 'priceNote',
      id: 'price-note',
      clip,
      tip: { x: 10, y: 90 },
      point: { x: 50, y: 50 },
      text: 'Left price note',
      editing: false,
      editValue: null,
      textAlign: 'left',
    });
  });

  it('returns Skia-ready pin primitives', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'pin',
          kind: 'pin',
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
      kind: 'pin',
      id: 'pin',
      clip,
      point: { x: 50, y: 50 },
      radius: 4,
      style,
    });
  });

  it('returns Skia-ready icon primitives with shared polygon geometry', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'icon',
          kind: 'icon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          iconName: 'flag',
        },
      ],
      draft: null,
      textEdit: null,
    };

    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));

    expect(primitive).toMatchObject({
      kind: 'icon',
      id: 'icon',
      clip,
      point: { x: 50, y: 50 },
      iconName: 'flag',
      style,
    });
    if (!primitive || primitive.kind !== 'icon') throw new Error('expected icon primitive');
    expect(primitive.points[0]).toEqual({ x: 41, y: 41 });
    expect(primitive.points[1]).toEqual({ x: 59, y: 41 });
    expect(primitive.points[2]).toEqual({ x: 53.15, y: 50 });
  });

  it('returns Skia-ready flag mark primitives with shared flag geometry', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'flag',
          kind: 'flagMark',
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

    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));

    expect(primitive).toMatchObject({
      kind: 'icon',
      id: 'flag',
      clip,
      point: { x: 50, y: 50 },
      iconName: 'flag',
      style,
    });
    if (!primitive || primitive.kind !== 'icon') throw new Error('expected icon primitive');
    expect(primitive.points[0]).toEqual({ x: 41, y: 41 });
    expect(primitive.points[1]).toEqual({ x: 59, y: 41 });
    expect(primitive.points[2]).toEqual({ x: 53.15, y: 50 });
  });

  it('returns Skia-ready balloon primitives with shared layout', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
        {
          id: 'balloon',
          kind: 'balloon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 50, price: 50 },
          text: 'Hi',
          textAlign: 'center',
        },
      ],
      draft: null,
      textEdit: null,
    };

    const [primitive] = resolveMobileUserDrawingRenderModel(state, new Map([[space.pane.id, space]]));

    expect(primitive).toMatchObject({
      kind: 'balloon',
      id: 'balloon',
      clip,
      point: { x: 50, y: 50 },
      text: 'Hi',
      editing: false,
      editValue: null,
      textAlign: 'center',
      style,
    });
    if (!primitive || primitive.kind !== 'balloon') throw new Error('expected balloon primitive');
    expect(resolveMobileUserDrawingBalloonLayout(primitive, 12)).toMatchObject({
      box: { x: 38, y: expect.closeTo(19.2), width: 24, height: 20 },
      tail: {
        tip: { x: 50, y: 50 },
        left: { x: expect.closeTo(43.7), y: expect.closeTo(39.2) },
        right: { x: expect.closeTo(56.3), y: expect.closeTo(39.2) },
      },
      lines: [{ text: 'Hi', width: 12, x: 44, y: expect.closeTo(29.2) }],
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
