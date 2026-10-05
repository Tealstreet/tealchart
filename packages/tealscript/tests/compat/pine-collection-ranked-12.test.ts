import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

const bars = compatibilityBars.slice(0, 3);

function run(source: string) {
  const ast = parse(`//@version=6\nindicator("Collection contracts")\n${source}`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result;
}

const percentages = [
  ['const int', 'const int percentage = 50', false],
  ['input int', 'percentage = input.int(50)', false],
  ['simple int', 'simple int percentage = 50', false],
  ['series int', 'series int percentage = 50 + bar_index * 25', true],
  ['const float', 'const float percentage = 50.5', false],
  ['input float', 'percentage = input.float(50.5)', false],
  ['simple float', 'simple float percentage = 50.5', false],
  ['series float', 'series float percentage = 50.5 + bar_index * 24.75', true],
] as const;

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[509] percentage; methods[97,98] descriptions, empty remarks and percentage.
describe('collection ranks441–449: nearest-rank percentage and receiver', () => {
  for (const [type, receiver] of [
    ['int', false],
    ['int', true],
    ['float', true],
  ] as const) {
    it.each(percentages)(
      `${type} ${receiver ? 'method' : 'namespace'} accepts %s percentage`,
      (name, declaration, changes) => {
        const values = type === 'int' ? '9, 1, 6, 4' : '9.5, 1.5, 6.5, 4.5';
        const call = receiver
          ? 'values.percentile_nearest_rank(percentage=percentage)'
          : 'array.percentile_nearest_rank(id=values, percentage=percentage)';
        const result = run(
          `${declaration}\nvalues = array.from(${values})\nselected = ${call}\nplot(selected, title="Selected")`,
        );
        const middle = type === 'int' ? 4 : 4.5;
        const upper = type === 'int' ? 6 : 6.5;
        const maximum = type === 'int' ? 9 : 9.5;
        const expected = name.includes('float')
          ? [upper, changes ? maximum : upper, changes ? maximum : upper]
          : [middle, changes ? upper : middle, changes ? maximum : middle];
        expect(getPlot(result, 'Selected').values).toEqual(expected);
      },
    );
  }

  it.each(['int', 'float'] as const)('empty %s method returns na', (type) => {
    const result = run(`values = array.new<${type}>()\nplot(na(values.percentile_nearest_rank(50)), title="Missing")`);
    expect(getPlot(result, 'Missing').values).toEqual([true, true, true]);
  });
});

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[604,605] and methods[185,186]: id1 is subtracted from; id2 is subtracted; result is new.
describe('collection ranks450–464: matrix subtraction', () => {
  for (const type of ['int', 'float'] as const) {
    for (const receiver of [false, true]) {
      it.each(['matrix', 'scalar'] as const)(
        `${type} ${receiver ? 'method' : 'namespace'} subtracts %s into an independent result`,
        (operand) => {
          const fraction = type === 'float' ? '.5' : '';
          const rightFraction = type === 'float' ? '.25' : '';
          const other = operand === 'matrix' ? 'right' : `3${rightFraction}`;
          const call = receiver ? `left.diff(id2=${other})` : `matrix.diff(id1=left, id2=${other})`;
          const result = run(`left = matrix.new<${type}>(2, 2, 0)
right = matrix.new<${type}>(2, 2, 0)
matrix.set(left, 0, 0, 9${fraction})
matrix.set(left, 0, 1, 4${fraction})
matrix.set(left, 1, 0, -2${fraction})
matrix.set(left, 1, 1, 7${fraction})
matrix.set(right, 0, 0, 3${rightFraction})
matrix.set(right, 0, 1, 8${rightFraction})
matrix.set(right, 1, 0, 1${rightFraction})
matrix.set(right, 1, 1, -1${rightFraction})
answer = ${call}
plot(matrix.get(answer, 0, 0), title="00")
plot(matrix.get(answer, 0, 1), title="01")
plot(matrix.get(answer, 1, 0), title="10")
plot(matrix.get(answer, 1, 1), title="11")
matrix.set(answer, 0, 0, 91)
plot(matrix.get(left, 0, 0), title="Left")
plot(matrix.get(right, 0, 0), title="Right")`);
          const expected =
            type === 'float'
              ? operand === 'matrix'
                ? [6.25, -3.75, -3.75, 8.75]
                : [6.25, 1.25, -5.75, 4.25]
              : operand === 'matrix'
                ? [6, -4, -3, 8]
                : [6, 1, -5, 4];
          for (const [index, title] of ['00', '01', '10', '11'].entries()) {
            expect(getPlot(result, title).values).toEqual(Array(3).fill(expected[index]));
          }
          expect(getPlot(result, 'Left').values).toEqual(Array(3).fill(type === 'float' ? 9.5 : 9));
          expect(getPlot(result, 'Right').values).toEqual(Array(3).fill(type === 'float' ? 3.25 : 3));
        },
      );
    }
  }
});

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[623,624], methods[204,205]: matrix self-product and required integer power.
describe('collection ranks465–479: matrix power', () => {
  for (const type of ['int', 'float'] as const) {
    for (const receiver of [false, true]) {
      it.each([2, 3])(`${type} ${receiver ? 'method' : 'namespace'} computes power %s`, (power) => {
        const call = receiver ? `source.pow(power=${power})` : `matrix.pow(id=source, power=${power})`;
        const initial = type === 'float' ? '0.5' : '1';
        const result = run(`source = matrix.new<${type}>(2, 2, 0)
matrix.set(source, 0, 0, ${initial})
matrix.set(source, 0, 1, 2)
matrix.set(source, 1, 0, 3)
matrix.set(source, 1, 1, 4)
answer = ${call}
plot(matrix.get(answer, 0, 0), title="00")
plot(matrix.get(answer, 0, 1), title="01")
plot(matrix.get(answer, 1, 0), title="10")
plot(matrix.get(answer, 1, 1), title="11")
plot(matrix.get(source, 0, 0), title="Source")`);
        const expected =
          type === 'int'
            ? power === 2
              ? [7, 10, 15, 22]
              : [37, 54, 81, 118]
            : power === 2
              ? [6.25, 9, 13.5, 22]
              : [30.125, 48.5, 72.75, 115];
        for (const [index, title] of ['00', '01', '10', '11'].entries()) {
          expect(getPlot(result, title).values).toEqual(Array(3).fill(expected[index]));
        }
        expect(getPlot(result, 'Source').values).toEqual(Array(3).fill(type === 'float' ? 0.5 : 1));
      });
    }
  }
});

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json functions[465].
it('collection rank480: label array IDs store label handles independently', () => {
  const result = run(`first = array.new_label()
second = array.new_label()
item = label.new(bar_index + 23, close, "Stored")
array.push(first, item)
plot(array.size(first), title="First size")
plot(array.size(second), title="Second size")
stored = array.get(first, 0)
plot(label.get_x(stored), title="Stored x")`);
  expect(getPlot(result, 'First size').values).toEqual([1, 1, 1]);
  expect(getPlot(result, 'Second size').values).toEqual([0, 0, 0]);
  expect(getPlot(result, 'Stored x').values).toEqual([23, 24, 25]);
});
