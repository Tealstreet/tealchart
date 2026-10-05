import { describe, expect, it } from 'vitest';

import { RUNTIME_HELPERS } from './emitter';

describe('numeric history offset coercion cost', () => {
  it('normalizes numeric offsets without repeating Number coercion', () => {
    let conversions = 0;
    const number = new Proxy(Number, {
      apply(target, receiver, args) {
        conversions++;
        return Reflect.apply(target, receiver, args);
      },
    });
    const offset = new Function('Number', `${RUNTIME_HELPERS}\nreturn _historyOffset;`)(number);
    for (const value of [0, -0, 1, 4999, 3.75, Number.MAX_SAFE_INTEGER]) {
      expect(offset(value)).toBe(Math.trunc(value));
    }
    expect(conversions).toBe(0);
  });

  it('preserves missing, nonfinite, object coercion and negative-offset behavior', () => {
    const offset = new Function(`${RUNTIME_HELPERS}\nreturn _historyOffset;`)();
    const calls: string[] = [];
    expect(
      offset({
        valueOf: () => {
          calls.push('coerce');
          return 3.75;
        },
      }),
    ).toBe(3);
    expect(calls).toEqual(['coerce']);
    expect(offset('4.75')).toBe(4);
    expect(offset(undefined)).toBe(0);
    expect(offset(NaN)).toBe(0);
    expect(offset(null)).toBe(0);
    expect(offset(false)).toBe(0);
    expect(offset(Infinity)).toBeNaN();
    expect(offset(-Infinity)).toBeNaN();
    expect(offset(-0.25) === 0).toBe(true);
    expect(() => offset('-2')).toThrow('Historical offset -2 is invalid');
    expect(() =>
      offset({
        valueOf: () => {
          throw new Error('coercion failure');
        },
      }),
    ).toThrow('coercion failure');
  });
});
