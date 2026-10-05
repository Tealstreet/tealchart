import { createHash } from 'node:crypto';

import { expect, it } from 'vitest';

import { pineExp } from './pineExp';

it('retains every parent bit across the dense exp sweep and numerical edges', () => {
  const args = Array.from({ length: 291401 }, (_, i) => -746 + i * 0.005);
  args.push(
    NaN,
    Infinity,
    -Infinity,
    0,
    -0,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    709.782712893384,
    709.7827128933841,
    -745.1332191019411,
    -745.1332191019412,
    -1022 * Math.LN2,
    -1023 * Math.LN2,
  );
  const bits = Buffer.alloc(args.length * 8);
  args.forEach((value, index) => bits.writeDoubleLE(pineExp(value), index * 8));
  // Parent 84c1d5242d, dense 291414 little-endian binary64 results.
  expect(createHash('sha256').update(bits).digest('hex')).toBe(
    'fdc588c548e84c45ddace76406615db3cdb5d4b9eea1b3b627b3752699fec50f',
  );
});

it('preserves missing, signed-zero, overflow and subnormal boundaries', () => {
  expect(Number.isNaN(pineExp(NaN))).toBe(true);
  expect(Number.isNaN(pineExp(710))).toBe(true);
  expect(pineExp(Infinity)).toBe(Infinity);
  expect(pineExp(-Infinity)).toBe(0);
  expect(pineExp(0)).toBe(1);
  expect(pineExp(-0)).toBe(1);
  expect(pineExp(Number.MIN_VALUE)).toBe(1);
  expect(pineExp(-Number.MIN_VALUE)).toBe(1);
  expect(pineExp(-744)).toBeGreaterThan(0);
  expect(pineExp(-746)).toBe(0);
});
