import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

// ta.change(bool) returns bool; tostring must expose true/false rather than -1/0/1.
describe('Boolean change retains its runtime kind', () => {
  for (const version of [5, 6]) {
    it(`v${version} formats default and three-bar changes as boolean strings`, () => {
      const bars = [-1, 1, 1, -1, 1, -1, -1, 1, -1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: -2,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Boolean change kind")
condition = close > 0
defaultChange = ta.change(condition)
threeBarChange = ta.change(source=condition, length=3)
if bar_index >= 3
    label.new(bar_index, 0, str.tostring(defaultChange) + "/" + str.tostring(threeBarChange))`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const labels = result.drawings?.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(7);
      expect(labels?.map((drawing) => Reflect.get(drawing, 'text'))).toEqual([
        'true/false',
        'true/false',
        'true/true',
        'false/false',
        'true/false',
        'true/false',
        'true/true',
      ]);
    });
  }
});
