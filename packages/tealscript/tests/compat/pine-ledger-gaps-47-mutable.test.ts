import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Mutable-EMA migration admission: v5 permits the length, v6 infers series.
// Runtime first-length behavior is HOLD pending native v5 adjudication. Fixed
// input-length seed/recurrence control reuses the settled CF040 EMA authority.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#mutable-variables-are-always-series
const body = 'var seriesLen = 0\nseriesLen += 1\nplot(ta.ema(close, seriesLen), title="EMA")';
const source = (version: number) => `//@version=${version}\nindicator("Mutable migration")\n${body}`;

describe('ledger47 mutable constant migration, rank1879', () => {
  it('v5 admits the documented mutable length', () => {
    expect(checkProgram(parse(source(5))).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('v5 fixed input length preserves the TV-settled SMA seed and recurrence', () => {
    const result = runCompatScript(
      '//@version=5\nindicator("Fixed EMA control")\nlength = input.int(3)\nplot(ta.ema(close, length), title="EMA")',
    );
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'EMA').values;
    expect(values.slice(0, 2)).toEqual([null, null]);
    let expected = compatibilityBars.slice(0, 3).reduce((sum, bar) => sum + bar.close, 0) / 3;
    expect(values[2]).toBeCloseTo(expected, 12);
    for (let index = 3; index < compatibilityBars.length; index++) {
      expected += 0.5 * (compatibilityBars[index]!.close - expected);
      expect(values[index]).toBeCloseTo(expected, 12);
    }
  });
  it('v6 classifies the mutable length as series and refuses the simple-only slot', () => {
    const result = checkProgram(parse(source(6)));
    expect(result.symbols.find((s) => s.name === 'seriesLen')?.type?.qualifier).toBe('series');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining("'length' for ta.ema"),
        }),
      ]),
    );
  });
});

// HOLD: native v5 ask in oracle-probes/v5-outcomes/mutable-ema-first-length-probe-spec-v1.json.
// A fresh first-source seed made the former changing-length test pass without
// proving a frozen constructor. These two diagnostic comparisons are not native authority.
describe('v5 mutable EMA constructor binding controls', () => {
  it.skip('pins a root mutable initial length of two against the constant control', () => {
    const result = runCompatScript(
      '//@version=5\nindicator("Length two")\nvar length = 1\nlength += 1\nplot(ta.ema(close, length), title="Mutable")\nplot(ta.ema(close, 2), title="Fixed")',
    );
    expect(result.errors).toEqual([]);
    const expected = getPlot(result, 'Fixed').values;
    expect(expected[0]).toBeNull();
    expect(expected[1]).not.toBeNull();
    expect(getPlot(result, 'Mutable').values).toEqual(expected);
  });
  it.skip('keeps separate initial constructor lengths for two written UDF calls', () => {
    const result = runCompatScript(
      '//@version=5\nindicator("Scoped lengths")\nsmooth(int length) => ta.ema(close, length)\nvar length = 1\nlength += 1\nplot(smooth(length), title="Mutable")\nplot(smooth(4), title="Scoped four")\nplot(ta.ema(close, 2), title="Two")\nplot(ta.ema(close, 4), title="Four")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Mutable').values).toEqual(getPlot(result, 'Two').values);
    expect(getPlot(result, 'Scoped four').values).toEqual(getPlot(result, 'Four').values);
    expect(getPlot(result, 'Four').values.slice(0, 3)).toEqual([null, null, null]);
    expect(getPlot(result, 'Four').values[3]).not.toBeNull();
  });
  it('retains v6 constant length EMA construction', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("Modern")\nconst int length = 2\nplot(ta.ema(close, length), title="Named")\nplot(ta.ema(close, 2), title="Literal")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Named').values).toEqual(getPlot(result, 'Literal').values);
    expect(getPlot(result, 'Named').values[1]).not.toBeNull();
  });
});
