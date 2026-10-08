import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Crossing functions expose boolean values directly', () => {
  for (const version of [5, 6]) {
    it(`v${version} formats crossings as true/false without numeric masks`, () => {
      const closes = [-2, 0, 3, 4, 0, -1, 2, 2, -3];
      const result = runCompatScript(
        `//@version=${version}
indicator("Cross boolean kind")
anyCross = ta.cross(close, 0.0)
upCross = ta.crossover(close, 0.0)
downCross = ta.crossunder(close, 0.0)
if bar_index >= 1
    label.new(bar_index, 0, str.tostring(anyCross) + "/" + str.tostring(upCross) + "/" + str.tostring(downCross))`,
        {
          bars: compatibilityBars.slice(0, 9).map((bar, i) => ({ ...bar, close: closes[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const labels = result.drawings?.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(8);
      expect(labels?.map((drawing) => Reflect.get(drawing, 'text'))).toEqual([
        'false/false/false',
        'true/true/false',
        'false/false/false',
        'false/false/false',
        'true/false/true',
        'true/true/false',
        'false/false/false',
        'true/false/true',
      ]);
    });
  }
});
