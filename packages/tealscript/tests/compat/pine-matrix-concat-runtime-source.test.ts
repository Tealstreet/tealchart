import { expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

// Implementation controls for source mapping beyond the exact native item18
// namespace source. No numeric or additional native-stack credit is claimed.
it('maps a receiver concat fault to the reached call rather than an earlier unreachable site', () => {
  const result = runCompatScript(`//@version=6
indicator("Reached matrix call")
a = matrix.new<float>(1, 2, 0)
b = matrix.new<float>(1, 1, 0)
if false
    matrix.concat(a, b)
a.concat(b)
plot(close)`);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].runtimeError).toMatchObject({ code: 'RE10094', barIndex: 0, line: 7,
    stackTrace: [{ n: '#main', p: 7 }] });
  expect(result.plots).toEqual([]);
});

it('retains the local function and caller frames for a concat failure', () => {
  const result = runCompatScript(`//@version=6
indicator("Nested matrix call")
join(matrix<float> a, matrix<float> b) =>
    matrix.concat(a, b)
a = matrix.new<float>(1, 2, 0)
b = matrix.new<float>(1, 1, 0)
x = join(a, b)
plot(close)`);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].runtimeError).toMatchObject({ code: 'RE10094', barIndex: 0, line: 4,
    stackTrace: [{ n: 'join', p: 4 }, { n: '#main', p: 7 }] });
  expect(result.plots).toEqual([]);
});
