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

  it('preserves restored note drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'note',
          kind: 'note',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored note',
          textAlign: 'left',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'note',
      kind: 'note',
      text: 'Restored note',
      textAlign: 'left',
    });
  });

  it('preserves restored comment drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'comment',
          kind: 'comment',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored comment',
          textAlign: 'left',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'comment',
      kind: 'comment',
      text: 'Restored comment',
      textAlign: 'left',
    });
  });

  it('preserves restored callout drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'callout',
          kind: 'callout',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 11 },
          ],
          text: 'Restored callout',
          textAlign: 'right',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'callout',
      kind: 'callout',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 11 },
      ],
      text: 'Restored callout',
      textAlign: 'right',
    });
  });

  it('preserves restored price note drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'price-note',
          kind: 'priceNote',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 11 },
          ],
          text: 'Restored price note',
          textAlign: 'right',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'price-note',
      kind: 'priceNote',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 11 },
      ],
      text: 'Restored price note',
      textAlign: 'right',
    });
  });

  it('preserves restored pin drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'pin',
          kind: 'pin',
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
      id: 'pin',
      kind: 'pin',
      point: { time: 1, price: 10 },
    });
  });

  it('preserves restored icon drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'icon',
          kind: 'icon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          iconName: 'flag',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'icon',
      kind: 'icon',
      point: { time: 1, price: 10 },
      iconName: 'flag',
    });

    const restoredFallback = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'icon',
          kind: 'icon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          iconName: 'unknown',
        },
      ],
    });

    expect(restoredFallback?.drawings[0]).toMatchObject({
      kind: 'icon',
      iconName: 'star',
    });
  });

  it('preserves restored balloon drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'balloon',
          kind: 'balloon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored balloon',
          textAlign: 'left',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'balloon',
      kind: 'balloon',
      point: { time: 1, price: 10 },
      text: 'Restored balloon',
      textAlign: 'left',
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

  it('restores date and price range drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'date-price-range',
          kind: 'datePriceRange',
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
      id: 'date-price-range',
      kind: 'datePriceRange',
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

  it('restores Fibonacci fan drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-fan',
          kind: 'fibFan',
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
      id: 'fib-fan',
      kind: 'fibFan',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci speed resistance fan drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-speed-fan',
          kind: 'fibSpeedResistanceFan',
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
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci speed resistance arc drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-speed-arcs',
          kind: 'fibSpeedResistanceArcs',
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
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci circle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-circles',
          kind: 'fibCircles',
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
      id: 'fib-circles',
      kind: 'fibCircles',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci wedge drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-wedge',
          kind: 'fibWedge',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'fib-wedge',
      kind: 'fibWedge',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci spiral drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-spiral',
          kind: 'fibSpiral',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 10 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'fib-spiral',
      kind: 'fibSpiral',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    });
  });

  it('restores Gann fan drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'gann-fan',
          kind: 'gannFan',
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
      id: 'gann-fan',
      kind: 'gannFan',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci channel drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-channel',
          kind: 'fibChannel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 1, price: 13 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'fib-channel',
      kind: 'fibChannel',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 1, price: 13 },
      ],
    });
  });

  it('restores Gann box drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'gann-box',
          kind: 'gannBox',
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
      id: 'gann-box',
      kind: 'gannBox',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Gann square drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'gann-square',
          kind: 'gannSquare',
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
      id: 'gann-square',
      kind: 'gannSquare',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores Fibonacci time zone drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'fib-time-zone',
          kind: 'fibTimeZone',
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
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores trend-based Fibonacci time drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'trend-fib-time',
          kind: 'trendBasedFibTime',
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
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores cyclic line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'cyclic-lines',
          kind: 'cyclicLines',
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
      id: 'cyclic-lines',
      kind: 'cyclicLines',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores time cycle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'time-cycles',
          kind: 'timeCycles',
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
      id: 'time-cycles',
      kind: 'timeCycles',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    });
  });

  it('restores sine line drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'sine-line',
          kind: 'sineLine',
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
      id: 'sine-line',
      kind: 'sineLine',
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
            { time: 4, price: 13 },
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
        { time: 4, price: 13 },
      ],
    });
  });

  it('restores brush drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'brush',
          kind: 'brush',
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
      id: 'brush',
      kind: 'brush',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores highlighter drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'highlighter',
          kind: 'highlighter',
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
      id: 'highlighter',
      kind: 'highlighter',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores polyline drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'polyline',
          kind: 'polyline',
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
      id: 'polyline',
      kind: 'polyline',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores XABCD pattern drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'xabcd',
          kind: 'xabcdPattern',
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
            { time: 4, price: 13 },
            { time: 5, price: 9 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'xabcd',
      kind: 'xabcdPattern',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
        { time: 4, price: 13 },
        { time: 5, price: 9 },
      ],
    });
  });

  it('restores curve drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'curve',
          kind: 'curve',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 10 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'curve',
      kind: 'curve',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
      ],
    });
  });

  it('restores arc drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'arc',
          kind: 'arc',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 10 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'arc',
      kind: 'arc',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
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

  it('restores rotated rectangle drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'rotated',
          kind: 'rotatedRectangle',
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
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores pitchfork drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'pitchfork',
          kind: 'pitchfork',
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
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores pitchfork variant drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: ['schiffPitchfork', 'modifiedSchiffPitchfork', 'insidePitchfork'].map((kind, index) => ({
        id: kind,
        kind,
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 + index },
          { time: 3, price: 11 },
        ],
      })),
    });

    expect(restored?.drawings.map((drawing) => drawing.kind)).toEqual([
      'schiffPitchfork',
      'modifiedSchiffPitchfork',
      'insidePitchfork',
    ]);
    expect(restored?.drawings[1]).toMatchObject({
      id: 'modifiedSchiffPitchfork',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 13 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores pitchfan drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'pitchfan',
          kind: 'pitchfan',
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
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores long and short position drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'long',
          kind: 'longPosition',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
            { time: 2, price: 95 },
          ],
        },
        {
          id: 'short',
          kind: 'shortPosition',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 90 },
            { time: 2, price: 105 },
          ],
        },
      ],
    });

    expect(restored?.drawings).toMatchObject([
      { id: 'long', kind: 'longPosition' },
      { id: 'short', kind: 'shortPosition' },
    ]);
    expect(serializeUserDrawingStateForLayout(restored!)?.drawings).toHaveLength(2);
  });

  it('restores forecast drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'forecast',
          kind: 'forecast',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'forecast',
      kind: 'forecast',
      points: [
        { time: 1, price: 100 },
        { time: 2, price: 110 },
      ],
    });
  });

  it('rejects forecast drawings with invalid point counts', () => {
    const baseForecastPayload = {
      id: 'forecast',
      kind: 'forecast',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };

    expect(
      deserializeUserDrawingStateFromLayout({
        version: 1,
        drawings: [
          {
            ...baseForecastPayload,
            points: [{ time: 1, price: 100 }],
          },
        ],
      })?.drawings ?? [],
    ).toEqual([]);

    expect(
      deserializeUserDrawingStateFromLayout({
        version: 1,
        drawings: [
          {
            ...baseForecastPayload,
            points: [
              { time: 1, price: 100 },
              { time: 2, price: 110 },
              { time: 3, price: 120 },
            ],
          },
        ],
      })?.drawings ?? [],
    ).toEqual([]);
  });

  it('restores projection drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'projection',
          kind: 'projection',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 105 },
            { time: 3, price: 110 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'projection',
      kind: 'projection',
      points: [
        { time: 1, price: 100 },
        { time: 2, price: 105 },
        { time: 3, price: 110 },
      ],
    });
  });

  it('restores bars pattern drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'bars',
          kind: 'barsPattern',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
            { time: 3, price: 105 },
          ],
          bars: [
            { time: 1, open: 100, high: 104, low: 99, close: 102 },
            { time: 2, open: 102, high: 105, low: 101, close: 101 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'bars',
      kind: 'barsPattern',
      points: [
        { time: 1, price: 100 },
        { time: 2, price: 110 },
        { time: 3, price: 105 },
      ],
      bars: [
        { time: 1, open: 100, high: 104, low: 99, close: 102 },
        { time: 2, open: 102, high: 105, low: 101, close: 101 },
      ],
    });
    expect(serializeUserDrawingStateForLayout(restored!)?.drawings).toHaveLength(1);
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

  it('restores flat top and bottom drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'flat',
          kind: 'flatTopBottom',
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
      id: 'flat',
      kind: 'flatTopBottom',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    });
  });

  it('restores disjoint channel drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'disjoint',
          kind: 'disjointChannel',
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
            { time: 4, price: 9 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
        { time: 4, price: 9 },
      ],
    });
  });

  it('restores anchored VWAP drawings', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'vwap',
          kind: 'anchoredVwap',
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
      id: 'vwap',
      kind: 'anchoredVwap',
      point: { time: 1, price: 10 },
    });
  });

  it.each(['path', 'highlighter'] as const)('rejects malformed %s points', (kind) => {
    const createPayload = (points: unknown[]) => ({
      version: 1,
      drawings: [
        {
          id: kind,
          kind,
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
        ]),
      ),
    ).toBeUndefined();
    expect(
      deserializeUserDrawingStateFromLayout(
        createPayload([
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 'bad', price: 14 },
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
