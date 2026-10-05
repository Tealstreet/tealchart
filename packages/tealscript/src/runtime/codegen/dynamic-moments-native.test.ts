import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';
import { StdDev, Variance } from './ta-classes';

const text = readFileSync(new URL('../../../oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv', import.meta.url), 'utf8');
const [header, ...records] = text.trim().split('\n');
const titles = header.split(',');
const rows = records.slice(0, 128).map(record => {
  const cells = record.split(',');
  return (title: string) => cells[titles.indexOf(title)] === '' ? NaN : Number(cells[titles.indexOf(title)]);
});
const bars = rows.map(row => ({ time: row('time') * 1000, open: row('open'), high: row('high'), low: row('low'), close: row('close'), volume: row('input_volume') }));

describe('native dynamic moments biased flag', () => {
  it.each(['variance', 'stdev'])('preserves one %s source history across biased changes', member => {
    const pine = `//@version=6
indicator("native biased moments")
wave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)
biased = bar_index % 2 == 0
f(src, bias) => ta.${member}(src, 3, bias)
plot(ta.${member}(wave, 3, biased), "root")
plot(f(wave, biased), "udf")
plot(f(wave * 2, biased), "udf_scaled")
plot(ta.${member}(wave, 3, true), "population")
plot(ta.${member}(wave, 3, false), "sample")`;
    const compiled = tryCompile(parse(pine));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result).not.toBeNull();
    expect(result!.errors).toEqual([]);
    for (const title of ['root', 'udf', 'udf_scaled']) {
      const values = result!.plots.find(plot => plot.title === title)!.values;
      expect(values).toHaveLength(rows.length);
      for (let bar = 0; bar < rows.length; bar += 1) {
        const native = rows[bar](`${member}_dyn_biased_builtin`);
        const scale = title === 'udf_scaled' ? (member === 'variance' ? 4 : 2) : 1;
        const expected = Number.isNaN(native) ? null : native * scale;
        expect(values[bar], `${title} bar ${bar}`).toBe(expected);
      }
    }
    for (const title of ['population', 'sample']) {
      const values = result!.plots.find(plot => plot.title === title)!.values;
      expect(values).toHaveLength(rows.length);
      expect(values.slice(0, 2)).toEqual([null, null]);
      expect(values.slice(2).every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
    }
  });

  it('replaces and restores one moments history when the divisor changes', () => {
    for (const moments of [new Variance(3), new StdDev(3)]) {
      moments.compute(1, true);
      moments.compute(2, false);
      const beforeCurrent = moments.save();
      const population = 14 / 3 - (6 / 3) ** 2;
      const expectedPopulation = moments instanceof StdDev ? Math.sqrt(population) : population;
      expect(moments.compute(3, true)).toBe(expectedPopulation);
      moments.recompute(1234, false);
      expect(moments.recompute(3, false)).toBe(1);
      expect(moments.recompute(3, true)).toBe(expectedPopulation);
      moments.restore(beforeCurrent);
      expect(moments.compute(3, false)).toBe(1);
    }
  });
});
