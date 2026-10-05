// @vitest-environment node
import type { Bar, ComputedPane, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import { executeScript, parse } from '@tealstreet/tealscript';
import {
  resolveBoxDrawingRect,
  resolveLabelDrawingPosition,
  resolveLineDrawingSegment,
} from './TealScriptDrawingCoordinates';

const epoch = Date.UTC(2024, 0, 1);
const bars: Bar[] = [0, 1, 2].map((index) => ({
  time: epoch + index * 60_000,
  open: 10,
  high: 30,
  low: 8,
  close: 19,
  volume: 100,
}));
const viewport: Viewport = { startTime: epoch, endTime: epoch + 120_000, priceMin: 0, priceMax: 30 };
const pane: ComputedPane = {
  id: 'main',
  type: 'main',
  heightRatio: 1,
  yMin: 0,
  yMax: 30,
  fixedRange: false,
  top: 0,
  height: 150,
  bottom: 150,
};
const resolvers = { timeToX: (time: number) => (time - epoch) / 1200, valueToY: (value: number) => (29 - value) * 5 };

describe('from_index points cannot supply bar_time drawing coordinates', () => {
  // Ledger725; https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.from_index
  // A missing time field prevents projection; it does not require a runtime exception.
  it.each(['line', 'label', 'box'] as const)('%s rejects missing time and retains index/time controls', (kind) => {
    for (const mode of ['missing-time', 'index', 'time'] as const) {
      const first = mode === 'time' ? 'chart.point.from_time(time[2], 17)' : 'chart.point.from_index(0, 17)';
      const second = mode === 'time' ? 'chart.point.from_time(time, 29)' : 'chart.point.from_index(2, 29)';
      const xloc = mode === 'index' ? 'xloc.bar_index' : 'xloc.bar_time';
      const call =
        kind === 'label' ? `label.new(first, "Point", xloc=${xloc})` : `${kind}.new(first, second, xloc=${xloc})`;
      const result = executeScript(
        parse(
          `//@version=6\nindicator("Point projection", overlay=true)\nif barstate.islast\n    first = ${first}\n    second = ${second}\n    ${call}\n`,
        ),
        bars,
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      const drawing = result.drawings[0]!;
      let coordinates;
      if (drawing.type === 'line')
        coordinates = resolveLineDrawingSegment(drawing, bars, viewport, pane, 100, 0, 100, resolvers);
      else if (drawing.type === 'box')
        coordinates = resolveBoxDrawingRect(drawing, bars, viewport, pane, 100, 0, 100, resolvers);
      else if (drawing.type === 'label')
        coordinates = resolveLabelDrawingPosition(drawing, bars, viewport, pane, 100, resolvers);
      else throw new Error(`Unexpected drawing ${drawing.type}`);
      if (mode === 'missing-time') expect(coordinates, `${kind} ${mode}`).toBeNull();
      else if (kind === 'line') expect(coordinates).toEqual({ start: { x: 0, y: 60 }, end: { x: 100, y: 0 } });
      else if (kind === 'box') expect(coordinates).toEqual({ x: 0, y: 0, width: 100, height: 60 });
      else expect(coordinates).toEqual({ x: 0, y: 60 });
    }
  });
});
