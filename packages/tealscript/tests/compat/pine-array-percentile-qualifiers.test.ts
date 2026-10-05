import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('array percentile percentage qualification', () => {
  const errors = (body: string) =>
    checkProgram(
      parse(`//@version=6
indicator("Array percentile qualification")
${body}
`),
    ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'accepts a series percentage on chained %s receivers',
    (method) => {
      expect(errors(`plot(array.from(1.0, 2.0, 3.0).${method}(bar_index % 101))`)).toEqual([]);
      expect(errors(`plot(array.copy(array.from(1.0, 2.0, 3.0)).${method}(percentage=bar_index % 101))`)).toEqual([]);
    },
  );

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'does not infer a simple UDF percentage from array %s',
    (method) => {
      expect(
        errors(`percentile(float p) => array.from(1.0, 2.0, 3.0).${method}(p)
plot(percentile(bar_index % 101))`),
      ).toEqual([]);
    },
  );

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'keeps namespace %s series admission',
    (method) => {
      expect(errors(`plot(array.${method}(array.from(1.0, 2.0, 3.0), bar_index % 101))`)).toEqual([]);
    },
  );

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'retains ta.%s simple percentage refusal',
    (method) => {
      expect(
        errors(`plot(ta.${method}(close, 3, bar_index % 101))`).some(
          (diagnostic) => diagnostic.code === 'qualifier-mismatch',
        ),
      ).toBe(true);
    },
  );

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'keeps simple inference through a TA %s UDF',
    (method) => {
      expect(
        errors(`percentile(float p) => ta.${method}(close, 3, p)
plot(percentile(bar_index % 101))`).some((diagnostic) => diagnostic.code === 'qualifier-mismatch'),
      ).toBe(true);
    },
  );

  it.each(['percentile_nearest_rank', 'percentile_linear_interpolation'])(
    'retains string percentage refusal on array %s',
    (method) => {
      expect(
        errors(`plot(array.from(1.0, 2.0, 3.0).${method}("bad"))`).some((diagnostic) =>
          diagnostic.message.includes('number'),
        ),
      ).toBe(true);
    },
  );
});
