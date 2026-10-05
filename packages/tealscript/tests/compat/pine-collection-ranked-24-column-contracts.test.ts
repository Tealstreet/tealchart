import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("Collection boundaries24")\n${body}`;
const errors = (body: string, options?: Parameters<typeof checkProgram>[1]) =>
  checkProgram(parse(source(body)), options).diagnostics.filter((d) => d.severity === 'error');

// Frozen Pine v6 matrix.add_col and matrix.sum parameter contracts.
describe('column insertion parameter boundaries', () => {
  for (const receiver of [false, true]) {
    const call = (index: string, values = 'array.from(11, 13)') =>
      receiver ? `m.add_col(${index}, ${values})` : `matrix.add_col(m, ${index}, ${values})`;
    for (const index of ['-1', '3']) {
      it(`${call(index)} refuses an out-of-bounds column`, () => {
        const result = runCompatScript(source(`m = matrix.new<int>(2, 2, 7)\n${call(index)}`));
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringMatching(/out of bounds|range/i),
            }),
          ]),
        );
      });
    }
    it(`${call('1', 'array.from(11)')} refuses a mismatched column height`, () => {
      const result = runCompatScript(source(`m = matrix.new<int>(2, 2, 7)\n${call('1', 'array.from(11)')}`));
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(/column length.*row count/i),
          }),
        ]),
      );
    });
    for (const [qualifier, index] of [
      ['const', '1'],
      ['input', 'input.int(1)'],
      ['simple', 'simpleIndex'],
      ['series', 'bar_index'],
    ]) {
      it(`${receiver ? 'method' : 'namespace'} accepts ${qualifier} int column`, () => {
        expect(errors(`simple int simpleIndex = 1\nm = matrix.new<int>(2, 2, 7)\n${call(index)}`)).toEqual([]);
      });
    }
    it(`${receiver ? 'method' : 'namespace'} refuses a scalar as the supplied column array`, () => {
      expect(errors(`m = matrix.new<int>(2, 2, 7)\n${call('1', 'true')}`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    });
  }
});

// Pine v6 matrix.add_col optional-array prose, settled by native CF018.
describe('explicit column index with an omitted array', () => {
  for (const receiver of [false, true]) {
    const call = receiver ? 'm.add_col(1)' : 'matrix.add_col(m, 1)';
    it(`${call} inserts missing values at the selected column`, () => {
      const result = runCompatScript(`//@version=6
indicator("Column default24")
m = matrix.new<int>(2, 2, 7)
${call}
plot(matrix.columns(m), title="Columns")
plot(na(matrix.get(m, 0, 1)) and na(matrix.get(m, 1, 1)) ? 1 : 0, title="Missing")
plot(matrix.get(m, 0, 0) + matrix.get(m, 1, 2), title="Preserved")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Columns').values).toEqual(Array(12).fill(3));
      expect(getPlot(result, 'Missing').values).toEqual(Array(12).fill(1));
      expect(getPlot(result, 'Preserved').values).toEqual(Array(12).fill(14));
    });
  }
});

describe('operand guards preserve eligible callable admission', () => {
  for (const member of ['add_col']) {
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
