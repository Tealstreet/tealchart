import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 3);

function values(source: string): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Collection namespace")\n${source}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, result.profile.compiledBarErrors?.firstMessage).toBe(0);
  return getPlot(result, 'Result').values;
}

describe('Pine collection variables sharing namespace names', () => {
  // Small input for the official matrix.new example 3.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.new<type>
  it('builds a matrix from a text area using namespace set calls', () => {
    expect(values(`
matrixFromInputArea(stringOfValues) =>
    var rowsArray = str.split(stringOfValues, "\\n")
    var rows = array.size(rowsArray)
    var cols = array.size(str.split(array.get(rowsArray, 0), " "))
    var matrix = matrix.new<float>(rows, cols, na)
    row = 0
    for rowString in rowsArray
        col = 0
        entries = str.split(rowString, " ")
        for val in entries
            matrix.set(matrix, row, col, str.tonumber(val))
            col += 1
        row += 1
    matrix
var m = matrixFromInputArea("1 2\\n3 4")
plot(matrix.avg(m) * 4 + m.get(1, 1), title="Result")
`)).toEqual([14, 14, 14]);
  });

  it('binds positional, named and mixed namespace arguments without shifting the value', () => {
    expect(values(`
matrix = matrix.new<float>(2, 2, 0)
other = matrix.new<float>(1, 1, 0)
matrix.set(matrix, 0, 0, 1)
matrix.set(id=matrix, row=0, column=1, value=2)
matrix.set(matrix, column=0, row=1, value=3)
matrix.set(other, 0, 0, 10)
matrix.set(1, 1, 4)
plot(matrix.avg(matrix) * 4 + matrix.get(other, 0, 0), title="Result")
`)).toEqual([20, 20, 20]);
  });

  it('preserves matrix receiver methods when the variable is named matrix', () => {
    expect(values(`
matrix = matrix.new<float>(1, 2, 0)
matrix.set(0, 1, 7)
matrix.set(row=0, column=0, value=3)
plot(matrix.avg() * 2, title="Result")
`)).toEqual([10, 10, 10]);
  });

  it('keeps explicit array and map namespace receivers in their argument lists', () => {
    expect(values(`
array = array.new<float>()
array.unshift(array, 2)
array.push(value=3)
map = map.new<string, float>()
map.put(map, "first", 5)
map.put(key="second", value=7)
plot(array.get(array, 0) + array.get(1) + map.get(map, "first") + map.get("second"), title="Result")
`)).toEqual([17, 17, 17]);
  });

  it('preserves binary collection receiver methods and named namespace receiver aliases', () => {
    expect(values(`
matrix = matrix.new<float>(1, 1, 2)
other = matrix.new<float>(1, 1, 3)
sum = matrix.sum(other)
sum2 = matrix.sum(matrix, other)
sum3 = matrix.sum(id=matrix, id2=other)
matrix.concat(other)
array = array.from(1.0)
otherArray = array.from(2.0)
array.concat(otherArray)
plot(matrix.avg(matrix) * 2 + sum.get(0, 0) + sum2.get(0, 0) + sum3.get(0, 0) + array.size(), title="Result")
`)).toEqual([22, 22, 22]);
  });
});
