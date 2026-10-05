const LN2_HIGH = 0.6931471803691238;
const LN2_LOW = 1.9082149292705877e-10;

export function nativeMathLog(value: number): number {
  if (!(value > 0) || !Number.isFinite(value) || (value >= 0.5 && value <= 2)) return Math.log(value);

  let exponent = Math.min(1023, Math.floor(Math.log2(value)));
  let mantissa = value / 2 ** exponent;
  if (mantissa < 1) {
    mantissa *= 2;
    exponent -= 1;
  }
  if (mantissa >= 2) {
    mantissa /= 2;
    exponent += 1;
  }

  const logarithm = Math.log(mantissa);
  const high = exponent * LN2_HIGH;
  const low = exponent * LN2_LOW;
  const sum = high + logarithm;
  const virtual = sum - high;
  const error = high - (sum - virtual) + (logarithm - virtual);
  return sum + (error + low);
}
