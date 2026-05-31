import type { BoxDrawingOutput, LabelDrawingOutput, LineDrawingOutput } from '@tealstreet/tealscript';
import type { Bar, ComputedPane, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import {
  barIndexToTime,
  resolveBoxDrawingRect,
  resolveExtendedLineSegment,
  resolveLabelDrawingPosition,
  resolveLineDrawingSegment,
} from './TealScriptDrawingCoordinates';

const bars: Bar[] = [
  { time: 1_000, open: 10, high: 15, low: 8, close: 12, volume: 100 },
  { time: 2_000, open: 12, high: 18, low: 11, close: 17, volume: 110 },
  { time: 3_000, open: 17, high: 20, low: 16, close: 19, volume: 120 },
];

const viewport: Viewport = {
  startTime: 1_000,
  endTime: 3_000,
  priceMin: 0,
  priceMax: 20,
};

const pane: ComputedPane = {
  id: 'main',
  type: 'main',
  heightRatio: 1,
  yMin: 0,
  yMax: 20,
  fixedRange: false,
  top: 10,
  height: 200,
  bottom: 210,
};

const resolvers = {
  timeToX: (time: number, activeViewport: Viewport, chartWidth: number): number =>
    ((time - activeViewport.startTime) / (activeViewport.endTime - activeViewport.startTime)) * chartWidth,
  valueToY: (value: number, activePane: ComputedPane): number =>
    activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
};

function makeLine(overrides: Partial<LineDrawingOutput> = {}): LineDrawingOutput {
  return {
    id: 'line-1',
    type: 'line',
    barIndex: 0,
    x1: 0,
    y1: 10,
    x2: 2,
    y2: 20,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2962FF',
    style: 'solid',
    width: 1,
    ...overrides,
  };
}

function makeBox(overrides: Partial<BoxDrawingOutput> = {}): BoxDrawingOutput {
  return {
    id: 'box-1',
    type: 'box',
    barIndex: 0,
    left: 0,
    top: 18,
    right: 2,
    bottom: 8,
    xloc: 'bar_index',
    extend: 'none',
    borderColor: '#2962FF',
    borderWidth: 1,
    borderStyle: 'solid',
    bgcolor: null,
    text: '',
    textColor: null,
    textSize: 'normal',
    ...overrides,
  };
}

function makeLabel(overrides: Partial<LabelDrawingOutput> = {}): LabelDrawingOutput {
  return {
    id: 'label-1',
    type: 'label',
    barIndex: 1,
    x: 1,
    y: 17,
    text: 'A',
    xloc: 'bar_index',
    yloc: 'price',
    style: 'label_left',
    color: '#1f2937',
    textColor: '#ffffff',
    size: 'normal',
    ...overrides,
  };
}

describe('TealScript drawing coordinates', () => {
  it('maps bar indices to existing and projected bar times', () => {
    expect(barIndexToTime(1, bars)).toBe(2_000);
    expect(barIndexToTime(4, bars)).toBe(5_000);
    expect(barIndexToTime(-1, bars)).toBe(0);
    expect(barIndexToTime(0, [])).toBeNull();
  });

  it('extends line segments to requested horizontal bounds', () => {
    const segment = resolveExtendedLineSegment({ x: 10, y: 100 }, { x: 30, y: 80 }, 'both', 0, 50);

    expect(segment.start).toEqual({ x: 0, y: 110 });
    expect(segment.end).toEqual({ x: 50, y: 60 });
  });

  it('resolves line drawing segments from bar indices', () => {
    const segment = resolveLineDrawingSegment(makeLine(), bars, viewport, pane, 100, 0, 100, resolvers);

    expect(segment).toEqual({
      start: { x: 0, y: 110 },
      end: { x: 100, y: 10 },
    });
  });

  it('resolves box rectangles and honors horizontal extension', () => {
    const rect = resolveBoxDrawingRect(makeBox({ extend: 'right' }), bars, viewport, pane, 100, 0, 120, resolvers);

    expect(rect).toEqual({
      x: 0,
      y: 30,
      width: 120,
      height: 100,
    });
  });

  it('resolves price labels inside the viewport', () => {
    const position = resolveLabelDrawingPosition(makeLabel(), bars, viewport, pane, 100, resolvers);

    expect(position).toEqual({ x: 50, y: 40 });
  });

  it('requires an explicit finite timestamp for bar_time labels', () => {
    const missingTime = resolveLabelDrawingPosition(
      makeLabel({ xloc: 'bar_time', x: null }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );
    const finiteTime = resolveLabelDrawingPosition(
      makeLabel({ xloc: 'bar_time', x: 2_000 }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );

    expect(missingTime).toBeNull();
    expect(finiteTime).toEqual({ x: 50, y: 40 });
  });

  it('uses candle anchors for abovebar and belowbar labels', () => {
    const above = resolveLabelDrawingPosition(makeLabel({ yloc: 'abovebar' }), bars, viewport, pane, 100, resolvers);
    const below = resolveLabelDrawingPosition(makeLabel({ yloc: 'belowbar' }), bars, viewport, pane, 100, resolvers);

    expect(above).toEqual({ x: 50, y: 24 });
    expect(below).toEqual({ x: 50, y: 106 });
  });
});
