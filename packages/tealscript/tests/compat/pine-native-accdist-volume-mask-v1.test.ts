import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { AccumulationDistribution } from '../../src/runtime/codegen/ta-classes';
import { executeScript } from '../../src/runtime/compiledOnly';

// Native v5 trace-accdist-host-missing-v1 attempt3 (TVC:DXY), source is Pine v6.
// SHA79a500069d2befbaa9f956182e982cd318bb63a8e8d9d2b8f659d05864bf5a23.
const capturedBars = [
  { time: 1790650800000, open: 101.211, high: 101.214, low: 101.207, close: 101.209, volume: NaN },
  { time: 1790650920000, open: 101.209, high: 101.212, low: 101.201, close: 101.212, volume: NaN },
  { time: 1790651040000, open: 101.213, high: 101.227, low: 101.213, close: 101.225, volume: NaN },
];

describe('native ACCDIST current volume publication', () => {
  it('publishes missing for sustained unavailable volume from startup', () => {
    const result = executeScript(
      parse('//@version=6\nindicator("Native ACCDIST missing volume")\nplot(ta.accdist, "ACCDIST")'),
      capturedBars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, null]);
  });

  it('keeps legacy bare ACCDIST missing for the same native chart inputs', () => {
    const result = executeScript(
      parse('//@version=4\nstudy("Legacy ACCDIST missing volume")\nplot(accdist, "ACCDIST")'),
      capturedBars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, null]);
  });

  it('retains finite-volume accumulation and flat-range holding', () => {
    const accdist = new AccumulationDistribution();
    expect(accdist.compute(10, 12, 8, 11, 100)).toBe(50);
    expect(accdist.compute(10, 12, 8, 9, 100)).toBe(0);
    expect(accdist.compute(10, 10, 10, 10, 100)).toBe(0);
  });

  it('restores the existing finite-volume accumulator', () => {
    const accdist = new AccumulationDistribution();
    expect(accdist.compute(10, 12, 8, 11, 100)).toBe(50);
    const snapshot = accdist.save();
    expect(accdist.compute(10, 12, 8, 9, 100)).toBe(0);
    accdist.restore(snapshot);
    expect(accdist.compute(10, 12, 8, 12, 100)).toBe(150);
  });
});
