import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

// valuewhen(bool) retains each qualifying event's bool, including false.
describe('Valuewhen retains boolean event values', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains occurrence zero and one as boolean strings`, () => {
      const bars = [-1, 1, 1, -1, 1, -1, -1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: -2,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Boolean event history")
event = bar_index % 2 == 0
flag = close > 0
latest = ta.valuewhen(event, flag, 0)
previous = ta.valuewhen(occurrence=1, source=flag, condition=event)
if bar_index >= 2
    label.new(bar_index,0,str.tostring(latest)+"/"+str.tostring(previous))`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const labels = result.drawings?.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(6);
      expect(labels?.map((drawing) => Reflect.get(drawing, 'text'))).toEqual([
        'true/false',
        'true/false',
        'true/true',
        'true/true',
        'false/true',
        'false/true',
      ]);
    });
  }
});
