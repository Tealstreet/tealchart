import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { VWAP } from '../../src/runtime/codegen/ta-classes';

const archive = new URL('../../oracle-probes/v58/captures/v58/', import.meta.url);
const comparison = JSON.parse(readFileSync(new URL('comparisons-v1/vwap-pair-v1.json', archive), 'utf8')) as {
  sharedClosedBarCutoff: string; matchedClosedSamples: number;
  physicalIndexTimeWindowMatches: boolean; closedPhysicalInputsMatch: boolean;
};

function replay(kind: 'omitted' | 'explicit') {
  const directory = new URL(`consumers/vwap-${kind}-anchor-source-hole-v58-v1/default/attempt-v1/`, archive);
  const csv = readFileSync(new URL('native-v1.csv', directory), 'utf8').trim().split(/\r?\n/);
  const headers = csv.shift()!.split(',');
  const rows = csv.map((line) => Object.fromEntries(line.split(',').map((cell, index) => [headers[index], cell])));
  const bars = rows.map((row) => ({
    time: Number(row.time) * 1000, open: Number(row.open), high: Number(row.high),
    low: Number(row.low), close: Number(row.close), volume: Number(row.Volume),
  }));
  const execution = executeCompiledScript(parse(readFileSync(new URL('executed-v1.pine', directory), 'utf8')), bars, new Map(), {
    runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC', session: '24x7' } },
  });
  expect(execution.status, fileURLToPath(directory)).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.profile.compiledBarErrors).toBeUndefined();
  const selected = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    row.SAMPLE_INDEX !== '' && Number(row.time) <= Number(comparison.sharedClosedBarCutoff));
  expect(selected).toHaveLength(31);
  expect(comparison.matchedClosedSamples).toBe(31);
  expect(comparison.physicalIndexTimeWindowMatches).toBe(true);
  expect(comparison.closedPhysicalInputsMatch).toBe(true);
  expect(execution.result.plots).toHaveLength(16);
  for (const plot of execution.result.plots) {
    expect(plot.values).toHaveLength(rows.length);
    expect(headers).toContain(plot.title);
    for (const { row, index } of selected) {
      const expected = row[plot.title];
      const actual = plot.values[index];
      if (expected === '') expect(actual, `${plot.title} sample ${row.SAMPLE_INDEX}`).toBeNull();
      else expect(actual, `${plot.title} sample ${row.SAMPLE_INDEX}`).toBeCloseTo(Number(expected), 7);
    }
  }
  return execution.result.plots.find((plot) => plot.title === 'VWAP_SOURCE_HOLE')!.values.slice(selected[0].index, selected.at(-1)!.index + 1);
}

describe('v58 closed physical-bar VWAP anchor pair', () => {
  it('omitted anchor retains missing state after the source hole', () => {
    const values = replay('omitted');
    expect(values.slice(10)).toEqual(Array<null>(21).fill(null));
  });
  it('explicit anchor resumes at its captured reset', () => {
    const values = replay('explicit');
    expect(values.slice(10, 16)).toEqual(Array<null>(6).fill(null));
    expect(values[16]).toBe(82828.66);
  });
  it('restores poisoned state independently and resets on a later anchor', () => {
    const state = new VWAP(false, NaN);
    expect(state.compute(10, true, 2)).toBe(10);
    state.compute(NaN, false, 1);
    const poisoned = state.save();
    expect(state.compute(30, false, 1)).toBeNaN();
    expect(state.recompute(40, false, 1)).toBeNaN();
    expect(state.compute(50, true, 2)).toBe(50);
    state.restore(poisoned);
    expect(state.compute(60, false, 2)).toBeNaN();
  });
});
