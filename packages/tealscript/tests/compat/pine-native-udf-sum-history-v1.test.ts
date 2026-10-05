import { expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// Native authority: oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv,
// CF035_literal, zero-based bars 9–12; both written UDF calls run each bar.
it('keeps the captured COG formula sum independent from its second invocation', () => {
  const bars = Array.from({ length: 13 }, (_, index) => ({
    time: 1_788_134_400_000 + index * 120_000, open: 1, high: 1, low: 1, close: 1, volume: 1,
  }));
  const result = runCompatScript(`//@version=6
indicator("Native COG literal history")
literal(src, length) =>
    total = math.sum(src, length)
    numerator = 0.0
    for i = 0 to length - 1
        numerator := numerator + src[i] * (i + 1)
    -numerator / total
source = int(time / 120000) % 11 == 7 ? float(na) : 10.0 + float(int(time / 120000) % 7)
plot(literal(source, 5), "literal")
plot(na(literal(source, 5)) ? 1 : 0, "missing")
`, { bars });
  expect(result.errors).toEqual([]);
  const actual = getPlot(result, 'literal').values.slice(9, 13);
  expect(actual).toHaveLength(4);
  const captured = [-2.8461538461538463, -2.857142857142857, -3.0588235294117645, -3.1666666666666665];
  actual.forEach((value, index) => expect(value).toBeCloseTo(captured[index], 12));
});
