import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { Highest, Lowest } from './ta-classes';

// Pine authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json functions[181]/[182].
// Timing compares CPU work for literal windows1/5000; it is an engine gate.
// Missing-bar authority: oracle-probes/captures/v1/extrema-barsago-v1.csv rows40/41; source holes at40/41.
describe('extrema window checkpoints', () => {
  it('keeps large-window CPU work comparable to a length-one control', () => {
    const bars = Array.from({ length: 12000 }, (_, index) => {
      const value = index % 97;
      return { time: index * 60000, open: value, high: value, low: value, close: value, volume: 1 };
    });
    const measure = (length: number) => {
      const program = parse(
        `//@version=6\nindicator("window budget")\nplot(ta.highest(high, ${length}), "HIGH")\nplot(ta.lowest(low, ${length}), "LOW")`,
      );
      const started = process.cpuUsage();
      const result = executeScript(program, bars);
      const cpu = process.cpuUsage(started);
      return { result, cpuMillis: (cpu.user + cpu.system) / 1000 };
    };
    const narrow = measure(1);
    const wide = measure(5000);
    expect(narrow.result.errors).toEqual([]);
    expect(narrow.result.plots.map((plot) => plot.values)).toEqual([
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
    ]);
    expect(wide.result.errors).toEqual([]);
    expect(wide.result.plots[0]!.values).toEqual([...Array(4999).fill(null), ...Array(7001).fill(96)]);
    expect(wide.result.plots[1]!.values).toEqual([...Array(4999).fill(null), ...Array(7001).fill(0)]);
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(wide.cpuMillis, `wide=${wide.cpuMillis}ms, length-one=${narrow.cpuMillis}ms`).toBeLessThan(
        Math.max(100, narrow.cpuMillis) * 3 + 500,
      );
    }
  });

  it.each([
    { name: 'highest', make: () => new Highest(3), initial: 5, afterTwo: 4, afterZero: 4, revised: 10 },
    { name: 'lowest', make: () => new Lowest(3), initial: 1, afterTwo: 1, afterZero: 0, revised: 0 },
  ])(
    'keeps $name snapshots independent across eviction and same-bar replacement',
    ({ make, initial, afterTwo, afterZero, revised }) => {
      const indicator = make();
      indicator.compute(5);
      indicator.compute(1);
      expect(indicator.compute(4)).toBe(initial);
      const older = indicator.save();
      indicator.compute(3);
      const newer = indicator.save();
      indicator.restore(older);
      expect(indicator.compute(2)).toBe(afterTwo);
      indicator.restore(newer);
      expect(indicator.compute(0)).toBe(afterZero);
      expect(indicator.compute(NaN)).toBeNaN();
      expect(indicator.recompute(10)).toBe(revised);
      indicator.restore(older);
      expect(indicator.compute(NaN)).toBeNaN();
    },
  );
});
