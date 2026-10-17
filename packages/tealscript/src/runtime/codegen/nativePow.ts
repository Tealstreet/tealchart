import { fastGeneralPow, fastHalfPow, fastIntegerPow } from './nativePowFast.ts';

const powerCandidate = Math.pow;

interface Dyadic {
  coefficient: bigint;
  exponent: number;
}
type Interval = readonly [bigint, bigint];

const bits = new DataView(new ArrayBuffer(8));
const logarithmsOfTwo = new Map<number, Interval>();
const bitLength = (value: bigint) => value.toString(2).length;
const ceilDivide = (value: bigint, divisor: bigint) => -floorDivide(-value, divisor);
function floorDivide(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  return value < 0n && value % divisor !== 0n ? quotient - 1n : quotient;
}

function dyadic(value: number): Dyadic {
  bits.setFloat64(0, value);
  const raw = bits.getBigUint64(0);
  const encodedExponent = Number((raw >> 52n) & 2047n);
  let coefficient = raw & 0xfffffffffffffn;
  if (encodedExponent !== 0) coefficient |= 1n << 52n;
  let exponent = encodedExponent === 0 ? -1074 : encodedExponent - 1075;
  while ((coefficient & 1n) === 0n) {
    coefficient >>= 1n;
    exponent++;
  }
  return { coefficient, exponent };
}

function powerOfTwo(exponent: number): number {
  bits.setBigUint64(0, exponent >= -1022 ? BigInt(exponent + 1023) << 52n : 1n << BigInt(exponent + 1074));
  return bits.getFloat64(0);
}

function roundedDyadic(value: bigint, exponent: number): number {
  if (value === 0n) return 0;
  const leadingExponent = bitLength(value) - 1 + exponent;
  if (leadingExponent > 1023) return Infinity;
  const unit = Math.max(leadingExponent - 52, -1074);
  const shift = unit - exponent;
  let rounded: bigint;
  if (shift <= 0) rounded = value << BigInt(-shift);
  else {
    const divisor = 1n << BigInt(shift);
    rounded = value / divisor;
    const remainder = value % divisor;
    if (2n * remainder > divisor || (2n * remainder === divisor && (rounded & 1n) !== 0n)) rounded++;
  }
  return Number(rounded) * powerOfTwo(unit);
}

function integerRoot(value: bigint, degree: bigint): bigint {
  if (degree === 1n || value < 2n) return value;
  let root = 1n << BigInt(Math.ceil(bitLength(value) / Number(degree)));
  for (;;) {
    const next = ((degree - 1n) * root + value / root ** (degree - 1n)) / degree;
    if (next >= root) return root;
    root = next;
  }
}

// Compare an exact positive rational times a power of two with one.
function compareUnit(numerator: bigint, denominator: bigint, exponent: number): number {
  const left = exponent >= 0 ? numerator << BigInt(exponent) : numerator;
  const right = exponent < 0 ? denominator << BigInt(-exponent) : denominator;
  return left < right ? -1 : left > right ? 1 : 0;
}

function roundedRoot(base: Dyadic, numerator: number, degree: number): number {
  const coefficient = base.coefficient ** BigInt(Math.abs(numerator));
  const n = numerator > 0 ? coefficient : 1n;
  const d = numerator > 0 ? 1n : coefficient;
  const exponent = base.exponent * numerator;
  let leadingExponent = Math.floor((bitLength(n) - bitLength(d) + exponent) / degree);
  while (compareUnit(n, d, exponent - leadingExponent * degree) < 0) leadingExponent--;
  if (leadingExponent > 1023) return Infinity;
  if (leadingExponent < -1075) return 0;
  const unit = Math.max(leadingExponent - 52, -1074);
  const shift = exponent - unit * degree;
  const scaledNumerator = shift >= 0 ? n << BigInt(shift) : n;
  const scaledDenominator = shift < 0 ? d << BigInt(-shift) : d;
  const r = BigInt(degree);
  let result = integerRoot(scaledNumerator / scaledDenominator, r);
  // Compare the exact root to the binary64 midpoint, before any floating-point rounding.
  const midpoint = (2n * result + 1n) ** r * scaledDenominator;
  const target = scaledNumerator << r;
  if (target > midpoint || (target === midpoint && (result & 1n) !== 0n)) result++;
  return Number(result) * powerOfTwo(unit);
}

// 2*atanh(n/d), with directed fixed-point rounding and a geometric tail enclosure.
function logarithmRatio(n: bigint, d: bigint, precision: number): Interval {
  if (n === 0n) return [0n, 0n];
  const scale = 1n << BigInt(precision);
  const low = (n * scale) / d;
  const high = ceilDivide(n * scale, d);
  const squareLow = (low * low) / scale;
  const squareHigh = ceilDivide(high * high, scale);
  let powerLow = low,
    powerHigh = high,
    sumLow = 0n,
    sumHigh = 0n;
  for (let odd = 1n; ; odd += 2n) {
    sumLow += powerLow / odd;
    sumHigh += ceilDivide(powerHigh, odd);
    powerLow = (powerLow * squareLow) / scale;
    powerHigh = ceilDivide(powerHigh * squareHigh, scale);
    if (powerHigh <= 1n) return [2n * sumLow, 2n * sumHigh + 4n];
  }
}

function logarithm(base: Dyadic, precision: number): Interval {
  let ln2 = logarithmsOfTwo.get(precision);
  if (!ln2) {
    ln2 = logarithmRatio(1n, 3n, precision);
    logarithmsOfTwo.set(precision, ln2);
  }
  const leading = bitLength(base.coefficient) - 1;
  const unit = 1n << BigInt(leading);
  const reduced = logarithmRatio(base.coefficient - unit, base.coefficient + unit, precision);
  const exponent = BigInt(base.exponent + leading);
  return exponent >= 0n
    ? [reduced[0] + exponent * ln2[0], reduced[1] + exponent * ln2[1]]
    : [reduced[0] + exponent * ln2[1], reduced[1] + exponent * ln2[0]];
}

function multiplyExponent(interval: Interval, exponent: Dyadic, negative: boolean): Interval {
  let low = interval[0] * exponent.coefficient,
    high = interval[1] * exponent.coefficient;
  if (negative) [low, high] = [-high, -low];
  if (exponent.exponent >= 0) return [low << BigInt(exponent.exponent), high << BigInt(exponent.exponent)];
  const divisor = 1n << BigInt(-exponent.exponent);
  return [floorDivide(low, divisor), ceilDivide(high, divisor)];
}

function exponential(interval: Interval, precision: number): readonly [Interval, number] | undefined {
  const scale = 1n << BigInt(precision);
  const ln2 = logarithmsOfTwo.get(precision)!;
  const exponent = floorDivide(interval[0], ln2[0]) - 1n;
  const low = interval[0] - exponent * (exponent >= 0n ? ln2[1] : ln2[0]);
  const high = interval[1] - exponent * (exponent >= 0n ? ln2[0] : ln2[1]);
  if (low < 0n || high > 2n * scale) return undefined;
  let termLow = scale,
    termHigh = scale,
    sumLow = scale,
    sumHigh = scale;
  for (let index = 1n; ; index++) {
    termLow = (termLow * low) / (scale * index);
    termHigh = ceilDivide(termHigh * high, scale * index);
    sumLow += termLow;
    sumHigh += termHigh;
    if (index >= 8n && termHigh <= 1n) return [[sumLow, sumHigh + 2n], Number(exponent) - precision];
  }
}

export function nativePow(base: number, exponent: number): number {
  if (exponent === 2) return base * base;
  if (exponent === 1) return base;
  if (exponent === -1) return 1 / base;
  if (exponent === 0) return 1;
  if (exponent === 0.5 && base > 0) return Math.sqrt(base);
  if (!Number.isFinite(base) || !Number.isFinite(exponent) || base === 0 || Math.abs(base) === 1) {
    return Math.pow(base, exponent);
  }
  if (base < 0) {
    if (!Number.isInteger(exponent)) return NaN;
    const result = positivePow(-base, exponent);
    return Math.abs(exponent % 2) === 1 ? -result : result;
  }
  return positivePow(base, exponent);
}

function positivePow(base: number, exponent: number): number {
  const absolute = Math.abs(exponent);
  const fast =
    Number.isInteger(exponent) && absolute <= 64
      ? fastIntegerPow(base, exponent)
      : absolute === 0.5 || absolute === 1.5 || absolute === 2.5
        ? fastHalfPow(base, exponent)
        : fastGeneralPow(base, exponent, powerCandidate(base, exponent));
  return Number.isNaN(fast) ? exactPow(base, exponent) : fast;
}

function exactPow(magnitude: number, exponent: number): number {
  const x = dyadic(magnitude),
    y = dyadic(Math.abs(exponent));
  const signedNumerator = exponent < 0 ? -y.coefficient : y.coefficient;
  let result: number;
  if (
    x.coefficient === 1n &&
    (y.exponent >= 0 || (BigInt(x.exponent) * signedNumerator) % (1n << BigInt(-y.exponent)) === 0n)
  ) {
    const power =
      y.exponent >= 0
        ? (BigInt(x.exponent) * signedNumerator) << BigInt(y.exponent)
        : (BigInt(x.exponent) * signedNumerator) >> BigInt(-y.exponent);
    result = power > 1023n ? Infinity : power < -1075n ? 0 : roundedDyadic(1n, Number(power));
  } else if (y.exponent >= -5 && y.exponent <= 6 && y.coefficient << BigInt(Math.max(y.exponent, 0)) <= 64n) {
    const numerator = Number(signedNumerator << BigInt(Math.max(y.exponent, 0)));
    result = roundedRoot(x, numerator, 1 << Math.max(-y.exponent, 0));
  } else {
    for (let precision = 192; ; precision *= 2) {
      const scale = 1n << BigInt(precision);
      const power = multiplyExponent(logarithm(x, precision), y, exponent < 0);
      if (power[0] > 710n * scale) {
        result = Infinity;
        break;
      }
      if (power[1] < -746n * scale) {
        result = 0;
        break;
      }
      const expanded = exponential(power, precision);
      if (!expanded) continue;
      const [bounds, shift] = expanded;
      const low = roundedDyadic(bounds[0], shift),
        high = roundedDyadic(bounds[1], shift);
      if (low === high) {
        result = low;
        break;
      }
    }
  }
  return result;
}
