const fixedDecimalFormatters = new Map<number, Intl.NumberFormat>();

const highPriceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const standardPriceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const smallPriceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

const getFixedDecimalFormatter = (decimals: number) => {
  let formatter = fixedDecimalFormatters.get(decimals);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedDecimalFormatters.set(decimals, formatter);
  }
  return formatter;
};

export function formatPriceByMagnitude(price: number): string {
  if (price >= 1000) {
    return highPriceFormatter.format(price);
  }
  if (price >= 1) {
    return standardPriceFormatter.format(price);
  }
  return smallPriceFormatter.format(price);
}

export function formatPriceWithDecimalPlaces(price: number, decimals: number): string {
  return getFixedDecimalFormatter(decimals).format(price);
}
