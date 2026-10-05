import type { BoxDrawingOutput, LabelDrawingOutput, LineDrawingOutput } from '@tealstreet/tealscript';
import type { Bar, ComputedPane, Viewport } from '../types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  barIndexToTime,
  resolveBoxDrawingRect,
  resolveExtendedLineSegment,
  resolveLabelDrawingPosition,
  resolveLineDrawingSegment,
} from './TealScriptDrawingCoordinates';

afterEach(() => {
  clearChartStoreCache();
});

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

function countedHistory() {
  let reads = 0;
  const history = Array.from({ length: 24000 }, (_, index) => ({
    ...bars[0],
    get time() {
      reads++;
      return (index + 1) * 1000;
    },
  }));
  return { history, reads: () => reads };
}

describe('time-anchored label lookup cost', () => {
  it('culls offscreen labels before reading historical timestamps', () => {
    const counted = countedHistory();
    expect(
      resolveLabelDrawingPosition(
        makeLabel({ xloc: 'bar_time', x: 24000000, yloc: 'abovebar' }),
        counted.history,
        viewport,
        pane,
        100,
        resolvers,
      ),
    ).toBeNull();
    expect(counted.reads()).toBe(0);
  });

  it('does not look up a candle for price-anchored labels', () => {
    const counted = countedHistory();
    expect(
      resolveLabelDrawingPosition(
        makeLabel({ xloc: 'bar_time', x: 24000000, yloc: 'price' }),
        counted.history,
        { ...viewport, endTime: 24000000 },
        pane,
        100,
        resolvers,
      ),
    ).not.toBeNull();
    expect(counted.reads()).toBe(0);
  });

  it('finds candle-relative labels with logarithmic timestamp reads', () => {
    const counted = countedHistory();
    expect(
      resolveLabelDrawingPosition(
        makeLabel({ xloc: 'bar_time', x: 24000000, yloc: 'abovebar' }),
        counted.history,
        { ...viewport, endTime: 24000000 },
        pane,
        100,
        resolvers,
      ),
    ).toEqual({ x: 100, y: 54 });
    expect(counted.reads()).toBeLessThanOrEqual(16);
  });

  it('retains the first candle when timestamps repeat', () => {
    const repeated = [bars[0], bars[1], { ...bars[1], high: 19 }, bars[2]];
    expect(
      resolveLabelDrawingPosition(
        makeLabel({ xloc: 'bar_time', x: 2000, yloc: 'abovebar' }),
        repeated,
        viewport,
        pane,
        100,
        resolvers,
      ),
    ).toEqual({ x: 50, y: 24 });
  });
});

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

  it('projects price labels at future bar_index positions', () => {
    const projected = resolveLabelDrawingPosition(
      makeLabel({ x: 4, y: 12 }),
      bars,
      { ...viewport, endTime: 5_000 },
      pane,
      100,
      resolvers,
    );

    expect(projected).toEqual({ x: 100, y: 90 });
  });

  // Rank327: visual-output-v1#1123; label.new yloc remarks.
  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
  it.each(['abovebar', 'belowbar'] as const)('ignores supplied y for %s in both xloc modes', (yloc) => {
    for (const xloc of ['bar_index', 'bar_time'] as const) {
      const label = makeLabel({ xloc, x: xloc === 'bar_index' ? 1 : 2_000, yloc });
      const expected = resolveLabelDrawingPosition(label, bars, viewport, pane, 100, resolvers);
      expect(expected).not.toBeNull();
      for (const y of [-1_000, 0, 1_000, null]) {
        expect(resolveLabelDrawingPosition({ ...label, y }, bars, viewport, pane, 100, resolvers)).toEqual(expected);
      }
      const priceLow = resolveLabelDrawingPosition(
        { ...label, yloc: 'price', y: 0 },
        bars,
        viewport,
        pane,
        100,
        resolvers,
      );
      const priceHigh = resolveLabelDrawingPosition(
        { ...label, yloc: 'price', y: 20 },
        bars,
        viewport,
        pane,
        100,
        resolvers,
      );
      expect(priceLow).not.toEqual(priceHigh);
    }
  });

  it('requires a real candle for projected abovebar and belowbar labels', () => {
    const above = resolveLabelDrawingPosition(
      makeLabel({ x: 4, yloc: 'abovebar' }),
      bars,
      { ...viewport, endTime: 5_000 },
      pane,
      100,
      resolvers,
    );
    const below = resolveLabelDrawingPosition(
      makeLabel({ x: 4, yloc: 'belowbar' }),
      bars,
      { ...viewport, endTime: 5_000 },
      pane,
      100,
      resolvers,
    );

    expect(above).toBeNull();
    expect(below).toBeNull();
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

  it('uses the timestamp candle for bar_time abovebar and belowbar labels', () => {
    const above = resolveLabelDrawingPosition(
      makeLabel({ barIndex: 2, xloc: 'bar_time', x: 1_000, yloc: 'abovebar' }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );
    const below = resolveLabelDrawingPosition(
      makeLabel({ barIndex: 2, xloc: 'bar_time', x: 1_000, yloc: 'belowbar' }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );

    expect(above).toEqual({ x: 0, y: 54 });
    expect(below).toEqual({ x: 0, y: 136 });
  });

  it('requires a real timestamp candle for bar_time abovebar and belowbar labels', () => {
    const above = resolveLabelDrawingPosition(
      makeLabel({ barIndex: 1, xloc: 'bar_time', x: 1_500, yloc: 'abovebar' }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );
    const below = resolveLabelDrawingPosition(
      makeLabel({ barIndex: 1, xloc: 'bar_time', x: 1_500, yloc: 'belowbar' }),
      bars,
      viewport,
      pane,
      100,
      resolvers,
    );

    expect(above).toBeNull();
    expect(below).toBeNull();
  });

  it('uses candle anchors for abovebar and belowbar labels', () => {
    const above = resolveLabelDrawingPosition(makeLabel({ yloc: 'abovebar' }), bars, viewport, pane, 100, resolvers);
    const below = resolveLabelDrawingPosition(makeLabel({ yloc: 'belowbar' }), bars, viewport, pane, 100, resolvers);

    expect(above).toEqual({ x: 50, y: 24 });
    expect(below).toEqual({ x: 50, y: 106 });
  });
});

describe('external native drawing index projection', () => {
  const native = {
    ...resolvers,
    timeToX: () => {
      throw new Error('bar_index must not interpolate timestamps');
    },
    barIndexToX: (index: number) => 10 + index * 15,
  };

  it('projects future line, box, and label slots directly in native index space', () => {
    const line = resolveLineDrawingSegment(makeLine({ x2: 5 }), bars, viewport, pane, 100, 0, 100, native);
    expect(line).toEqual({ start: { x: 10, y: 110 }, end: { x: 85, y: 10 } });
    const box = resolveBoxDrawingRect(makeBox({ right: 5 }), bars, viewport, pane, 100, 0, 100, native);
    expect(box).toMatchObject({ x: 10, width: 75 });
    const label = resolveLabelDrawingPosition(makeLabel({ x: 5 }), bars, viewport, pane, 100, native);
    expect(label).toEqual({ x: 85, y: 40 });
  });

  it('omits drawing geometry when the native index slot is unavailable', () => {
    const unavailable = { ...native, barIndexToX: () => NaN };
    expect(resolveLineDrawingSegment(makeLine(), bars, viewport, pane, 100, 0, 100, unavailable)).toBeNull();
    expect(resolveBoxDrawingRect(makeBox(), bars, viewport, pane, 100, 0, 100, unavailable)).toBeNull();
    expect(resolveLabelDrawingPosition(makeLabel(), bars, viewport, pane, 100, unavailable)).toBeNull();
  });
});
