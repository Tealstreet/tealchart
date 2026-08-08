export function clampNativePriceDecimalsWorklet(decimals: number): number {
  'worklet';
  if (!Number.isFinite(decimals)) return 2;
  return Math.min(Math.max(Math.trunc(decimals), 0), 20);
}

export function normalizeNativePricePrecisionToTickSizeWorklet(pricePrecision: number): number {
  'worklet';
  if (!Number.isFinite(pricePrecision) || pricePrecision < 0) return 0.01;
  if (pricePrecision > 0 && pricePrecision < 1) return pricePrecision;
  // Built from a decimal literal rather than 10 ** -n. The result is read back
  // with toString() to count decimals, and exponentiation is not specified to a
  // bit-exact result — an engine whose pow returns 0.00010000000000000000209
  // for 1e-4 counts 20 decimals instead of 4 and formats prices with 20 places.
  // Parsing a decimal literal is exact and identical on every engine.
  return Number(`1e-${clampNativePriceDecimalsWorklet(pricePrecision)}`);
}

export function getNativeTradeLinePriceDecimalsWorklet(pricePrecision: number): number {
  'worklet';
  if (!Number.isFinite(pricePrecision) || pricePrecision < 0) return 2;
  if (pricePrecision === 0) return 0;
  if (pricePrecision >= 1) return 0;

  const precisionText = pricePrecision.toString();
  const exponentIndex = precisionText.indexOf('e');
  if (exponentIndex >= 0) {
    const mantissa = precisionText.slice(0, exponentIndex);
    const exponent = Number.parseInt(precisionText.slice(exponentIndex + 1), 10);
    if (exponent >= 0) return 0;
    const decimalIndex = mantissa.indexOf('.');
    const mantissaDecimals = decimalIndex >= 0 ? mantissa.length - decimalIndex - 1 : 0;
    return clampNativePriceDecimalsWorklet(-exponent + mantissaDecimals);
  }

  const decimalIndex = precisionText.indexOf('.');
  return decimalIndex >= 0 ? clampNativePriceDecimalsWorklet(precisionText.length - decimalIndex - 1) : 0;
}

function formatNativePriceWithDecimalsWorklet(price: number, decimals: number): string {
  'worklet';
  const fixed = (Number.isFinite(price) ? price : 0).toFixed(clampNativePriceDecimalsWorklet(decimals));
  const isNegative = fixed[0] === '-';
  const unsigned = isNegative ? fixed.slice(1) : fixed;
  const dotIndex = unsigned.indexOf('.');
  const integerPart = dotIndex >= 0 ? unsigned.slice(0, dotIndex) : unsigned;
  const decimalPart = dotIndex >= 0 ? unsigned.slice(dotIndex) : '';
  let grouped = '';
  for (let index = 0; index < integerPart.length; index += 1) {
    if (index > 0 && (integerPart.length - index) % 3 === 0) grouped += ',';
    grouped += integerPart[index];
  }
  return `${isNegative ? '-' : ''}${grouped}${decimalPart}`;
}

export function formatNativeTradeLinePriceWorklet(price: number, pricePrecision: number): string {
  'worklet';
  return formatNativePriceWithDecimalsWorklet(price, getNativeTradeLinePriceDecimalsWorklet(pricePrecision));
}

export function getNativePriceAxisTickDecimalsWorklet(spacing: number): number {
  'worklet';
  if (!Number.isFinite(spacing) || spacing <= 0) return 0;
  if (spacing >= 1) return 0;

  const spacingText = spacing.toString();
  const exponentIndex = spacingText.indexOf('e');
  if (exponentIndex >= 0) {
    const exponent = Number.parseInt(spacingText.slice(exponentIndex + 1), 10);
    return exponent < 0 ? clampNativePriceDecimalsWorklet(-exponent) : 0;
  }

  const decimalIndex = spacingText.indexOf('.');
  if (decimalIndex < 0) return 0;
  let decimals = spacingText.length - decimalIndex - 1;
  while (decimals > 0 && spacingText[decimalIndex + decimals] === '0') decimals -= 1;
  return clampNativePriceDecimalsWorklet(decimals);
}

export function formatNativePriceAxisTickWorklet(price: number, spacing: number): string {
  'worklet';
  return formatNativePriceWithDecimalsWorklet(price, getNativePriceAxisTickDecimalsWorklet(spacing));
}

export function formatNativePriceAxisTickWithPrecisionWorklet(
  price: number,
  spacing: number,
  pricePrecision: number,
): string {
  'worklet';
  return formatNativePriceWithDecimalsWorklet(
    price,
    Math.max(
      getNativePriceAxisTickDecimalsWorklet(spacing),
      getNativeTradeLinePriceDecimalsWorklet(pricePrecision),
    ),
  );
}
