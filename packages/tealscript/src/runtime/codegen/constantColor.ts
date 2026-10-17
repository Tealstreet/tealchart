export interface ConstantColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  kind: 'rgb' | 'new' | 'literal';
}

export function constantColorAlpha(transparency: number): number {
  return Math.round(255 * (1 - transparency / 100));
}

function comparisonKey(color: ConstantColor): string {
  const alpha = color.kind === 'literal'
    ? 2.55 * (100 - 100 * Math.fround(1 - color.alpha / 255))
    : Math.fround(2.55) * (100 - 100 * (1 - Math.fround(color.alpha / 255)));
  const packed = color.green + color.blue * 256 + alpha * 65536 + color.red * 16777216;
  const encoded = color.kind === 'rgb' ? packed | 0 : color.kind === 'new' ? Math.trunc(packed) : packed;
  return encoded.toFixed(1);
}

export function constantColorsEqual(left: ConstantColor, right: ConstantColor): boolean {
  return comparisonKey(left) === comparisonKey(right);
}
