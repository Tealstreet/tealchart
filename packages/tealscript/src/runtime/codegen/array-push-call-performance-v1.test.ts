import { describe, expect, it } from 'vitest';

import { createPineArray } from '../arrays';
import { ARRAY_HELPERS } from './compile';

describe('array push call boundary cost', () => {
  it('rejects missing and foreign receivers before modifying them', () => {
    for (const receiver of [null, undefined, NaN, 7, 'array', { values: [] }]) {
      expect(() => ARRAY_HELPERS.push(receiver as never, 11)).toThrow(
        'Array methods cannot be called when the ID is na',
      );
    }
  });

  it('forwards valid storage and preserves exposed first-match indices', () => {
    const array = createPineArray<number>();
    ARRAY_HELPERS.push(array, 7);
    expect(ARRAY_HELPERS.indexOf(array, 7)).toBe(0);
    ARRAY_HELPERS.push(array, 7);
    const exposed = array.values;
    exposed[0] = 19;
    ARRAY_HELPERS.push(array, 23);
    expect(array.values).toEqual([19, 7, 23]);
    expect(ARRAY_HELPERS.indexOf(array, 7)).toBe(1);
  });
});
