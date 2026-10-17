import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';
import { nativePow } from './nativePow';
import { fastGeneralPow, fastIntegerPow } from './nativePowFast';

const binary64 = (value: number) => {
  const raw = new DataView(new ArrayBuffer(8));
  raw.setFloat64(0, value);
  return raw.getBigUint64(0).toString(16).padStart(16, '0');
};

// Independent 250-digit Decimal powers of the exact binary64 inputs, rounded once to binary64.
const vectors: [number, number, string][] = [
  [2, -2.5, '3fc6a09e667f3bcd'],
  [2, 2.5, '4016a09e667f3bcd'],
  [3, 0.25, '3ff50ea39fcbf166'],
  [3, -0.25, '3fe85092ed86a26b'],
  [1.1, 7.3, '40000abbdb22bbdf'],
  [0.1, 9.7, '3deb6c34860d4641'],
  [1.0000000000000002, 1e18, '53f44a12826f5073'],
  [Number.MIN_VALUE, 0.125, '378ae89f995ad3ad'],
  [2, 1023.9999999999999, '7feffffffffffd3a'],
  [2, -1075, '0000000000000000'],
  [2, -1074.9999999999998, '0000000000000001'],
  [210001, 3, '43407379b27f9bf8'],
  [210003, 3, '434073988057dac6'],
  [0.9999999999999999, 1e18, '35ec6ab6c6b3f2f9'],
  [1.5, Number.MIN_VALUE, '3ff0000000000000'],
  [Number.MIN_VALUE, -0.5, '6180000000000000'],
  [Number.MAX_VALUE, 0.5, '5fefffffffffffff'],
  [Number.MAX_VALUE, -0.5, '1ff0000000000000'],
];

describe('deterministic binary64 power', () => {
  it('keeps common changing general, integer and half-integer calls out of BigInt', () => {
    const integer = vi.spyOn(globalThis, 'BigInt');
    try {
      let sum = 0;
      for (let i = 0; i < 32; i++) {
        const base = 0.75 + (i + 1) / 32;
        for (const exponent of [0.37, 3, -2.5, 2.5]) sum += nativePow(base, exponent);
      }
      expect(Number.isFinite(sum)).toBe(true);
      expect(integer).not.toHaveBeenCalled();
    } finally {
      integer.mockRestore();
    }
  });

  it('corrects adjacent host candidates and rejects unavailable candidates', () => {
    const expected = '40000abbdb22bbdf';
    for (const offset of [-1n, 0n, 1n]) {
      const raw = new DataView(new ArrayBuffer(8));
      raw.setBigUint64(0, BigInt('0x' + expected) + offset);
      expect(binary64(fastGeneralPow(1.1, 7.3, raw.getFloat64(0)))).toBe(expected);
    }
    for (const candidate of [NaN, Infinity, 0, -1, 100]) {
      expect(fastGeneralPow(1.1, 7.3, candidate)).toBeNaN();
    }
  });

  it('leaves exact midpoint decisions to the exact path', () => {
    expect(fastIntegerPow(220003, 3)).toBeNaN();
    expect(fastGeneralPow(220003, 3, Math.pow(220003, 3))).toBeNaN();
    expect(fastGeneralPow(191 ** 4, 7 / 4, Math.pow(191 ** 4, 7 / 4))).toBeNaN();
    expect(binary64(nativePow(220003, 3))).toBe('4342ea590eda539e');
  });

  it.each(vectors)('rounds %s ** %s to bits %s', (base, exponent, expected) => {
    expect(binary64(nativePow(base, exponent))).toBe(expected);
  });

  it('does not use the host transcendental approximation for finite nontrivial powers', () => {
    const host = vi.spyOn(Math, 'pow').mockReturnValue(NaN);
    try {
      for (const [base, exponent, expected] of vectors) expect(binary64(nativePow(base, exponent))).toBe(expected);
      expect(host).not.toHaveBeenCalled();
    } finally {
      host.mockRestore();
    }
  });

  it('preserves domain errors, signed zero, infinity and exact exponent rules', () => {
    for (const base of [NaN, -Infinity, -2, -1, -0, 0, 1, 2, Infinity]) {
      for (const exponent of [NaN, -Infinity, -3, -2, -1, -0.5, -0, 0, 0.5, 1, 2, 3, Infinity]) {
        if (Number.isFinite(base) && base !== 0 && Math.abs(base) !== 1 && Number.isFinite(exponent) && exponent !== 0)
          continue;
        expect(nativePow(base, exponent), `${base} ** ${exponent}`).toBe(Math.pow(base, exponent));
      }
    }
    expect(nativePow(-2, 0.25)).toBeNaN();
    expect(nativePow(-2, 3)).toBe(-8);
    expect(nativePow(-2, -3)).toBe(-0.125);
    expect(Object.is(nativePow(-2, -1075), -0)).toBe(true);
    expect(nativePow(2, 1024)).toBe(Infinity);
    expect(nativePow(2, -1074)).toBe(Number.MIN_VALUE);
    expect(nativePow(2, -1075)).toBe(0);
    expect(nativePow(Number.MAX_VALUE, 1.5)).toBe(Infinity);
    expect(nativePow(Number.MIN_VALUE, 1.5)).toBe(0);
  });

  it.each([4, 5, 6])(
    'routes v%s positional, reordered named and dynamic calls through the shared helper',
    (version) => {
      const name = version === 4 ? 'pow' : 'math.pow';
      const compiled = tryCompile(
        parse(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Power rounding")
x = bar_index % 2 == 0 ? -2.5 : 2.5
plot(${name}(2.0, x), "positional")
plot(${name}(exponent=x, base=2.0), "named")`),
      );
      expect(compiled.success).toBe(true);
      expect(compiled.generatedCode).not.toContain('Math.pow(');
      const result = executeCompiled(
        compiled,
        [0, 1].map((index) => ({
          time: 1700000000000 + index * 60000,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: 1,
        })),
      );
      expect(result?.errors).toEqual([]);
      for (const plot of result?.plots ?? [])
        expect(plot.values.map((value) => binary64(Number(value)))).toEqual(['3fc6a09e667f3bcd', '4016a09e667f3bcd']);
      expect(result?.plots).toHaveLength(2);
    },
  );
});
