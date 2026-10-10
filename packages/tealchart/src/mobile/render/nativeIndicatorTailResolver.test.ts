import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { getNativeIndicatorPlotKey } from './nativeIndicatorTail';
import { resolveNativeIndicatorPlotsTailUpdate, resolveNativeIndicatorTail } from './nativeIndicatorTailResolver';

const bars = [
  { time: 60_000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
  { time: 120_000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
];
const committed: PlotOutput = {
  id: 'ma',
  scriptId: 's',
  type: 'plot',
  title: 'MA',
  values: [1, 2],
  color: ['#0f0', '#f00'],
};
const key = getNativeIndicatorPlotKey(committed);
const commit = {
  bars,
  drawingLive: true,
  market: 'BTC\n1',
  indicatorPaneInfo: {},
  panes: [],
  plotsByKey: new Map([[key, committed]]),
  priceAxisTagSources: [],
};

describe('resolveNativeIndicatorTail', () => {
  it('paints a moved last point the committed paths can draw', () => {
    const next = { ...committed, values: [1, 5], color: ['#0f0', '#0f0'] };
    const result = resolveNativeIndicatorTail({ commit, diff: { index: 1, keys: [key] }, styledPlots: [next] });

    expect(result).toEqual({
      painted: true,
      tail: { market: 'BTC\n1', time: 120_000, points: { [key]: { value: 5, color: '#0f0' } } },
    });
  });

  it('hands to React a colour no committed path draws, a stale bar, or a held chart', () => {
    const next = { ...committed, values: [1, 5] };
    const painted = (overrides: object, plot: PlotOutput = next, index = 1) =>
      resolveNativeIndicatorTail({
        commit: { ...commit, ...overrides },
        diff: { index, keys: [key] },
        styledPlots: [plot],
      }).painted;

    expect(painted({})).toBe(true);
    expect(painted({}, { ...next, color: ['#0f0', '#00f'] })).toBe(false);
    expect(painted({}, next, 0)).toBe(false);
    expect(painted({ drawingLive: false })).toBe(false);
  });

  it('publishes the newest last points of a result that renders anyway', () => {
    const next = { ...committed, values: [1, 7] };
    const result = resolveNativeIndicatorTail({ commit, diff: null, styledPlots: [next] });

    expect(result.painted).toBe(false);
    expect(result.tail?.points[key]).toEqual({ value: 7, color: '#f00' });
  });
});

it('publishes a full update even in a colour the outgoing paths cannot draw', () => {
  const next = { ...committed, values: [1, 7], color: ['#0f0', '#00f'] };
  expect(resolveNativeIndicatorTail({ commit, diff: null, styledPlots: [next] }).tail?.points[key]).toEqual({
    value: 7,
    color: '#00f',
  });
});

describe('resolveNativeIndicatorPlotsTailUpdate', () => {
  const next = { ...committed, values: [1, 5], color: ['#0f0', '#0f0'] };
  const diff = { index: 1, keys: [key] };
  const liveLabel = { labelOffsetFromValueY: 0, text: '5', textX: 10, value: 5 };
  const registration = (resolved: Record<string, typeof liveLabel> | null) => ({
    generation: 7,
    resolve: () => resolved,
  });
  const update = (overrides: Partial<Parameters<typeof resolveNativeIndicatorPlotsTailUpdate>[0]>) =>
    resolveNativeIndicatorPlotsTailUpdate({ commit, diff, registration: null, styledPlots: [next], ...overrides });

  it('paints plots and readouts that can all move without a layout', () => {
    const result = update({ registration: registration({ a: liveLabel }) });

    expect(result.painted).toBe(true);
    expect(result.labels).toEqual({ generation: 7, labels: { a: liveLabel }, market: 'BTC\n1', time: 120_000 });
    expect(result.tagSources).toBeNull();
  });

  it('renders when a readout needs a layout or its tag cannot move', () => {
    expect(update({ registration: registration(null) }).painted).toBe(false);
    const readoutSource = {
      sourceType: 'indicatorOutput' as const,
      tagId: 'gone',
      objectId: 'gone',
      price: 1,
      height: 11,
    };
    expect(update({ commit: { ...commit, priceAxisTagSources: [readoutSource] } }).painted).toBe(false);
  });

  it('publishes but never paints a result that renders anyway', () => {
    const result = update({ diff: null, registration: registration({ a: liveLabel }) });

    expect(result.painted).toBe(false);
    expect(result.tail?.points[key]?.value).toBe(5);
    expect(result.labels?.labels).toEqual({ a: liveLabel });
    expect(result.tagSources).toBeNull();
  });
});
