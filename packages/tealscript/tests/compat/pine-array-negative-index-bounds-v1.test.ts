import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('negative slice mutation bounds use the selected size rather than the larger parent', () => {
  for (const receiver of [false, true]) for (const member of ['set', 'insert', 'remove']) {
    it(`receiver=${receiver} member=${member}`, () => {
      const args = `-6${member === 'remove' ? '' : ', 29'}`;
      const call = receiver ? `s.${member}(${args})` : `array.${member}(s, ${args})`;
      const result = runCompatScript(`//@version=6\nindicator("Negative slice bounds")\nparent = array.from(97, -31, 5, 17, -8, 43, -83)\ns = parent.slice(1, 6)\n${call}\nplot(s.size())`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => /out of bounds/.test(error.message))).toBe(true);
    });
  }
});
