import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { createUserDrawingState } from './input';
import {
  deserializeUserDrawingStateFromLayout,
  isUserDrawingLayoutStateEqual,
  serializeUserDrawingStateForLayout,
} from './serialization';
import type { UserDrawingState } from './types';

function createStateWithTransientFields(): UserDrawingState {
  const drawing = {
    id: 'trend_1',
    kind: 'trendLine' as const,
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 100,
    updatedAt: 200,
    style: {
      lineColor: '#ffcc00',
      lineWidth: 2,
      lineStyle: 'dashed' as const,
      opacity: 0.75,
      lineVisible: false,
      fillVisible: true,
    },
    points: [
      { time: 1000, price: 10 },
      { time: 2000, price: 20 },
    ] as const,
    extend: 'none' as const,
  };

  return createUserDrawingState({
    drawings: [drawing],
    activeTool: 'rectangle',
    selection: { drawingId: drawing.id, handle: 'start' },
    draft: {
      tool: 'rectangle',
      paneId: 'main',
      anchors: [{ time: 3000, price: 30 }],
      style: drawing.style,
      startedAt: 300,
    },
    textEdit: {
      drawingId: drawing.id,
      value: 'draft text',
      originalValue: '',
      startedAt: 400,
    },
  });
}

describe('drawing layout serialization', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('persists committed drawings and clears transient editing state', () => {
    const persisted = serializeUserDrawingStateForLayout(createStateWithTransientFields());

    expect(persisted?.drawings).toHaveLength(1);
    expect(persisted?.drawings[0]?.id).toBe('trend_1');
    expect(persisted?.activeTool).toBe('select');
    expect(persisted?.selection).toBeNull();
    expect(persisted?.draft).toBeNull();
    expect(persisted?.textEdit).toBeNull();
  });

  it('returns undefined when there are no committed drawings', () => {
    expect(serializeUserDrawingStateForLayout(createUserDrawingState())).toBeUndefined();
  });

  it('deserializes through the same idle persisted state contract', () => {
    const restored = deserializeUserDrawingStateFromLayout(createStateWithTransientFields());

    expect(restored?.drawings).toHaveLength(1);
    expect(restored?.activeTool).toBe('select');
    expect(restored?.selection).toBeNull();
  });

  it('ignores malformed layout payloads without throwing', () => {
    expect(deserializeUserDrawingStateFromLayout({ drawings: 'not-an-array' })).toBeUndefined();
    expect(
      deserializeUserDrawingStateFromLayout({
        version: 1,
        drawings: [
          null,
          { kind: 'futureTool', id: 'future' },
          {
            id: 'broken',
            kind: 'trendLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            points: [{ time: 1, price: 10 }],
            extend: 'none',
          },
        ],
      }),
    ).toBeUndefined();
  });

  it('filters invalid drawings while restoring valid layout payloads', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'rectangle',
      selection: { drawingId: 'valid' },
      drawings: [
        {
          id: 'invalid',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'unknown' },
          price: 10,
        },
        {
          id: 'valid',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'unexpected',
        },
      ],
    });

    expect(restored?.drawings).toEqual([
      expect.objectContaining({
        id: 'valid',
        kind: 'textLabel',
        textAlign: 'center',
      }),
    ]);
    expect(restored?.selection).toBeNull();
  });

  it('preserves restored multiline text labels', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored\nSecond line',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      kind: 'textLabel',
      text: 'Restored\nSecond line',
    });
  });

  it('normalizes restored text label font sizes', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fontSize: 15 },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]?.style.fontSize).toBe(14);
  });

  it('normalizes restored text label font families', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fontFamily: 'cursive' },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]?.style.fontFamily).toBe('sans-serif');
  });

  it('normalizes restored drawing opacity', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', opacity: 2 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]?.style.opacity).toBe(1);
  });

  it('restores arrow line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'arrow',
          kind: 'arrowLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'arrow',
      kind: 'arrowLine',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores arrow marker drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'marker',
          kind: 'arrowMarker',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'marker',
      kind: 'arrowMarker',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores arrow mark drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'up',
          kind: 'arrowMarkUp',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
        },
        {
          id: 'down',
          kind: 'arrowMarkDown',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 2, price: 12 },
        },
      ],
    });

    expect(restored?.drawings).toMatchObject([
      { id: 'up', kind: 'arrowMarkUp', point: { time: 1, price: 10 } },
      { id: 'down', kind: 'arrowMarkDown', point: { time: 2, price: 12 } },
    ]);
  });

  it('restores circle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'circle',
          kind: 'circle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'circle',
      kind: 'circle',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores ellipse drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'ellipse',
          kind: 'ellipse',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'ellipse',
      kind: 'ellipse',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores extended line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'extended',
          kind: 'extendedLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores trend angle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'angle',
          kind: 'trendAngle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'angle',
      kind: 'trendAngle',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores horizontal ray drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'horizontal-ray',
          kind: 'horizontalRay',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'horizontal-ray',
      kind: 'horizontalRay',
      point: { time: 1, price: 10 },
    });
  });

  it('restores cross line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'cross-line',
          kind: 'crossLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'cross-line',
      kind: 'crossLine',
      point: { time: 1, price: 10 },
    });
  });

  it('restores info line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'info',
          kind: 'infoLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'info',
      kind: 'infoLine',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores price range drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores date range drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'date-range',
          kind: 'dateRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci retracement drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib',
          kind: 'fibRetracement',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci extension drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-ext',
          kind: 'fibExtension',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores path drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'path',
          kind: 'path',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'path',
      kind: 'path',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores triangle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'triangle',
          kind: 'triangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores parallel channel drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'channel',
          kind: 'parallelChannel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores regression trend drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'regression',
          kind: 'regressionTrend',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'regression',
      kind: 'regressionTrend',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('rejects malformed path point counts', () => {
    const createPayload = (points: unknown[]) => ({
      version: 1,
      drawings: [
        {
          id: 'path',
          kind: 'path',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points,
        },
      ],
    });

    expect(
      deserializeUserDrawingStateFromLayout(
        createPayload([
          { time: 1, price: 10 },
          { time: 2, price: 12 },
        ]),
      ),
    ).toBeUndefined();
    expect(
      deserializeUserDrawingStateFromLayout(
        createPayload([
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 14 },
          { time: 4, price: 16 },
        ]),
      ),
    ).toBeUndefined();
  });

  it('rejects malformed price range point counts', () => {
    const createPayload = (points: unknown[]) => ({
      version: 1,
      drawings: [
        {
          id: 'range',
          kind: 'priceRange',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points,
        },
      ],
    });

    expect(deserializeUserDrawingStateFromLayout(createPayload([{ time: 1, price: 10 }]))).toBeUndefined();
    expect(
      deserializeUserDrawingStateFromLayout(
        createPayload([
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 14 },
        ]),
      ),
    ).toBeUndefined();
  });

  it('restores drawing fill and line visibility flags', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid',
            lineVisible: false,
            fillVisible: false,
            fillColor: '#123456',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]?.style).toMatchObject({
      lineVisible: false,
      fillVisible: false,
    });
  });

  it('compares only committed drawing payloads', () => {
    const previous = createStateWithTransientFields();
    const next = {
      ...previous,
      activeTool: 'select' as const,
      selection: null,
      draft: null,
      textEdit: null,
    };

    expect(isUserDrawingLayoutStateEqual(previous, next)).toBe(true);
    expect(isUserDrawingLayoutStateEqual(previous, { ...next, drawings: [] })).toBe(false);
  });
});
