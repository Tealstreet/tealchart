import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/arrays/#sorting';
const header = '//@version=6\nindicator("Transformed matrix UDT sort IDs")\ntype Number\n    float value\n';

describe('matrix transformations preserve missing UDT element provenance', () => {
  for (const operation of ['transpose', 'reverse', 'submatrix', 'concat', 'copy']) {
    it(`${operation} preserves UDT IDs through namespace/named/receiver row and column extraction`, () => {
      for (const size of [1, 2]) {
        for (const form of ['namespace', 'named', 'receiver']) {
          const transform = (type: string) => {
            if (operation === 'reverse') return `${form === 'receiver' ? 'm.reverse()' : `matrix.reverse(${form === 'named' ? 'id=' : ''}m)`}\nn = m`;
            if (operation === 'concat') {
              const other = `matrix.new<${type}>(1, ${size})`;
              return `n = ${form === 'receiver' ? `m.concat(${other})` : form === 'named' ? `matrix.concat(id2=${other}, id1=m)` : `matrix.concat(m, ${other})`}`;
            }
            if (operation === 'submatrix') return `n = ${form === 'receiver' ? `m.submatrix(0, ${size}, 0, ${size})` : form === 'named' ? `matrix.submatrix(to_column=${size}, from_column=0, to_row=${size}, from_row=0, id=m)` : `matrix.submatrix(m, 0, ${size}, 0, ${size})`}`;
            return `n = ${form === 'receiver' ? `m.${operation}()` : `matrix.${operation}(${form === 'named' ? 'id=' : ''}m)`}`;
          };
          for (const extraction of ['matrix.row(n, 0)', 'n.col(0)']) {
            for (const member of ['sort', 'sort_indices']) {
              for (const namespace of [true, false]) {
                const call = namespace ? `array.${member}(a)` : `a.${member}()`;
                const source = (type: string) => `${header}m = matrix.new<${type}>(${size}, ${size})\n${transform(type)}\na = ${extraction}\n${call}`;
                const discriminator = `${reference}; ${operation}; ${form}; ${size}; ${extraction}; ${call}`;
                expect(runCompatScript(source('float')).errors, discriminator).toEqual([]);
                const result = runCompatScript(source('Number'));
                expect(result.errors.some((error) => /Array.*(na|user-defined type)/i.test(error.message)), discriminator).toBe(true);
              }
            }
          }
        }
      }
    });
  }
});

describe('custom matrix methods retain their own returned element types', () => {
  for (const operation of ['transpose', 'copy', 'submatrix', 'concat']) {
    it(`${operation} custom methods distinguish numeric matrices from missing UDT IDs`, () => {
      const parameters = operation === 'concat' ? ', matrix<Number> other' : operation === 'submatrix' ? ', int fromRow, int toRow, int fromColumn, int toColumn' : '';
      const args = operation === 'concat' ? 'm' : operation === 'submatrix' ? '0, 1, 0, 1' : '';
      for (const returnType of ['float', 'Number']) {
        for (const member of ['sort', 'sort_indices']) {
          const result = runCompatScript(`${header}method ${operation}(matrix<Number> receiver${parameters}) => matrix.new<${returnType}>(1, 1)\nm = matrix.new<Number>(1, 1)\nn = m.${operation}(${args})\na = n.row(0)\na.${member}()`);
          if (returnType === 'float') expect(result.errors, `${operation}; ${member}; numeric custom return`).toEqual([]);
          else expect(result.errors.some((error) => /Array.*(na|user-defined type)/i.test(error.message)), `${operation}; ${member}; UDT custom return`).toBe(true);
        }
      }
    });
  }
});
