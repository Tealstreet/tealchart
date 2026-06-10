import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawing, UserDrawingStyle } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { distanceToRectEdge, distanceToSegment, hitTestUserDrawing, hitTestUserDrawings } from './hitTesting';

const style: UserDrawingStyle = {
  lineColor: '#fff',
  lineWidth: 1,
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

const base = {
  paneId: 'main',
  visible: true,
  locked: false,
  createdAt: 1,
  updatedAt: 1,
  style,
};

describe('user drawing hit testing', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('measures distance to finite segments', () => {
    expect(distanceToSegment({ x: 50, y: 53 }, { start: { x: 0, y: 50 }, end: { x: 100, y: 50 } })).toBe(3);
    expect(distanceToSegment({ x: 110, y: 50 }, { start: { x: 0, y: 50 }, end: { x: 100, y: 50 } })).toBe(10);
  });

  it('measures distance to rectangle edges from inside and outside', () => {
    expect(distanceToRectEdge({ x: 50, y: 12 }, { x: 10, y: 10, width: 80, height: 40 })).toBe(2);
    expect(distanceToRectEdge({ x: 100, y: 30 }, { x: 10, y: 10, width: 80, height: 40 })).toBe(10);
  });

  it('hits line drawings within tolerance', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
      extend: 'none',
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 52 }, space)?.drawing.id).toBe('line');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 60 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits extended rays beyond their second anchor', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'ray',
      kind: 'ray',
      points: [
        { time: 10, price: 90 },
        { time: 20, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space, { tolerance: 1 })?.drawing.id).toBe('ray');
  });

  it('hits axis-aligned line drawings', () => {
    const horizontal: UserDrawing = {
      ...base,
      id: 'h',
      kind: 'horizontalLine',
      price: 25,
    };
    const vertical: UserDrawing = {
      ...base,
      id: 'v',
      kind: 'verticalLine',
      time: 75,
    };

    expect(hitTestUserDrawing(horizontal, { x: 40, y: 75 }, space)?.drawing.id).toBe('h');
    expect(hitTestUserDrawing(vertical, { x: 75, y: 40 }, space)?.drawing.id).toBe('v');
  });

  it('hits rectangle edges but not the center by default', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 10 }, space)?.drawing.id).toBe('rect');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits text labels using a configurable label box', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 50 }, space, { labelWidth: 50, labelHeight: 20 })?.drawing.id).toBe(
      'label',
    );
    expect(hitTestUserDrawing(drawing, { x: 80, y: 50 }, space, { labelWidth: 50, labelHeight: 20 })).toBeNull();
  });

  it('skips hidden, locked, and pane-mismatched drawings while honoring topmost order', () => {
    const bottom: UserDrawing = {
      ...base,
      id: 'bottom',
      kind: 'horizontalLine',
      price: 50,
    };
    const top: UserDrawing = {
      ...bottom,
      id: 'top',
    };
    const hidden: UserDrawing = {
      ...bottom,
      id: 'hidden',
      visible: false,
    };
    const spaces = new Map([[space.pane.id, space]]);

    expect(hitTestUserDrawings([hidden, bottom, top], { x: 50, y: 50 }, spaces)?.drawing.id).toBe('top');
    expect(hitTestUserDrawings([{ ...top, paneId: 'missing' }], { x: 50, y: 50 }, spaces)).toBeNull();
    expect(hitTestUserDrawings([{ ...top, locked: true }], { x: 50, y: 50 }, spaces)).toBeNull();
  });
});
