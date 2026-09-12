import { describe, expect, it } from 'vitest';

import {
  parsePineTraceJson,
  replayPineTrace,
  validatePineTrace,
  type PineTrace,
} from '../../src/compat/pineTrace';

const bars = [
  { time: 1_700_000_000_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
  { time: 1_700_000_060_000, open: 11, high: 12, low: 10, close: 11, volume: 110 },
  { time: 1_700_000_120_000, open: 12, high: 13, low: 11, close: 12, volume: 120 },
];

function indicatorTrace(values: Array<number | null>): PineTrace {
  return {
    schemaVersion: 1,
    scriptId: 'synthetic-close-trace',
    declaredVersion: 6,
    kind: 'indicator',
    source: `//@version=6
indicator("synthetic trace")
plot(close, "Close")`,
    context: {
      symbol: 'TEST:TRACE',
      timeframe: '1',
      timezone: 'Etc/UTC',
      inputs: {},
    },
    bars,
    expected: { plots: [{ title: 'Close', values }] },
  };
}

describe('Pine reference trace replay', () => {
  it('replays a synthetic indicator trace and compares every bar', () => {
    const replay = replayPineTrace(indicatorTrace([10, 11, 12]));

    expect(replay.passed).toBe(true);
    expect(replay.stage).toBe('output');
    expect(replay.mismatches).toEqual([]);
  });

  it('accepts float noise within the trace tolerance', () => {
    const trace = indicatorTrace([10, 11, 12.0000000005]);
    trace.tolerance = 1e-9;

    expect(replayPineTrace(trace).passed).toBe(true);
  });

  it('ingests the JSON trace format before replay', () => {
    const trace = parsePineTraceJson(JSON.stringify(indicatorTrace([10, 11, 12])));

    expect(replayPineTrace(trace).passed).toBe(true);
  });

  it('reports a concrete per-bar mismatch', () => {
    const replay = replayPineTrace(indicatorTrace([10, 99, 12]));

    expect(replay.passed).toBe(false);
    expect(replay.mismatches).toEqual([
      { path: 'plots[0].values[1]', expected: 99, actual: 11 },
    ]);
  });

  it('requires and compares order and fill events for strategy traces', () => {
    const trace: PineTrace = {
      ...indicatorTrace([10, 11, 12]),
      scriptId: 'synthetic-strategy-trace',
      kind: 'strategy',
      source: `//@version=6
strategy("synthetic strategy")
plot(close, "Close")`,
      expected: {
        plots: [{ title: 'Close', values: [10, 11, 12] }],
        orders: [],
        fills: [],
      },
    };

    expect(validatePineTrace(trace)).toEqual([]);
    expect(replayPineTrace(trace).passed).toBe(true);
  });

  it('rejects a strategy trace that omits event expectations', () => {
    const trace = indicatorTrace([10, 11, 12]);
    trace.kind = 'strategy';

    expect(validatePineTrace(trace)).toContain('strategy traces must include expected.orders and expected.fills');
  });
});
