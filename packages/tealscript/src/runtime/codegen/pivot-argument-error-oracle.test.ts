import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("pivot errors")\n${body}`), bars);

describe('documented Woodie developing error', () => {
  it.each([
    'ta.pivot_point_levels("Woodie", true, true)',
    'ta.pivot_point_levels(developing=true, anchor=true, type="Woodie")',
    'ta.pivot_point_levels(input.string("Woodie"), false, true)',
  ])('rejects %s', expression => {
    const result = run(`levels = ${expression}\nplot(array.size(levels))`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Woodie.*developing/);
    expect(result.errors[0].code).not.toBe('RE10001');
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it.each(['ta.pivot_point_levels("Woodie", true, false)', 'ta.pivot_point_levels("Traditional", true, true)'])('keeps valid combination %s executable', expression => {
    const result = run(`levels = ${expression}\nplot(array.size(levels))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.every(value => value !== null)).toBe(true);
  });

  it('checks the combination at its executed call', () => {
    const delayed = run('if bar_index == 1\n    ta.pivot_point_levels("Woodie", true, true)\nplot(1)');
    expect(delayed.errors).toHaveLength(1);
    expect(delayed.plots[0].values[0]).toBe(1);
    const skipped = run('if bar_index < 0\n    ta.pivot_point_levels("Woodie", true, true)\nplot(1)');
    expect(skipped.errors).toEqual([]);
  });
});
