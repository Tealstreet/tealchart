import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("Collection boundaries24")\n${body}`;
const errors = (body: string, options?: Parameters<typeof checkProgram>[1]) =>
  checkProgram(parse(source(body)), options).diagnostics.filter((d) => d.severity === 'error');

describe('matrix sum rejects nonnumeric values', () => {
  for (const receiver of [false, true]) {
    for (const kind of ['bool', 'string', 'color']) {
      const call = receiver ? 'm.sum(n)' : 'matrix.sum(m, n)';
      it(`${call} refuses matrix<${kind}> id1`, () => {
        expect(errors(`m = matrix.new<${kind}>(1, 1)\nn = 1\nvalue = ${call}`)).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
        );
      });
      it(`${call} refuses matrix<${kind}> id2`, () => {
        expect(errors(`m = matrix.new<int>(1, 1, 7)\nn = matrix.new<${kind}>(1, 1)\nvalue = ${call}`)).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
        );
      });
    }
  }
});
// Frozen v6 matrix.sum numeric overloads; half-integer sums are exact.
describe('numeric matrix sum operand qualifiers', () => {
  for (const receiver of [false, true]) {
    for (const kind of ['int', 'float']) {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        const value = kind === 'int' ? '3' : '3.5';
        const operand =
          qualifier === 'input'
            ? `input.${kind}(${value})`
            : qualifier === 'simple'
              ? 'simpleValue'
              : qualifier === 'series'
                ? kind === 'int'
                  ? 'bar_index'
                  : 'close'
                : value;
        const call = receiver ? `left.sum(${operand})` : `matrix.sum(left, ${operand})`;
        it(`${call} accepts a ${qualifier} ${kind} scalar`, () => {
          const result = checkProgram(
            parse(
              `//@version=6\nindicator("Numeric qualifiers24")\nsimple ${kind} simpleValue = ${value}\nleft = matrix.new<${kind}>(1, 1, 7)\nresult = ${call}`,
            ),
          );
          expect(result.diagnostics).toEqual([]);
          expect(result.symbols.find((s) => s.name === 'result')?.type).toMatchObject({
            kind: 'matrix',
            qualifier: 'series',
            elementType: { kind },
          });
        });
      }
    }
    for (const otherMatrix of [false, true]) {
      const call = receiver ? 'left.sum(right)' : 'matrix.sum(left, right)';
      it(`${call} preserves a fractional float ${otherMatrix ? 'matrix' : 'scalar'} sum`, () => {
        const right = otherMatrix ? 'matrix.new<float>(1, 1, 3.5)' : '3.5';
        const result = runCompatScript(
          `//@version=6\nindicator("Fractional float sum24")\nleft = matrix.new<float>(1, 1, 5.0)\nright = ${right}\ntotal = ${call}\nplot(matrix.get(total, 0, 0), title="Total")`,
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Total').values).toEqual(Array(12).fill(8.5));
      });
    }
  }
});

describe('operand guards preserve eligible callable admission', () => {
  for (const member of ['sum']) {
    const params = member === 'sum' ? 'string rhs' : 'int column, bool flag';
    const result = member === 'sum' ? 'matrix.rows(self) + str.length(rhs)' : 'flag ? matrix.rows(self) + column : 0';
    const args = member === 'sum' ? '"accepted"' : '0, true';
    it(`${member} preserves an eligible local method`, () => {
      expect(
        errors(
          `method ${member}(matrix<int> self, ${params}) => ${result}\nm = matrix.new<int>(1, 1, 7)\nm.${member}(${args})`,
        ),
      ).toEqual([]);
    });
    it(`${member} preserves an imported namespace callable`, () => {
      const library = parse(
        `//@version=6\nlibrary("OperandControls")\nexport ${member}(matrix<int> self, ${params}) => ${result}`,
      );
      expect(
        errors(`import Example/OperandControls/1 as matrix\nmatrix<int> m = na\nmatrix.${member}(m, ${args})`, {
          libraries: new Map([['Example/OperandControls/1', library]]),
        }),
      ).toEqual([]);
    });
  }
});
