import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const header = `//@version=6
indicator("Collection counts and removal")
type Point
    int score
`;
const cases = [
  { kind: 'int', values: ['17', '-31', '5', '90', '-8', '41'], numbers: [17, -31, 5, 90, -8, 41], replacement: '999' },
  {
    kind: 'float',
    values: ['17.5', '-31.5', '5.5', '90.5', '-8.5', '41.5'],
    numbers: [17.5, -31.5, 5.5, 90.5, -8.5, 41.5],
    replacement: '999.5',
  },
  {
    kind: 'string',
    values: ['"a"', '"bb"', '"ccc"', '"dddd"', '"eeeee"', '"ffffff"'],
    numbers: [1, 2, 3, 4, 5, 6],
    replacement: '"changed"',
  },
  {
    kind: 'bool',
    values: ['true', 'false', 'true', 'false', 'true', 'true'],
    numbers: [1, 0, 1, 0, 1, 1],
    replacement: 'true',
  },
  {
    kind: 'Point',
    values: ['Point.new(17)', 'Point.new(-31)', 'Point.new(5)', 'Point.new(90)', 'Point.new(-8)', 'Point.new(41)'],
    numbers: [17, -31, 5, 90, -8, 41],
    replacement: 'Point.new(999)',
  },
] as const;

function asNumber(kind: string, expression: string): string {
  if (kind === 'string') return `str.length(${expression})`;
  if (kind === 'bool') return `(${expression} ? 1 : 0)`;
  if (kind === 'Point') return `${expression}.score`;
  return expression;
}

function gridSource(kind: string, values: readonly string[]): string {
  return `${values.map((value, index) => `value${index} = ${value}`).join('\n')}
grid = matrix.new<${kind}>(2, 3)
${values.map((_value, index) => `grid.set(${Math.floor(index / 3)}, ${index % 3}, value${index})`).join('\n')}
`;
}

function assertPlots(source: string, expected: Record<string, number | number[]>): void {
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  for (const [title, value] of Object.entries(expected)) {
    expect(getPlot(result, title).values, title).toEqual(
      Array.isArray(value) ? value : compatibilityBars.map(() => value),
    );
  }
}

describe('collection counts extrema and removal', () => {
  for (const form of ['namespace', 'method'] as const) {
    describe(form, () => {
      for (const item of cases.filter((item) => item.kind !== 'string')) {
        it(`counts pairs independently of ${item.kind} values`, () => {
          const size = form === 'namespace' ? 'map.size(id=pairs)' : 'pairs.size()';
          assertPlots(
            `${header}
pairs = map.new<string, ${item.kind}>()
plot(${size}, "empty")
pairs.put("first", ${item.values[0]})
plot(${size}, "one")
pairs.put("second", ${item.values[1]})
plot(${size}, "two")
pairs.put("first", ${item.values[2]})
plot(${size}, "replaced")
pairs.remove("second")
plot(${size}, "removed")
pairs.clear()
plot(${size}, "cleared")
`,
            { empty: 0, one: 1, two: 2, replaced: 2, removed: 1, cleared: 0 },
          );
        });
      }

      for (const item of cases.slice(0, 2)) {
        for (const operation of ['min', 'max'] as const) {
          it(`selects the ${operation}imum ${item.kind} cell without changing the matrix`, () => {
            const call = form === 'namespace' ? `matrix.${operation}(id=grid)` : `grid.${operation}()`;
            const retained = item.values
              .map((_value, index) => `plot(grid.get(${Math.floor(index / 3)}, ${index % 3}), "cell${index}")`)
              .join('\n');
            const expected = {
              result: operation === 'min' ? item.numbers[1] : item.numbers[3],
              ...Object.fromEntries(item.numbers.map((value, index) => [`cell${index}`, value])),
            };
            assertPlots(
              `${header}${gridSource(item.kind, item.values)}
selected = ${call}
plot(selected, "result")
${retained}
`,
              expected,
            );
          });
        }
      }

      for (const item of cases) {
        for (const axis of ['col', 'row'] as const) {
          it(`removes a ${item.kind} ${axis} and returns its ordered elements`, () => {
            const parameter = axis === 'col' ? 'column' : 'row';
            const call =
              form === 'namespace'
                ? `matrix.remove_${axis}(id=grid, ${parameter}=1)`
                : `grid.remove_${axis}(${parameter}=1)`;
            const removedIndices = axis === 'col' ? [1, 4] : [3, 4, 5];
            const retainedIndices = axis === 'col' ? [0, 2, 3, 5] : [0, 1, 2];
            const rows = axis === 'col' ? 2 : 1;
            const columns = axis === 'col' ? 2 : 3;
            const expected = {
              rows,
              columns,
              length: removedIndices.length,
              ...Object.fromEntries(removedIndices.map((index, offset) => [`removed${offset}`, item.numbers[index]])),
              ...Object.fromEntries(retainedIndices.map((index, offset) => [`retained${offset}`, item.numbers[index]])),
            };
            const removedPlots = removedIndices
              .map(
                (_index, offset) =>
                  `element${offset} = removed.get(${offset})\nplot(${asNumber(item.kind, `element${offset}`)}, "removed${offset}")`,
              )
              .join('\n');
            const retainedPlots = retainedIndices
              .map(
                (_index, offset) =>
                  `retained${offset} = grid.get(${Math.floor(offset / columns)}, ${offset % columns})\nplot(${asNumber(item.kind, `retained${offset}`)}, "retained${offset}")`,
              )
              .join('\n');
            const alias =
              item.kind === 'Point'
                ? `element0.score := 999\nplot(value${removedIndices[0]}.score, "shared_element")`
                : '';
            const source = `${header}${gridSource(item.kind, item.values)}
removed = ${call}
plot(grid.rows(), "rows")
plot(grid.columns(), "columns")
plot(removed.size(), "length")
${removedPlots}
${alias}
removed.set(0, ${item.replacement})
${retainedPlots}
`;
            const type = checkProgram(parse(source)).symbols.find((symbol) => symbol.name === 'removed')?.type;
            expect(type).toMatchObject({
              kind: 'array',
              qualifier: 'series',
              elementType: item.kind === 'Point' ? { kind: 'udt', name: 'Point' } : { kind: item.kind },
            });
            assertPlots(source, item.kind === 'Point' ? { ...expected, shared_element: 999 } : expected);
          });
        }
      }

      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`removes an explicitly selected ${qualifier} column`, () => {
          const selector =
            qualifier === 'const'
              ? 'selected = 1'
              : qualifier === 'input'
                ? 'selected = input.int(1)'
                : qualifier === 'simple'
                  ? 'simple int selected = 1'
                  : 'selected = bar_index % 3';
          const selected = compatibilityBars.map((_bar, index) => (qualifier === 'series' ? index % 3 : 1));
          const call =
            form === 'namespace' ? 'matrix.remove_col(id=grid, column=selected)' : 'grid.remove_col(column=selected)';
          const expected = {
            removed0: selected.map((index) => [17, -31, 5][index]),
            removed1: selected.map((index) => [90, -8, 41][index]),
            columns: 2,
          };
          assertPlots(
            `${header}${gridSource('int', cases[0].values)}
${selector}
removed = ${call}
plot(removed.get(0), "removed0")
plot(removed.get(1), "removed1")
plot(grid.columns(), "columns")
`,
            expected,
          );
        });
      }
    });
  }

  it.each([
    ['map.size', ''],
    ['matrix.min', ''],
    ['matrix.max', ''],
    ['matrix.remove_col', 'column=1'],
    ['matrix.remove_row', 'row=1'],
  ])('%s requires its collection ID', (member, tail) => {
    expect(checkProgram(parse(`${header}result = ${member}(${tail})`)).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'argument-count' })]),
    );
  });
});
