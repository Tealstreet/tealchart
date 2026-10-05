import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [0, 2, 0, 2, 0, 2, 0, 2].map((close, index) => ({
  time: (index + 1) * 60000, open: 1, high: 3, low: 0, close, volume: 100,
}));

// Defined-value outputs follow the manual. Hole recovery follows the stronger
// TradingView v6 capture authority documented by pine-fix-crosses47d5986d18:
// retain the last complete operand pair; no v5 missing result is pinned.
describe('ledger gaps 10 crosses', () => {
  it.each(['crossover', 'crossunder'])(
    'returns false on v6 holes and recovers the last complete pair: %s (rows 391/399)',
    (name) => {
      const source = `//@version=6\nindicator("v6 crosses")\na = bar_index == 1 ? na : close\nb = bar_index == 4 ? na : 1.0\nplot(ta.${name}(a, b) ? 1 : 0, "cross")\nplot(ta.${name}(close, 1.0) ? 1 : 0, "defined")`;
      const closes = name === 'crossover' ? [0, 2, 2, 0, 0, 2, 0, 2] : [2, 0, 0, 2, 2, 0, 2, 0];
      const result = executeScript(parse(source), closes.map((close, index) => ({ ...bars[index], close })));
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual(name === 'crossover'
        ? [[0, 0, 1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 0, 1, 0, 1]]
        : [[0, 0, 1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 0, 1, 0, 1]]);
    },
  );

  it('uses the immediate prior bar including equality in both crossing directions (rows 391/399)', () => {
    const result = executeScript(parse('//@version=6\nindicator("cross equality")\nplot(ta.crossover(close, 1) ? 1 : 0)\nplot(ta.crossunder(close, 1) ? 1 : 0)'),
      [1, 2, 2, 1, 0, 0, 1, 2].map((close, index) => ({ ...bars[index], close })));
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[0, 1, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 1, 0, 0, 0]]);
  });

  it.each(['crossover(close, 1)', 'crossover(x=close, y=1)', 'crossover(y=1, x=close)', 'crossover(x=close, 1)', 'crossover(y=1, close)'])(
    'executes the v4 global form %s (rows 393–395)',
    (call) => {
      const program = parse(`//@version=4\nstudy("legacy cross")\nplot(${call} ? 1 : 0)`);
      expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(program, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0].values).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    },
  );

  it('rejects modern slots and duplicate legacy bindings in v4 (rows 394–395)', () => {
    for (const call of ['crossover(source1=close, y=1)', 'crossover(x=close, source2=1)']) {
      expect(checkProgram(parse(`//@version=4\nstudy("old slots")\nplot(${call} ? 1 : 0)`)).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-argument' }),
      ]));
    }
    expect(checkProgram(parse('//@version=4\nstudy("duplicate slots")\nplot(crossover(close, x=close, y=1) ? 1 : 0)')).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate-argument' }),
    ]));
  });

  it.each([5, 6])('enforces modern crossover spelling and slot names in v%s (rows 393–395)', (version) => {
    const source = (call: string) => parse(`//@version=${version}\nindicator("modern cross")\nplot(${call} ? 1 : 0)`);
    const result = executeScript(source('ta.crossover(source2=1, source1=close)'), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    expect(checkProgram(source('crossover(close, 1)')).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'version-mismatch' }),
    ]));
    for (const call of ['ta.crossover(x=close, source2=1)', 'ta.crossover(source1=close, y=1)']) {
      expect(checkProgram(source(call)).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-argument' }),
      ]));
    }
  });
});
