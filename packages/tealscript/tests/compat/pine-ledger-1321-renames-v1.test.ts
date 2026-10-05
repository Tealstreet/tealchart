import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json and migration-guides/to-pine-version-5.
const script = (version: number, call: string) => `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Published rename")\nplot(${call}, title="Value")`;
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger1321–1360 published namespace migrations', () => {
  // Ranks1321/1350; published TA namespace table, reference entries ta.percentile_nearest_rank and ta.bbw.
  it.each([
    ['percentile_nearest_rank', 'close, 3, 50'],
    ['bbw', 'close, 3, 2'],
  ])('preserves the %s calculation under its published namespace rename', (name, args) => {
    const legacy = script(4, `${name}(${args})`);
    const modern = script(5, `ta.${name}(${args})`);
    expect(errors(legacy)).toEqual([]);
    expect(errors(modern)).toEqual([]);
    expect(errors(script(5, `${name}(${args})`))).not.toEqual([]);
    const before = runCompatScript(legacy);
    const after = runCompatScript(modern);
    expect(before.errors).toEqual([]);
    expect(after.errors).toEqual([]);
    expect(getPlot(before, 'Value').values).toEqual(getPlot(after, 'Value').values);
  });

  // Rank1357; published math namespace table and functions172, without pinning an exact random sequence.
  it('executes v4 random and v5 math.random, refusing the removed v5 global name', () => {
    for (const [version, call] of [[4, 'random(0, 1, 17)'], [5, 'math.random(0, 1, 17)']] as const) {
      const source = script(version, call);
      expect(errors(source)).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'Value').values;
      expect(values).toHaveLength(compatibilityBars.length);
      expect(values.every((value) => value !== null && Number.isFinite(value))).toBe(true);
    }
    expect(errors(script(5, 'random(0, 1, 17)'))).not.toEqual([]);
  });
});
