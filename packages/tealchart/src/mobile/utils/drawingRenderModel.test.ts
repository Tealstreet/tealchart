import type { DrawingCoordinateSpace, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { describe, expect, it } from 'vitest';

import {
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

  it('returns Skia-ready extended line segments to chart bounds', () => {
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: null,
      drawings: [
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
            { time: 25, price: 50 },
            { time: 75, price: 25 },
          ],
        },
      ],
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
          ...state.drawings[0]!,
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
