// Adapted from musl/FreeBSD e_log10.c; attribution and permission notice
// are preserved in nativeLog10.LICENSE.txt. Keep the compensated operation order.
const logarithmWords = new DataView(new ArrayBuffer(8));

export function nativeLog10(value: number): number {
  if (value === 0) return -Infinity;
  if (value < 0) return NaN;
  if (!Number.isFinite(value)) return value;

  logarithmWords.setFloat64(0, value, false);
  let highWord = logarithmWords.getUint32(0, false);
  let exponent = 0;
  if (highWord < 0x00100000) {
    exponent -= 54;
    value *= 18014398509481984;
    logarithmWords.setFloat64(0, value, false);
    highWord = logarithmWords.getUint32(0, false);
  }
  highWord += 0x3ff00000 - 0x3fe6a09e;
  exponent += (highWord >>> 20) - 0x3ff;
  highWord = (highWord & 0x000fffff) + 0x3fe6a09e;
  logarithmWords.setUint32(0, highWord, false);

  const fraction = logarithmWords.getFloat64(0, false) - 1;
  const halfSquare = 0.5 * fraction * fraction;
  const ratio = fraction / (2 + fraction);
  const square = ratio * ratio;
  const fourth = square * square;
  const even =
    fourth * (3.999999999940941908e-1 + fourth * (2.222219843214978396e-1 + fourth * 1.531383769920937332e-1));
  const odd =
    square *
    (6.66666666666673513e-1 +
      fourth * (2.857142874366239149e-1 + fourth * (1.818357216161805012e-1 + fourth * 1.479819860511658591e-1)));
  const remainder = odd + even;

  logarithmWords.setFloat64(0, fraction - halfSquare, false);
  logarithmWords.setUint32(4, 0, false);
  const logHigh = logarithmWords.getFloat64(0, false);
  const logLow = fraction - logHigh - halfSquare + ratio * (halfSquare + remainder);
  const inverseLn10High = 4.34294481878168880939e-1;
  const inverseLn10Low = 2.50829467116452752298e-11;
  const productHigh = logHigh * inverseLn10High;
  const exponentHigh = exponent * 3.01029995663611771306e-1;
  let resultLow =
    exponent * 3.69423907715893078616e-13 + (logLow + logHigh) * inverseLn10Low + logLow * inverseLn10High;
  const resultHigh = exponentHigh + productHigh;
  resultLow += exponentHigh - resultHigh + productHigh;
  return resultLow + resultHigh;
}
