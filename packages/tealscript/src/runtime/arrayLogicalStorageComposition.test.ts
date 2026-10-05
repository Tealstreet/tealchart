import { describe, expect, it } from 'vitest';

import {
  absArrayValue,
  avgArrayValue,
  binarySearchArrayValue,
  binarySearchLeftmostArrayValue,
  binarySearchRightmostArrayValue,
  concatArray,
  copyArray,
  covarianceArrayValue,
  createPineArray,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  joinArray,
  lastIndexOfArrayValue,
  maxArrayValue,
  medianArrayValue,
  minArrayValue,
  modeArrayValue,
  percentileLinearInterpolationArrayValue,
  percentileNearestRankArrayValue,
  percentRankArrayValue,
  pushArrayValue,
  rangeArrayValue,
  reverseArray,
  sliceArray,
  sortArray,
  sortIndicesArrayValue,
  standardizeArrayValue,
  stdevArrayValue,
  sumArrayValue,
  unshiftArrayValue,
  varianceArrayValue,
} from './arrays';

function withPrefix(prefix: number[], tail: number[]) {
  const array = createPineArray<number>();
  for (const value of tail) pushArrayValue(array, value);
  for (let index = prefix.length - 1; index >= 0; index--) unshiftArrayValue(array, prefix[index]!);
  return array;
}

describe('composed logical array readers', () => {
  it('sum includes the prepend prefix in left-to-right binary64 order', () => {
    expect(sumArrayValue(withPrefix([1e16, -1e16, 1], [7]))).toBe(8);
    expect(sumArrayValue(withPrefix([9, Number.NaN], [4]))).toBe(13);
  });

  it.each([
    ['min', minArrayValue, -9],
    ['max', maxArrayValue, 20],
  ] as const)('%s scans include the prefix and retain the first signed-zero tie', (name, reader, expected) => {
    expect(reader(withPrefix([-9, 20], [3, 4]))).toBe(expected);
    expect(reader(withPrefix([-0, +0], [name === 'min' ? 1 : -1]))).toBe(-0);
    expect(reader(withPrefix([+0], [-0]))).toBe(+0);
    expect(reader(withPrefix([-9, 20], [3, 4]), 1)).toBe(name === 'min' ? 3 : 4);
  });

  it('median selection includes the logical prefix', () => {
    expect(medianArrayValue(withPrefix([30, 1, 20], [10, 2]))).toBe(10);
    expect(medianArrayValue(withPrefix([10, 2], [30, 1]))).toBe(6);
  });

  it('nearest-rank selection includes the prefix and preserves logical tie order', () => {
    expect(percentileNearestRankArrayValue(withPrefix([30, 1, 20], [10, 2]), 50)).toBe(10);
    expect(percentileNearestRankArrayValue(withPrefix([-0], [+0]), 50)).toBe(-0);
  });

  it('linear-interpolation selection includes the prefix', () => {
    expect(percentileLinearInterpolationArrayValue(withPrefix([30, 1, 20], [10, 2]), 50)).toBe(10);
    expect(percentileLinearInterpolationArrayValue(withPrefix([10, 2], [30, 1]), 50)).toBe(6);
  });

  it('mode grouping includes prefix duplicates', () => {
    expect(modeArrayValue(withPrefix([8, 8, 8], [1, 2]))).toBe(8);
  });

  it('variance preserves prefix order in both direct reductions', () => {
    expect(varianceArrayValue(withPrefix([1, 2], [4]))).toBe((1 + 4 + 16) / 3 - (7 / 3) ** 2);
    const mean = 7 / 3;
    expect(varianceArrayValue(withPrefix([1, 2], [4]), false)).toBe(
      ((1 - mean) ** 2 + (2 - mean) ** 2 + (4 - mean) ** 2) / 2,
    );
  });

  it('search cache positions include the prefix before building an index', () => {
    const array = withPrefix([2, 1, 2], new Array(128).fill(4));
    for (let call = 0; call < 35; call++) expect(indexOfArrayValue(array, 1)).toBe(1);
    expect(indexOfArrayValue(array, 4)).toBe(3);
  });

  it('copy and public backing exposure materialize original order', () => {
    const array = withPrefix([3, 2, 1], [4]);
    expect(copyArray(array).values).toEqual([3, 2, 1, 4]);
    expect(array.values).toEqual([3, 2, 1, 4]);
  });

  it('numeric snapshots used by average, range and stdev include the prefix', () => {
    expect(avgArrayValue(withPrefix([1, 2], [4]))).toBe(7 / 3);
    expect(rangeArrayValue(withPrefix([-9, 20], [3, 4]))).toBe(29);
    expect(stdevArrayValue(withPrefix([1, 2], [4]))).toBe(Math.sqrt((1 + 4 + 16) / 3 - (7 / 3) ** 2));
  });

  it('covariance reads both logical sequences', () => {
    expect(covarianceArrayValue(withPrefix([1, 2], [3]), withPrefix([2, 4], [6]))).toBe(4 / 3);
  });

  it('sort-index projections retain logical indices instead of reversed physical prefix positions', () => {
    expect(sortIndicesArrayValue(withPrefix([30, 1, 20], [10, 2])).values).toEqual([1, 4, 3, 2, 0]);
    const view = sliceArray(withPrefix([30, 1, 20], [10, 2]), 1, 4);
    expect(getArrayValue(view, 0)).toBe(1);
    expect(copyArray(view).values).toEqual([1, 20, 10]);
  });

  it('absolute values retain the logical prefix', () => {
    expect(absArrayValue(withPrefix([-9, 2], [-4])).values).toEqual([9, 2, 4]);
  });

  it('standardized values retain all logical slots', () => {
    const exposed = createPineArray<number>();
    exposed.values = [-2, 0, 2];
    expect(standardizeArrayValue(withPrefix([-2, 0], [2])).values).toEqual(standardizeArrayValue(exposed).values);
  });

  it('percent rank resolves its index in the logical sequence', () => {
    expect(percentRankArrayValue(withPrefix([1, 2], [3]), 0)).toBe(0);
  });

  it('includes and last-index scans include prefix matches', () => {
    expect(includesArrayValue(withPrefix([9, 2], [4]), 9)).toBe(true);
    expect(lastIndexOfArrayValue(withPrefix([9, 2, 9], [4]), 9)).toBe(2);
  });

  it.each([
    ['binary', binarySearchArrayValue],
    ['leftmost', binarySearchLeftmostArrayValue],
    ['rightmost', binarySearchRightmostArrayValue],
  ] as const)('%s search includes the sorted logical prefix', (_, search) => {
    expect(search(withPrefix([1, 2], [3, 4]), 1)).toBe(0);
  });

  it('sort rewrites the complete logical sequence', () => {
    const array = withPrefix([9, 2], [4]);
    sortArray(array);
    expect(array.values).toEqual([2, 4, 9]);
  });

  it('reverse rewrites the complete logical sequence', () => {
    const array = withPrefix([9, 2], [4]);
    reverseArray(array);
    expect(array.values).toEqual([4, 2, 9]);
  });

  it('join reads the logical sequence in order', () => {
    expect(joinArray(withPrefix([9, 2], [4]), '|')).toBe('9|2|4');
  });

  it('concat reads both logical prefixes in order', () => {
    expect(concatArray(withPrefix([9, 2], [4]), withPrefix([8], [5])).values).toEqual([9, 2, 4, 8, 5]);
  });
});
