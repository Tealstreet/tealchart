import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

type ElementKind = 'int' | 'float';
type Operation = 'avg' | 'mode' | 'rank' | 'trace';
type CallStyle = 'namespace named' | 'namespace positional' | 'receiver';

const kinds: ElementKind[] = ['int', 'float'];
const operations: Operation[] = ['avg', 'mode', 'rank', 'trace'];
const styles: CallStyle[] = ['namespace named', 'namespace positional', 'receiver'];

function call(operation: Operation, style: CallStyle): string {
  if (style === 'receiver') return `m.${operation}()`;
  return `matrix.${operation}(${style === 'namespace named' ? 'id=' : ''}m)`;
}

function matrixSource(kind: ElementKind, columns: number, values: Array<number | null>): string {
  return [
    `m = matrix.new<${kind}>(${values.length / columns}, ${columns}, na)`,
    ...values.map(
      (value, index) =>
        `matrix.set(m, ${Math.floor(index / columns)}, ${index % columns}, ${value === null ? 'na' : kind === 'float' && Number.isInteger(value) ? `${value}.0` : value})`,
    ),
  ].join('\n');
}

describe('collection ranks 1041–1080: selected matrix scalar contracts', () => {
  for (const kind of kinds) {
    for (const style of styles) {
      for (const operation of operations) {
        it(`${operation} ${kind} ${style} result has its documented scalar kind and series qualifier`, () => {
          const source = `//@version=6
indicator("Matrix scalar type")
m = matrix.new<${kind}>(2, 2, ${kind === 'int' ? '1' : '1.0'})
value = ${call(operation, style)}
plot(value)`;
          const result = checkProgram(parse(source));
          expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
          expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({
            kind: operation === 'rank' ? 'int' : kind,
            qualifier: 'series',
          });
        });
      }

      const cases: Array<{
        operation: Operation;
        facet: string;
        columns: number;
        values: Array<number | null>;
        expected: number;
      }> = [
        {
          operation: 'avg',
          facet: 'all six entries',
          columns: 3,
          values: kind === 'int' ? [-4, 2, 8, 10, -2, 4] : [-3.5, 2.5, 9.5, 11.5, -2.5, 3.5],
          expected: kind === 'int' ? 3 : 3.5,
        },
        {
          operation: 'mode',
          facet: 'unique winner distinct from extrema',
          columns: 4,
          values: kind === 'int' ? [7, 1, 7, 2, 7, 3, 19, 4] : [7.5, -1.5, 7.5, 2.5, 7.5, 3.5, 19.5, 4.5],
          expected: kind === 'int' ? 7 : 7.5,
        },
        {
          operation: 'mode',
          facet: 'ignores a majority of missing entries',
          columns: 4,
          values:
            kind === 'int' ? [7, null, 7, null, 7, null, null, null] : [7.5, null, 7.5, null, 7.5, null, null, null],
          expected: kind === 'int' ? 7 : 7.5,
        },
        {
          operation: 'rank',
          facet: 'rectangular independent rows',
          columns: 3,
          values: [1, 0, 2, 0, 1, 3],
          expected: 2,
        },
        {
          operation: 'rank',
          facet: 'three independent triangular rows',
          columns: 3,
          values: [2, 7, -3, 0, -4, 5, 0, 0, 9],
          expected: 3,
        },
        {
          operation: 'rank',
          facet: 'dependent rows with a zero leading column',
          columns: 3,
          values: [0, 2, 4, 0, -1, -2, 0, 3, 6],
          expected: 1,
        },
        { operation: 'rank', facet: 'pivot row swap', columns: 2, values: [0, 2, 3, 4], expected: 2 },
        { operation: 'rank', facet: 'zero matrix', columns: 3, values: [0, 0, 0, 0, 0, 0], expected: 0 },
        {
          operation: 'trace',
          facet: 'all three diagonal entries only',
          columns: 3,
          values:
            kind === 'int'
              ? [4, 71, 83, -91, -2, 97, 101, -103, 9]
              : [4.5, 71.5, 83.5, -91.5, -2.25, 97.5, 101.5, -103.5, 9.75],
          expected: kind === 'int' ? 11 : 12,
        },
        {
          operation: 'trace',
          facet: 'singleton diagonal',
          columns: 1,
          values: kind === 'int' ? [-7] : [-7.5],
          expected: kind === 'int' ? -7 : -7.5,
        },
      ];
      for (const { operation, facet, columns, values, expected } of cases) {
        it(`${operation} ${kind} ${style}: ${facet}`, () => {
          const source = `//@version=6
indicator("Matrix scalar values")
${matrixSource(kind, columns, values)}
plot(${call(operation, style)}, "value")`;
          const result = runCompatScript(source);
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'value').values).toEqual(Array(12).fill(expected));
        });
      }
    }
  }
});
