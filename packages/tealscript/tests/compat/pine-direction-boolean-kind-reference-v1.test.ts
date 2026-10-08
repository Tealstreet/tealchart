import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Single-step directions expose boolean results directly', () => {
  for (const version of [5, 6]) {
    it(`v${version} formats rise and fall results as true/false`, () => {
      const closes = [-2, 0, 0, 3, 1, 4, 4, -1, -3, 2];
      const result = runCompatScript(
        `//@version=${version}
indicator("Direction boolean kind")
up = ta.rising(close, 1)
down = ta.falling(close, 1)
if bar_index >= 1
    label.new(bar_index, 0, str.tostring(up) + "/" + str.tostring(down))`,
        {
          bars: compatibilityBars.slice(0, 10).map((bar, i) => ({ ...bar, close: closes[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const labels = result.drawings?.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(9);
      expect(labels?.map((drawing) => Reflect.get(drawing, 'text'))).toEqual([
        'true/false',
        'false/false',
        'true/false',
        'false/true',
        'true/false',
        'false/false',
        'false/true',
        'false/true',
        'true/false',
      ]);
    });
  }
});
