import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic';

// Frozen Pine v6 reference: binary_search_{leftmost,rightmost} returns series int;
// matrix.fill uses inclusive starts, exclusive ends and omitted matrix dimensions.
// The algorithm remarks and conflicting string-target lists are separate claims.
const bars = [0, 1, 2].map((index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 100,
}));
const forms = ['namespace', 'receiver'] as const;
const searches = ['binary_search_leftmost', 'binary_search_rightmost'] as const;
const qualifiers = ['const', 'input', 'simple', 'series'] as const;

function source(body: string): string {
  return `//@version=6\nindicator("Collection ranked 21")\n${body}`;
}

function run(body: string) {
  const program = parse(source(body));
  const checked = checkProgram(program);
  expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(program, bars);
  expect(result.errors).toEqual([]);
  return { checked, result };
}

function refuse(body: string, code: string) {
  const checked = checkProgram(parse(source(body)));
  expect(checked.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && diagnostic.code === code)).toBe(
    true,
  );
}

function searchCall(form: (typeof forms)[number], operation: string, args: string): string {
  return form === 'namespace' ? `array.${operation}(id=values, ${args})` : `values.${operation}(${args})`;
}

function fillCall(form: (typeof forms)[number], args: string): string {
  return form === 'namespace' ? `matrix.fill(id=m, ${args})` : `m.fill(${args})`;
}

function matrixSetup(): string {
  return `m = matrix.new<float>(3, 4, 0.5)
for row = 0 to 2
    for column = 0 to 3
        matrix.set(m, row, column, row * 4 + column + 10.5)`;
}

function matrixPlots(): string {
  return Array.from({ length: 12 }, (_, index) => `plot(matrix.get(m, ${Math.floor(index / 4)}, ${index % 4}))`).join(
    '\n',
  );
}

function expectedFill(fromRow: number[], toRow: number[], fromColumn: number[], toColumn: number[], values: number[]) {
  return Array.from({ length: 12 }, (_, index) =>
    bars.map((_, bar) => {
      const row = Math.floor(index / 4);
      const column = index % 4;
      return row >= fromRow[bar]! && row < toRow[bar]! && column >= fromColumn[bar]! && column < toColumn[bar]!
        ? values[bar]!
        : index + 10.5;
    }),
  );
}

describe('Collection ranked 21: selected numeric binary searches', () => {
  for (const operation of searches)
    for (const form of forms)
      for (const kind of ['int', 'float']) {
        it(`${operation} ${form} ${kind} accepts four target qualifiers and returns series int`, () => {
          const suffix = kind === 'float' ? '.0' : '';
          const declarations = [
            `const ${kind} target_const = 3${suffix}`,
            `target_input = input.${kind}(5${suffix})`,
            `simple ${kind} target_simple = 7${suffix}`,
            `series ${kind} target_series = bar_index == 0 ? 1${suffix} : 5${suffix}`,
          ];
          const body = [
            `values = array.from(1${suffix}, 3${suffix}, 5${suffix}, 7${suffix})`,
            ...declarations,
            ...qualifiers.flatMap((qualifier) => [
              `found_${qualifier} = ${searchCall(form, operation, `val=target_${qualifier}`)}`,
              `plot(found_${qualifier})`,
            ]),
          ].join('\n');
          const { checked, result } = run(body);
          expect(result.plots.map((plot) => plot.values)).toEqual([
            [1, 1, 1],
            [2, 2, 2],
            [3, 3, 3],
            [0, 2, 2],
          ]);
          for (const qualifier of qualifiers) {
            expect(checked.symbols.find((symbol) => symbol.name === `found_${qualifier}`)?.type).toEqual({
              kind: 'int',
              qualifier: 'series',
            });
          }
        });
      }

  for (const operation of searches)
    for (const form of forms)
      for (const selector of ['"score"', '1']) {
        it(`${operation} ${form} uses UDT numeric field ${selector} and returns series int`, () => {
          const { checked, result } = run(`type Ranked
    int distracting
    float score
values = array.from(Ranked.new(100, 1.0), Ranked.new(90, 3.0), Ranked.new(80, 5.0), Ranked.new(70, 7.0))
found = ${searchCall(form, operation, `sort_field=${selector}, val=5.0`)}
plot(found)`);
          expect(result.plots[0]!.values).toEqual([2, 2, 2]);
          expect(checked.symbols.find((symbol) => symbol.name === 'found')?.type).toEqual({
            kind: 'int',
            qualifier: 'series',
          });
        });
      }

  for (const operation of searches)
    for (const form of forms) {
      it(`${operation} ${form} requires val`, () => {
        refuse(
          `values = array.from(1, 3, 5)\n${form === 'namespace' ? `array.${operation}(id=values)` : `values.${operation}()`}`,
          'argument-count',
        );
      });
    }
});

describe('Collection ranked 21: matrix fill rectangles and defaults', () => {
  const rectangles = [
    { name: 'whole matrix', args: '', rows: [0, 3], columns: [0, 4] },
    { name: 'omitted row end', args: ', from_row=1', rows: [1, 3], columns: [0, 4] },
    { name: 'omitted row start', args: ', to_row=2', rows: [0, 2], columns: [0, 4] },
    { name: 'omitted column end', args: ', from_column=2', rows: [0, 3], columns: [2, 4] },
    { name: 'omitted column start', args: ', to_column=3', rows: [0, 3], columns: [0, 3] },
    {
      name: 'asymmetric rectangle',
      args: ', to_column=2, from_row=1, from_column=0, to_row=3',
      rows: [1, 3],
      columns: [0, 2],
    },
  ];
  for (const form of forms)
    for (const rectangle of rectangles) {
      it(`${form} fills ${rectangle.name} with exclusive ends`, () => {
        const { result } = run(`${matrixSetup()}\n${fillCall(form, `value=7.5${rectangle.args}`)}\n${matrixPlots()}`);
        expect(result.plots.map((plot) => plot.values)).toEqual(
          expectedFill(
            bars.map(() => rectangle.rows[0]!),
            bars.map(() => rectangle.rows[1]!),
            bars.map(() => rectangle.columns[0]!),
            bars.map(() => rectangle.columns[1]!),
            bars.map(() => 7.5),
          ),
        );
      });
    }

  // https://www.tradingview.com/pine-script-docs/language/matrices/#error-handling
  // Every from_* bound must be strictly less than its corresponding to_* bound.
  for (const form of forms) {
    it(`${form} refuses empty width before continuing`, () => {
      const program = parse(
        source(`${matrixSetup()}
plot(matrix.get(m, 0, 0), "Before")
${fillCall(form, 'value=7.5, from_column=2, to_column=2')}
plot(matrix.get(m, 0, 0), "After")`),
      );
      const checked = checkProgram(program);
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(program, bars.slice(0, 1));
      expect(result.errors).toEqual([
        expect.objectContaining({
          message: 'Matrix fill range must have from_row/column less than to_row/column',
        }),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Before')?.values).toEqual([10.5]);
      expect(result.plots.some((plot) => plot.title === 'After')).toBe(false);
    });
  }

  for (const form of forms)
    for (const qualifier of qualifiers) {
      it(`${form} accepts ${qualifier} coordinates and matching float value`, () => {
        let declarations: string;
        if (qualifier === 'input') {
          declarations =
            'rs = input.int(1)\nre = input.int(3)\ncs = input.int(0)\nce = input.int(2)\nv = input.float(7.5)';
        } else if (qualifier === 'series') {
          declarations =
            'series int rs = bar_index % 2\nseries int re = rs + 1\nseries int cs = 2\nseries int ce = 4\nseries float v = bar_index + 7.5';
        } else {
          declarations = `${qualifier} int rs = 1\n${qualifier} int re = 3\n${qualifier} int cs = 0\n${qualifier} int ce = 2\n${qualifier} float v = 7.5`;
        }
        const { result } = run(
          `${matrixSetup()}\n${declarations}\n${fillCall(form, 'to_column=ce, value=v, from_row=rs, from_column=cs, to_row=re')}\n${matrixPlots()}`,
        );
        const dynamic = qualifier === 'series';
        expect(result.plots.map((plot) => plot.values)).toEqual(
          expectedFill(
            dynamic ? [0, 1, 0] : [1, 1, 1],
            dynamic ? [1, 2, 1] : [3, 3, 3],
            dynamic ? [2, 2, 2] : [0, 0, 0],
            dynamic ? [4, 4, 4] : [2, 2, 2],
            dynamic ? [7.5, 8.5, 9.5] : [7.5, 7.5, 7.5],
          ),
        );
      });
    }

  for (const form of forms) {
    it(`${form} fill returns void and cannot initialize a value`, () => {
      refuse(`m = matrix.new<float>(2, 3, 0.5)\nvalue = ${fillCall(form, 'value=7.5')}`, 'type-mismatch');
    });
    it(`${form} fill requires value`, () => {
      refuse(
        `m = matrix.new<float>(2, 3, 0.5)\n${form === 'namespace' ? 'matrix.fill(id=m)' : 'm.fill()'}`,
        'argument-count',
      );
    });
    for (const invalid of ['"wrong"', 'true']) {
      it(`${form} float fill rejects incompatible value ${invalid}`, () => {
        refuse(`m = matrix.new<float>(2, 3, 0.5)\n${fillCall(form, `value=${invalid}`)}`, 'type-mismatch');
      });
    }
  }
});

describe('Collection ranked 21: definite namespace container kinds', () => {
  for (const operation of searches)
    for (const invalid of ['17', 'matrix.new<int>(1, 2, 0)'])
      for (const named of [false, true]) {
        it(`${operation} rejects ${invalid} container, named=${named}`, () => {
          const args = named ? 'val=3, id=wrong' : 'wrong, 3';
          refuse(`wrong = ${invalid}\nfound = array.${operation}(${args})`, 'type-mismatch');
        });
      }
  for (const invalid of ['17', 'array.from(1, 3, 5)'])
    for (const named of [false, true]) {
      it(`matrix.fill rejects ${invalid} container, named=${named}`, () => {
        const args = named ? 'value=7.5, id=wrong' : 'wrong, 7.5';
        refuse(`wrong = ${invalid}\nmatrix.fill(${args})`, 'type-mismatch');
      });
    }
});
