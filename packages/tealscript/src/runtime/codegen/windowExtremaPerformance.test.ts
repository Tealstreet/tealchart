import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { tryCompile } from './execute';
import { NumericSeries } from './runtime';
import { Highest, HighestBars, Lowest, LowestBars } from './ta-classes';

function cpuMicros(action: () => void) {
  const started = process.cpuUsage();
  action();
  const used = process.cpuUsage(started);
  return used.user + used.system;
}

describe('incremental dynamic extrema windows', () => {
  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;

  timingIt('retains the physical window without reading every historical slot on each bar', () => {
    const compiled = tryCompile(parse('//@version=5\nindicator("Window probe")\nplot(close)'));
    if (!compiled.success) throw new Error(JSON.stringify(compiled.unsupported));
    type WindowRuntime = { _deps: object; _windowTAStates?: object };
    type WindowMethod = (
      this: WindowRuntime,
      series: NumericSeries,
      name: string,
      args: number[],
      bar: number,
    ) => number;
    const method = (compiled.ScriptClass.prototype as unknown as { _windowTAFromSeries: WindowMethod })
      ._windowTAFromSeries;
    const runtime: WindowRuntime = { _deps: { Highest, HighestBars, Lowest, LowestBars } };
    const series = new NumericSeries(1024);
    let reads = 0;
    const get = series.get.bind(series);
    series.get = (offset) => {
      reads++;
      return get(offset);
    };
    const length = 384;
    const bars = 2_048;
    const actual: number[] = [];
    const windowCpu = cpuMicros(() => {
      for (let bar = 0; bar < bars; bar++) {
        series.push(bar);
        actual.push(method.call(runtime, series, 'Highest', [length], bar));
      }
    });
    const reference = new Highest(length);
    const expected: number[] = [];
    const referenceCpu = cpuMicros(() => {
      for (let bar = 0; bar < bars; bar++) expected.push(reference.compute(bar));
    });
    expect(actual).toEqual(expected);
    console.info(JSON.stringify({ windowCpu, referenceCpu, reads, ratio: windowCpu / referenceCpu }));
    expect(reads).toBeLessThan(bars * 3 + length);
    expect(windowCpu / referenceCpu).toBeLessThan(4);
    for (const name of ['Highest', 'Lowest', 'HighestBars', 'LowestBars']) {
      const controls = new NumericSeries(16);
      const state: WindowRuntime = { _deps: { Highest, HighestBars, Lowest, LowestBars } };
      const values = [3, 3, -0, 0, NaN, 2, 2, -1, 9, 9, NaN, 4];
      for (let bar = 0; bar < values.length; bar++) {
        controls.push(values[bar]);
        const length = bar === 8 ? 4 : 3;
        const expectedValue = () => {
          if (controls.size < length) return NaN;
          let extreme = controls.get(0);
          let offset = 0;
          const highest = name.startsWith('Highest');
          for (let index = 1; index < length; index++) {
            const value = controls.get(index);
            if (Number.isNaN(value) || Number.isNaN(extreme)) break;
            if (name.endsWith('Bars')) {
              if (highest ? value >= extreme : value <= extreme) {
                extreme = value;
                offset = -index;
              }
            } else extreme = highest ? Math.max(extreme, value) : Math.min(extreme, value);
          }
          return name.endsWith('Bars') ? offset : extreme;
        };
        expect(method.call(state, controls, name, [length], bar)).toBe(expectedValue());
        controls.update(values[bar] + 1);
        expect(method.call(state, controls, name, [length], bar)).toBe(expectedValue());
        state._windowTAStates = undefined;
        expect(method.call(state, controls, name, [length], bar)).toBe(expectedValue());
      }
    }
  });
});
