import { LOG_TABLE } from './nativePowTables.ts';

const SPLITTER = 134217729;
const ERROR = 7.888609052210118e-31;
const LN2_HI = 0.6931471805599453;
const LN2_LO = 2.3190468138462996e-17;
const view = new DataView(new ArrayBuffer(8));
const powers = new Float64Array(2048);
for (let index = 1; index < 2047; index++) {
  view.setUint32(0, index << 20);
  view.setUint32(4, 0);
  powers[index] = view.getFloat64(0);
}

function sumError(a: number, b: number, sum: number): number {
  const virtual = sum - a;
  return a - (sum - virtual) + (b - virtual);
}

function productError(a: number, b: number, product: number): number {
  const splitA = SPLITTER * a,
    highA = splitA - (splitA - a),
    lowA = a - highA;
  const splitB = SPLITTER * b,
    highB = splitB - (splitB - b),
    lowB = b - highB;
  return highA * highB - product + highA * lowB + lowA * highB + lowA * lowB;
}

function certify(high: number, low: number, relativeError: number): number {
  const rounded = high + low;
  if (!(rounded > 1e-250 && rounded < 1e250)) return NaN;
  const residual = high - rounded + low;
  view.setFloat64(0, rounded);
  const upper = view.getUint32(0);
  let exponent = (upper >>> 20) & 2047;
  if (residual < 0 && (upper & 0xfffff) === 0 && view.getUint32(4) === 0) exponent--;
  const halfUlp = powers[exponent - 53];
  return halfUlp - Math.abs(residual) > rounded * (2 * relativeError) ? rounded : NaN;
}

export function fastIntegerPow(base: number, exponent: number): number {
  if (!(base > 1e-30 && base < 1e30)) return NaN;
  const count = Math.abs(exponent);
  let high: number, low: number;
  if (count === 3) {
    const square = base * base,
      squareLow = productError(base, base, square);
    high = square * base;
    low = productError(square, base, high) + squareLow * base;
  } else {
    high = 1;
    low = 0;
    let factor = base,
      factorLow = 0,
      remaining = count;
    while (remaining > 0) {
      if (remaining % 2 === 1) {
        const product = high * factor;
        if (!(product > 1e-200 && product < 1e200)) return NaN;
        const error = productError(high, factor, product) + high * factorLow + low * factor;
        high = product + error;
        low = product - high + error;
      }
      remaining = Math.floor(remaining / 2);
      if (remaining > 0) {
        const square = factor * factor;
        if (!(square > 1e-200 && square < 1e200)) return NaN;
        const error = productError(factor, factor, square) + 2 * factor * factorLow;
        factor = square + error;
        factorLow = square - factor + error;
      }
    }
  }
  if (exponent < 0) {
    const reciprocal = 1 / high,
      product = high * reciprocal;
    low = (1 - product - productError(high, reciprocal, product) - low * reciprocal) / high;
    high = reciprocal;
  }
  return certify(high, low, ERROR * count * count);
}

export function fastHalfPow(base: number, exponent: number): number {
  if (!(base > 1e-30 && base < 1e30)) return NaN;
  const root = Math.sqrt(base),
    square = root * root;
  const rootLow = (base - square - productError(root, root, square)) / (2 * root);
  const absolute = Math.abs(exponent);
  let high = root,
    low = rootLow;
  if (absolute > 0.5) {
    const factor = absolute === 1.5 ? base : base * base;
    const factorLow = absolute === 1.5 ? 0 : productError(base, base, factor);
    high = factor * root;
    low = productError(factor, root, high) + factor * rootLow + factorLow * root;
  }
  if (exponent < 0) {
    const reciprocal = 1 / high,
      product = high * reciprocal;
    low = (1 - product - productError(high, reciprocal, product) - low * reciprocal) / high;
    high = reciprocal;
  }
  return certify(high, low, ERROR);
}

export function fastGeneralPow(base: number, exponent: number, candidate: number): number {
  if (!(base > 1e-130 && base < 1e130 && candidate > 1e-210 && candidate < 1e210 && Math.abs(exponent) < 1048576))
    return NaN;
  let logarithm: number, baseLow: number, baseError: number;
  {
    let m = base,
      k = 0;
    if (!(m >= 0.7071067811865476 && m < 1.4142135623730951)) {
      if (m >= 0.5 && m < 2) {
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k = 1;
        } else {
          m *= 2;
          k = -1;
        }
      } else {
        view.setFloat64(0, base);
        k = ((view.getUint32(0) >>> 20) & 2047) - 1023;
        m = base / powers[k + 1023];
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k++;
        }
      }
    }
    const centerIndex = Math.round(m * 2048),
      c = centerIndex / 2048,
      index = (centerIndex - 1448) * 3;
    const difference = m - c,
      quotient = difference * LOG_TABLE[index + 2],
      split = 4097 * quotient;
    const r = split - (split - quotient),
      rl = (difference - r * c) * LOG_TABLE[index + 2];
    const square = r * r;
    let reduced: number, reducedLow: number;
    reduced = r - 0.5 * square;
    reducedLow =
      sumError(r, -0.5 * square, reduced) + rl / (1 + r) + r * square * (1 / 3 - r * (1 / 4 - r * (1 / 5 - r / 6)));
    let high = LOG_TABLE[index] + reduced;
    let low = sumError(LOG_TABLE[index], reduced, high) + LOG_TABLE[index + 1] + reducedLow;
    if (k !== 0) {
      const coarse = k * LN2_HI,
        coarseLow = (k === 1 || k === -1 ? 0 : productError(k, LN2_HI, coarse)) + k * LN2_LO;
      const sum = high + coarse;
      low += sumError(high, coarse, sum) + coarseLow;
      high = sum;
    }
    logarithm = high;
    baseLow = low;
    baseError = ERROR * (1 + Math.abs(k)) + 4 * Number.EPSILON * square;
  }
  const th = logarithm * exponent,
    tl = productError(logarithm, exponent, th) + baseLow * exponent;
  let reference: number,
    referenceLow: number,
    referenceError: number,
    referenceExponent: number,
    referenceMantissa: number;
  {
    let m = candidate,
      k = 0;
    if (!(m >= 0.7071067811865476 && m < 1.4142135623730951)) {
      if (m >= 0.5 && m < 2) {
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k = 1;
        } else {
          m *= 2;
          k = -1;
        }
      } else {
        view.setFloat64(0, candidate);
        k = ((view.getUint32(0) >>> 20) & 2047) - 1023;
        m = candidate / powers[k + 1023];
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k++;
        }
      }
    }
    const centerIndex = Math.round(m * 2048),
      c = centerIndex / 2048,
      index = (centerIndex - 1448) * 3;
    const difference = m - c,
      quotient = difference * LOG_TABLE[index + 2],
      split = 4097 * quotient;
    const r = split - (split - quotient),
      rl = (difference - r * c) * LOG_TABLE[index + 2];
    const square = r * r;
    let reduced: number, reducedLow: number;
    reduced = r - 0.5 * square;
    reducedLow =
      sumError(r, -0.5 * square, reduced) + rl / (1 + r) + r * square * (1 / 3 - r * (1 / 4 - r * (1 / 5 - r / 6)));
    let high = LOG_TABLE[index] + reduced;
    let low = sumError(LOG_TABLE[index], reduced, high) + LOG_TABLE[index + 1] + reducedLow;
    if (k !== 0) {
      const coarse = k * LN2_HI,
        coarseLow = (k === 1 || k === -1 ? 0 : productError(k, LN2_HI, coarse)) + k * LN2_LO;
      const sum = high + coarse;
      low += sumError(high, coarse, sum) + coarseLow;
      high = sum;
    }
    reference = high;
    referenceLow = low;
    referenceExponent = k;
    referenceMantissa = m;
    referenceError = ERROR * (1 + Math.abs(k)) + 4 * Number.EPSILON * square;
  }
  const difference = th - reference;
  const delta = difference + (sumError(th, -reference, difference) + tl - referenceLow);
  if (!(Math.abs(delta) < 8.881784197001252e-16)) return NaN;
  const bound = Math.abs(exponent) * baseError + referenceError + ERROR * (1 + Math.abs(th)) + delta * delta;
  const correction = candidate * delta;
  const resultExponent = referenceExponent - (referenceMantissa < 1 ? 1 : 0);
  const halfUlp = powers[resultExponent + 970] * (correction < 0 && referenceMantissa === 1 ? 0.5 : 1);
  if (halfUlp - Math.abs(correction) > candidate * (2 * bound)) return candidate;
  const rounded = certify(candidate, correction, bound);
  return Number.isNaN(rounded) ? refinedGeneralPow(base, exponent, candidate) : rounded;
}

function refinedGeneralPow(base: number, exponent: number, candidate: number): number {
  if (!(base > 1e-130 && base < 1e130 && candidate > 1e-210 && candidate < 1e210 && Math.abs(exponent) < 1048576))
    return NaN;
  let logarithm: number, baseLow: number, baseError: number;
  {
    let m = base,
      k = 0;
    if (!(m >= 0.7071067811865476 && m < 1.4142135623730951)) {
      if (m >= 0.5 && m < 2) {
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k = 1;
        } else {
          m *= 2;
          k = -1;
        }
      } else {
        view.setFloat64(0, base);
        k = ((view.getUint32(0) >>> 20) & 2047) - 1023;
        m = base / powers[k + 1023];
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k++;
        }
      }
    }
    const centerIndex = Math.round(m * 2048),
      c = centerIndex / 2048,
      index = (centerIndex - 1448) * 3;
    const difference = m - c,
      quotient = difference * LOG_TABLE[index + 2],
      split = 4097 * quotient;
    const r = split - (split - quotient),
      rl = (difference - r * c) * LOG_TABLE[index + 2];
    const square = r * r;
    let reduced: number, reducedLow: number;
    const sp = SPLITTER * r,
      sh = sp - (sp - r),
      sl = r - sh;
    const squareLow = sh * sh - square + 2 * sh * sl + sl * sl;
    const cube = square * r,
      cubeLow = productError(square, r, cube) + squareLow * r;
    const fourth = square * square,
      fourthLow = productError(square, square, fourth) + 2 * square * squareLow;
    const third = cube / 3,
      thirdProduct = third * 3;
    const thirdLow = (cube - thirdProduct - productError(third, 3, thirdProduct) + cubeLow) / 3;
    const a = r - 0.5 * square,
      al = sumError(r, -0.5 * square, a) - 0.5 * squareLow;
    const b = a + third,
      bl = sumError(a, third, b) + al + thirdLow;
    reduced = b - 0.25 * fourth;
    const tail = r * fourth * (1 / 5 - r * (1 / 6 - r * (1 / 7 - r / 8)));
    reducedLow = sumError(b, -0.25 * fourth, reduced) + bl - 0.25 * fourthLow + tail + rl / (1 + r);
    let high = LOG_TABLE[index] + reduced;
    let low = sumError(LOG_TABLE[index], reduced, high) + LOG_TABLE[index + 1] + reducedLow;
    if (k !== 0) {
      const coarse = k * LN2_HI,
        coarseLow = (k === 1 || k === -1 ? 0 : productError(k, LN2_HI, coarse)) + k * LN2_LO;
      const sum = high + coarse;
      low += sumError(high, coarse, sum) + coarseLow;
      high = sum;
    }
    logarithm = high;
    baseLow = low;
    baseError = ERROR * (1 + Math.abs(k)) * 4;
  }
  const th = logarithm * exponent,
    tl = productError(logarithm, exponent, th) + baseLow * exponent;
  let reference: number, referenceLow: number, referenceError: number;
  {
    let m = candidate,
      k = 0;
    if (!(m >= 0.7071067811865476 && m < 1.4142135623730951)) {
      if (m >= 0.5 && m < 2) {
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k = 1;
        } else {
          m *= 2;
          k = -1;
        }
      } else {
        view.setFloat64(0, candidate);
        k = ((view.getUint32(0) >>> 20) & 2047) - 1023;
        m = candidate / powers[k + 1023];
        if (m >= 1.4142135623730951) {
          m *= 0.5;
          k++;
        }
      }
    }
    const centerIndex = Math.round(m * 2048),
      c = centerIndex / 2048,
      index = (centerIndex - 1448) * 3;
    const difference = m - c,
      quotient = difference * LOG_TABLE[index + 2],
      split = 4097 * quotient;
    const r = split - (split - quotient),
      rl = (difference - r * c) * LOG_TABLE[index + 2];
    const square = r * r;
    let reduced: number, reducedLow: number;
    const sp = SPLITTER * r,
      sh = sp - (sp - r),
      sl = r - sh;
    const squareLow = sh * sh - square + 2 * sh * sl + sl * sl;
    const cube = square * r,
      cubeLow = productError(square, r, cube) + squareLow * r;
    const fourth = square * square,
      fourthLow = productError(square, square, fourth) + 2 * square * squareLow;
    const third = cube / 3,
      thirdProduct = third * 3;
    const thirdLow = (cube - thirdProduct - productError(third, 3, thirdProduct) + cubeLow) / 3;
    const a = r - 0.5 * square,
      al = sumError(r, -0.5 * square, a) - 0.5 * squareLow;
    const b = a + third,
      bl = sumError(a, third, b) + al + thirdLow;
    reduced = b - 0.25 * fourth;
    const tail = r * fourth * (1 / 5 - r * (1 / 6 - r * (1 / 7 - r / 8)));
    reducedLow = sumError(b, -0.25 * fourth, reduced) + bl - 0.25 * fourthLow + tail + rl / (1 + r);
    let high = LOG_TABLE[index] + reduced;
    let low = sumError(LOG_TABLE[index], reduced, high) + LOG_TABLE[index + 1] + reducedLow;
    if (k !== 0) {
      const coarse = k * LN2_HI,
        coarseLow = (k === 1 || k === -1 ? 0 : productError(k, LN2_HI, coarse)) + k * LN2_LO;
      const sum = high + coarse;
      low += sumError(high, coarse, sum) + coarseLow;
      high = sum;
    }
    reference = high;
    referenceLow = low;
    referenceError = ERROR * (1 + Math.abs(k)) * 4;
  }
  const difference = th - reference;
  const delta = difference + (sumError(th, -reference, difference) + tl - referenceLow);
  if (!(Math.abs(delta) < 8.881784197001252e-16)) return NaN;
  const bound = Math.abs(exponent) * baseError + referenceError + ERROR * (1 + Math.abs(th)) + delta * delta;
  const rounded = certify(candidate, candidate * delta, bound);
  return rounded;
}
