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

  it('hits arrow line drawings within tolerance', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'arrow',
      kind: 'arrowLine',
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 52 }, space)?.drawing.id).toBe('arrow');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 60 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits arrow marker bodies and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'marker',
      kind: 'arrowMarker',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 50 }, space)?.drawing.id).toBe('marker');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 50 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 62 }, space, { tolerance: 2 })).toBeNull();
  });

  it('hits arrow mark bodies and center handles', () => {
    const up: UserDrawing = {
      ...base,
      id: 'up',
      kind: 'arrowMarkUp',
      point: { time: 50, price: 50 },
    };
    const down: UserDrawing = {
      ...base,
      id: 'down',
      kind: 'arrowMarkDown',
      point: { time: 50, price: 50 },
    };

    expect(hitTestUserDrawing(up, { x: 50, y: 50 }, space)?.handle).toBe('center');
    expect(hitTestUserDrawing(up, { x: 50, y: 70 }, space)?.drawing.id).toBe('up');
    expect(hitTestUserDrawing(down, { x: 50, y: 30 }, space)?.drawing.id).toBe('down');
    expect(hitTestUserDrawing(up, { x: 80, y: 80 }, space, { tolerance: 2 })).toBeNull();
  });

  it('hits extended line drawings against their extended segment', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 25, price: 50 },
        { time: 75, price: 50 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 5, y: 50 }, space)?.drawing.id).toBe('extended');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 60 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits info line drawings and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'info',
      kind: 'infoLine',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('info');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space)?.handle).toBe('end');
  });

  it('hits Fibonacci retracement levels and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 10, y: 80 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('fib');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 60 }, space, { tolerance: 1 })).toBeNull();
  });

  it('hits Fibonacci extension levels and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 10, y: 80 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 57.08 }, space)?.drawing.id).toBe('fib-ext');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 60 }, space, { tolerance: 1 })).toBeNull();
  });

  it('hits vertical extended line drawings across the pane', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 50, price: 25 },
        { time: 50, price: 75 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 5 }, space)?.drawing.id).toBe('extended');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 95 }, space)?.drawing.id).toBe('extended');
    expect(hitTestUserDrawing(drawing, { x: 60, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('reports endpoint handles before line body hits', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
      extend: 'none',
    };

    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.handle).toBeUndefined();
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

  it('hits trend angle bodies and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'angle',
      kind: 'trendAngle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('angle');
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

  it('hits horizontal ray bodies and start handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'horizontal-ray',
      kind: 'horizontalRay',
      point: { time: 30, price: 70 },
    };

    expect(hitTestUserDrawing(drawing, { x: 30, y: 30 }, space)?.handle).toBe('center');
    expect(hitTestUserDrawing(drawing, { x: 80, y: 30 }, space)?.drawing.id).toBe('horizontal-ray');
    expect(hitTestUserDrawing(drawing, { x: 20, y: 30 }, space, { tolerance: 1 })).toBeNull();
  });

  it('hits cross line bodies and center handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'cross-line',
      kind: 'crossLine',
      point: { time: 30, price: 70 },
    };

    expect(hitTestUserDrawing(drawing, { x: 30, y: 30 }, space)?.handle).toBe('center');
    expect(hitTestUserDrawing(drawing, { x: 80, y: 30 }, space)?.drawing.id).toBe('cross-line');
    expect(hitTestUserDrawing(drawing, { x: 30, y: 80 }, space)?.drawing.id).toBe('cross-line');
    expect(hitTestUserDrawing(drawing, { x: 80, y: 80 }, space, { tolerance: 1 })).toBeNull();
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

  it('hits circle edges and corner handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'circle',
      kind: 'circle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 10 }, space)?.drawing.id).toBe('circle');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('topLeft');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits ellipse edges and corner handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'ellipse',
      kind: 'ellipse',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 30 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 90, y: 40 }, space)?.drawing.id).toBe('ellipse');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('topLeft');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits off-axis edges on elongated ellipses', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'wide-ellipse',
      kind: 'ellipse',
      points: [
        { time: 5, price: 58 },
        { time: 95, price: 42 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 5, y: 45 }, space)?.drawing.id).toBe('wide-ellipse');
  });

  it('reports rectangle corner handles before edge hits', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('topLeft');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 10 }, space)?.handle).toBe('topRight');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space)?.handle).toBe('bottomRight');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 90 }, space)?.handle).toBe('bottomLeft');
  });

  it('hits price range edges and corner handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 10 }, space)?.drawing.id).toBe('range');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('topLeft');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits date and price range edges and corner handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'date-price-range',
      kind: 'datePriceRange',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 10 }, space)?.drawing.id).toBe('date-price-range');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 10 }, space)?.handle).toBe('topLeft');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits date range edges and boundary handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 0 }, space)?.drawing.id).toBe('date-range');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 50 }, space)?.handle).toBe('start');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 50 }, space)?.handle).toBe('end');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits risk reward position boxes and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'long',
      kind: 'longPosition',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 90, price: 40 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 35 }, space)?.drawing.id).toBe('long');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 55 }, space)?.drawing.id).toBe('long');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits placed bars pattern bounds and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'bars',
      kind: 'barsPattern',
      points: [
        { time: 10, price: 50 },
        { time: 20, price: 50 },
        { time: 40, price: 50 },
      ],
      bars: [
        { time: 10, open: 50, high: 60, low: 49, close: 52 },
        { time: 20, open: 52, high: 58, low: 51, close: 53 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 45, y: 50 }, space)?.drawing.id).toBe('bars');
    expect(hitTestUserDrawing(drawing, { x: 40, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 10, y: 50 }, space, { tolerance: 1 })).toBeNull();
    expect(hitTestUserDrawing(drawing, { x: 75, y: 50 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits path segments and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'path',
      kind: 'path',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 30, y: 30 }, space)?.drawing.id).toBe('path');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits polyline segments and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'polyline',
      kind: 'polyline',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 30, y: 30 }, space)?.drawing.id).toBe('polyline');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits triangle fills, edges, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 30 }, space)?.drawing.id).toBe('triangle');
    expect(hitTestUserDrawing(drawing, { x: 30, y: 30 }, space)?.drawing.id).toBe('triangle');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits parallel channel fills, rails, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 35 }, space)?.drawing.id).toBe('channel');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('channel');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits pitchfork tines and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 50 }, space)?.drawing.id).toBe('pitchfork');
    expect(hitTestUserDrawing(drawing, { x: 70, y: 20 }, space)?.drawing.id).toBe('pitchfork');
    expect(hitTestUserDrawing(drawing, { x: 70, y: 80 }, space)?.drawing.id).toBe('pitchfork');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 70, y: 65 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits pitchfork variant tines and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'schiff',
      kind: 'schiffPitchfork',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 90, y: 65 }, space)?.drawing.id).toBe('schiff');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
  });

  it('hits pitchfan rays and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 80 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 50 }, space)?.drawing.id).toBe('pitchfan');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
  });

  it('hits fib fan rays and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-fan',
      kind: 'fibFan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 95 }, space)?.drawing.id).toBe('fib-fan');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits fib speed resistance fan rays and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 70, y: 80 }, space)?.drawing.id).toBe('fib-speed-fan');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits fib speed resistance arc levels and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 42, y: 60 }, space)?.drawing.id).toBe('fib-speed-arcs');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits fib circle rings and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-circles',
      kind: 'fibCircles',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 60, y: 50 }, space)?.drawing.id).toBe('fib-circles');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits gann fan rays and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'gann-fan',
      kind: 'gannFan',
      points: [
        { time: 10, price: 50 },
        { time: 50, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 40, y: 72.5 }, space)?.drawing.id).toBe('gann-fan');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits fib channel fills, levels, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-channel',
      kind: 'fibChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 35 }, space)?.drawing.id).toBe('fib-channel');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
  });

  it('hits fib time zone levels and endpoint handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      points: [
        { time: 10, price: 50 },
        { time: 20, price: 50 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 20, y: 50 }, space)?.drawing.id).toBe('fib-time-zone');
    expect(hitTestUserDrawing(drawing, { x: 20, y: 50 }, space)).toMatchObject({
      handle: 'end',
    });
  });

  it('hits trend-based fib time levels and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      points: [
        { time: 10, price: 50 },
        { time: 20, price: 50 },
        { time: 30, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 40, y: 50 }, space)?.drawing.id).toBe('trend-fib-time');
    expect(hitTestUserDrawing(drawing, { x: 30, y: 80 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
  });

  it('hits rotated rectangle fills, rails, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 35 }, space)?.drawing.id).toBe('rotated');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('rotated');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits regression trend fills, rails, and point-index handles', () => {
    const regressionSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 10, open: 50, high: 62, low: 48, close: 60, volume: 1 },
        { time: 50, open: 60, high: 72, low: 58, close: 70, volume: 1 },
        { time: 90, open: 70, high: 82, low: 68, close: 80, volume: 1 },
      ],
    };
    const drawing: UserDrawing = {
      ...base,
      id: 'regression',
      kind: 'regressionTrend',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 30 }, regressionSpace)?.drawing.id).toBe('regression');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 20 }, regressionSpace)?.drawing.id).toBe('regression');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 40 }, regressionSpace)).toMatchObject({
      handle: 'center',
      pointIndex: 0,
    });
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, regressionSpace)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 10, y: 20 }, regressionSpace)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 10, y: 50 }, regressionSpace, { handleTolerance: 4 })?.handle).toBeUndefined();
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, regressionSpace, { tolerance: 4 })).toBeNull();
  });

  it('hits flat top and bottom fills, rails, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'flat',
      kind: 'flatTopBottom',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, space)?.drawing.id).toBe('flat');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)?.drawing.id).toBe('flat');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 0,
    });
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 10, y: 80 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 95 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits disjoint channel fills, rails, and point-index handles', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 80 },
        { time: 10, price: 20 },
        { time: 90, price: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 45 }, space)?.drawing.id).toBe('disjoint');
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)?.drawing.id).toBe('disjoint');
    expect(hitTestUserDrawing(drawing, { x: 10, y: 50 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 0,
    });
    expect(hitTestUserDrawing(drawing, { x: 90, y: 20 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 1,
    });
    expect(hitTestUserDrawing(drawing, { x: 10, y: 80 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 2,
    });
    expect(hitTestUserDrawing(drawing, { x: 90, y: 90 }, space)).toMatchObject({
      handle: 'center',
      pointIndex: 3,
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 5 }, space, { tolerance: 4 })).toBeNull();
  });

  it('hits anchored VWAP curves and the anchor handle', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'vwap',
      kind: 'anchoredVwap',
      point: { time: 50, price: 50 },
    };
    const vwapSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 50, open: 50, high: 54, low: 48, close: 51, volume: 20 },
        { time: 90, open: 56, high: 60, low: 54, close: 57, volume: 10 },
      ],
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 49 }, vwapSpace)?.drawing.id).toBe('vwap');
    expect(hitTestUserDrawing(drawing, { x: 50, y: 50 }, vwapSpace)).toMatchObject({
      handle: 'center',
    });
    expect(hitTestUserDrawing(drawing, { x: 50, y: 80 }, vwapSpace, { tolerance: 4 })).toBeNull();
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

  it('hits multiline text labels using expanded label height', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'One\nTwo',
      textAlign: 'center',
    };

    expect(hitTestUserDrawing(drawing, { x: 50, y: 67 }, space, { labelWidth: 50, labelHeight: 20 })?.drawing.id).toBe(
      'label',
    );
    expect(hitTestUserDrawing(drawing, { x: 50, y: 70 }, space, { labelWidth: 50, labelHeight: 20 })).toBeNull();
  });

  it('hits text labels using measured multiline label widths', () => {
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'WW\nI',
      textAlign: 'center',
    };
    const measureTextLabelLine = (_drawing: UserDrawing, line: string) => (line === 'WW' ? 80 : 4);

    expect(
      hitTestUserDrawing(drawing, { x: 88, y: 50 }, space, {
        labelWidth: 50,
        labelHeight: 20,
        measureTextLabelLine,
      })?.drawing.id,
    ).toBe('label');
    expect(
      hitTestUserDrawing(drawing, { x: 97, y: 50 }, space, {
        labelWidth: 50,
        labelHeight: 20,
        measureTextLabelLine,
      }),
    ).toBeNull();
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

  it('does not hit clipped drawing geometry outside its pane bounds', () => {
    const mainSpace: DrawingCoordinateSpace = {
      ...space,
      pane: { ...space.pane, id: 'main', top: 0, bottom: 100 },
    };
    const indicatorSpace: DrawingCoordinateSpace = {
      ...space,
      pane: { ...space.pane, id: 'indicator', top: 100, bottom: 200 },
    };
    const clipped: UserDrawing = {
      ...base,
      id: 'clipped',
      kind: 'verticalLine',
      time: 50,
    };
    const visible: UserDrawing = {
      ...base,
      id: 'visible',
      kind: 'verticalLine',
      paneId: 'indicator',
      time: 50,
    };

    const hit = hitTestUserDrawings(
      [clipped, visible],
      { x: 50, y: 150 },
      new Map([
        ['main', mainSpace],
        ['indicator', indicatorSpace],
      ]),
    );

    expect(hit?.drawing.id).toBe('visible');
  });
});
