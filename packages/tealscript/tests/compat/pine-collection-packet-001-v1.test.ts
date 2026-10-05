import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'Archived Pine v6 reference, audit v13 packet 001, ranks 39–147';
const header = '//@version=6\nindicator("Collection packet 001")\n';
const check = (source: string) => checkProgram(parse(header + source));
const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const record = 'type Record\n    int score';
const kinds = [
  { kind: 'bool', type: 'bool', source: 'first = false\nsecondValue = true', wrong: '17' },
  { kind: 'string', type: 'string', source: 'first = "first"\nsecondValue = "secondValue"', wrong: '17' },
  { kind: 'color', type: 'color', source: 'first = color.red\nsecondValue = color.blue', wrong: '"wrong"' },
  { kind: 'udt', type: 'Record', source: `${record}\nfirst = Record.new(17)\nsecondValue = Record.new(-8)`, wrong: '17' },
  {
    kind: 'label',
    type: 'label',
    source: 'first = label.new(0, 17, "first")\nsecondValue = label.new(1, -8, "secondValue")',
    wrong: '17',
  },
  {
    kind: 'line',
    type: 'line',
    source: 'first = line.new(0, 17, 1, -8)\nsecondValue = line.new(1, -8, 2, 43)',
    wrong: '17',
  },
  { kind: 'box', type: 'box', source: 'first = box.new(0, 17, 1, -8)\nsecondValue = box.new(1, 43, 2, 5)', wrong: '17' },
  {
    kind: 'table',
    type: 'table',
    source: 'first = table.new(position.top_left, 1, 1)\nsecondValue = table.new(position.bottom_left, 1, 1)',
    wrong: '17',
  },
  {
    kind: 'linefill',
    type: 'linefill',
    source:
      'left = line.new(0, 17, 1, -8)\nright = line.new(1, 43, 2, 5)\nthird = line.new(2, 71, 3, -31)\nfirst = linefill.new(left, right, color.red)\nsecondValue = linefill.new(right, third, color.blue)',
    wrong: '17',
  },
  {
    kind: 'chart.point',
    type: 'chart.point',
    source: 'first = chart.point.from_index(0, 17)\nsecondValue = chart.point.from_index(1, -8)',
    wrong: '17',
  },
  {
    kind: 'polyline',
    type: 'polyline',
    source:
      'points = array.from(chart.point.from_index(0, 17), chart.point.from_index(1, -8))\nfirst = polyline.new(points)\nsecondValue = polyline.new(points)',
    wrong: '17',
  },
];

function assertType(source: string, symbol: string, kind: string, elementKind?: string) {
  const result = check(source);
  expect(result.diagnostics, reference).toEqual([]);
  const type = result.symbols.find((entry) => entry.name === symbol)?.type;
  expect(type?.kind, reference).toBe(kind);
  if (kind === 'array' || kind === 'matrix') expect(type?.qualifier, reference).toBe('series');
  if (elementKind) {
    expect(type?.elementType?.kind, reference).toBe(elementKind);
    if (elementKind === 'udt') expect(type?.elementType?.name, reference).toBe('Record');
  }
}

function assertValues(source: string, expressions: string[], expected: (number | null | number[])[]) {
  const plots = expressions.map((expression, index) => `plot(${expression}, title="p${index}")`).join('\n');
  const result = runCompatScript(header + source + '\n' + plots);
  expect(result.errors, `${reference}; ${JSON.stringify(result.errors)}`).toEqual([]);
  expect(result.profile.swallowedErrors ?? [], reference).toEqual([]);
  for (const [index, value] of expected.entries()) {
    expect(getPlot(result, `p${index}`).values, reference).toEqual(
      Array.isArray(value) ? value : compatibilityBars.map(() => value),
    );
  }
}

function scalarSeed(qualifier: (typeof qualifiers)[number], kind: 'int' | 'float', name: string) {
  const value = kind === 'int' ? '17' : '2.5';
  if (qualifier === 'input') return `${name} = input.${kind}(${value})`;
  return `${qualifier} ${kind} ${name} = ${qualifier === 'series' ? `bar_index + ${value}` : value}`;
}

describe('collection packet 001 documented remaining facets', () => {
  for (const integerQualifier of qualifiers) {
    for (const floatQualifier of qualifiers) {
      it(`rank39 from widens ${integerQualifier} int and ${floatQualifier} float in both orders`, () => {
        const source = `${scalarSeed(integerQualifier, 'int', 'integerSeed')}\n${scalarSeed(floatQualifier, 'float', 'floatSeed')}\nvalues = array.from(integerSeed, floatSeed)\nreverseValues = array.from(floatSeed, integerSeed)`;
        assertType(source, 'values', 'array', 'float');
        assertType(source, 'reverseValues', 'array', 'float');
        assertValues(
          source,
          ['values.get(0)', 'values.get(1)', 'reverseValues.get(0)', 'reverseValues.get(1)'],
          [
            compatibilityBars.map((_, index) => (integerQualifier === 'series' ? index + 17 : 17)),
            compatibilityBars.map((_, index) => (floatQualifier === 'series' ? index + 2.5 : 2.5)),
            compatibilityBars.map((_, index) => (floatQualifier === 'series' ? index + 2.5 : 2.5)),
            compatibilityBars.map((_, index) => (integerQualifier === 'series' ? index + 17 : 17)),
          ],
        );
      });
    }
  }

  it('rank63 from retains bar-dependent enum identity type and argument order', () => {
    const source =
      'enum Choice\n    first\n    secondValue\nselected = bar_index % 2 == 0 ? Choice.first : Choice.secondValue\nother = bar_index % 2 == 0 ? Choice.secondValue : Choice.first\nvalues = array.from(selected, other)\nread = values.get(0)';
    const result = check(source);
    expect(result.diagnostics, reference).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'values')?.type?.elementType, reference).toEqual({
      kind: 'udt',
      name: 'Choice',
    });
    expect(result.symbols.find((symbol) => symbol.name === 'read')?.type?.name, reference).toBe('Choice');
    assertValues(
      source,
      ['values.get(0) == Choice.first ? 1 : 0', 'values.get(1) == Choice.first ? 1 : 0', 'values.indexof(selected)'],
      [
        compatibilityBars.map((_, index) => (index % 2 === 0 ? 1 : 0)),
        compatibilityBars.map((_, index) => (index % 2 === 0 ? 0 : 1)),
        0,
      ],
    );
  });

  for (const { kind, type, source, wrong } of kinds) {
    if (!['bool', 'string', 'color'].includes(kind)) {
      it(`ranks76-83 generic array.new ${type} retains shared seeds and independent constructors`, () => {
        const setup = `${source}\nvalues = array.new<${type}>(initial_value=first, size=3)\nindependent = array.new<${type}>(size=2, initial_value=first)\nread = values.get(0)\nvalues.set(0, secondValue)`;
        assertType(setup, 'values', 'array', kind);
        assertType(setup, 'read', kind);
        assertValues(
          setup,
          [
            'values.indexof(secondValue)',
            'values.indexof(first)',
            'independent.indexof(secondValue)',
            'independent.indexof(first)',
            'values.indexof(values.get(2))',
            'values.size()',
            'independent.size()',
          ],
          [0, 1, -1, 0, 1, 3, 2],
        );
      });
    }
    for (const route of ['namespace', 'receiver'] as const) {
      const set =
        route === 'namespace' ? 'array.set(value=secondValue, index=1, id=values)' : 'values.set(value=secondValue, index=1)';
      it(`ranks87-93 ${route} set ${type} changes only the selected compatible slot`, () => {
        const setup = `${source}\nvalues = array.new<${type}>(3, first)\n${set}\nread = values.get(1)`;
        assertType(setup, 'values', 'array', kind);
        assertType(setup, 'read', kind);
        assertValues(
          setup,
          [
            'values.indexof(secondValue)',
            'values.indexof(values.get(0))',
            'values.lastindexof(values.get(2))',
            'values.size()',
          ],
          [1, 0, 2, 3],
        );
      });
      it(`ranks87-93 ${route} set ${type} refuses an incompatible value`, () => {
        const call =
          route === 'namespace'
            ? `array.set(value=${wrong}, id=values, index=1)`
            : `values.set(value=${wrong}, index=1)`;
        const result = check(`${source}\nvalues = array.new<${type}>(3, first)\n${call}`);
        expect(result.diagnostics, reference).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
        expect(result.diagnostics[0].message, reference).toMatch(/array element/);
      });
    }
    if (['bool', 'string', 'color', 'udt'].includes(kind)) {
      for (const route of ['namespace', 'receiver'] as const) {
        it(`ranks101-112 ${route} matrix.get ${type} retains exact cell type and identity`, () => {
          const get = route === 'namespace' ? 'matrix.get(column=2, id=grid, row=1)' : 'grid.get(column=2, row=1)';
          const setup = `${source}\ngrid = matrix.new<${type}>(2, 3, first)\ngrid.set(1, 2, secondValue)\nread = ${get}\nwitness = array.from(first, secondValue)`;
          assertType(setup, 'grid', 'matrix', kind);
          assertType(setup, 'read', kind);
          assertValues(
            setup,
            ['witness.indexof(read)', 'witness.indexof(grid.get(0, 0))', 'grid.rows()', 'grid.columns()'],
            [1, 0, 2, 3],
          );
        });
      }
    }
    if (!['bool', 'string', 'color'].includes(kind)) {
      for (const route of ['namespace', 'receiver'] as const) {
        it(`ranks116-120 ${route} shift ${type} returns the first reference and preserves remaining order`, () => {
          const shift = route === 'namespace' ? 'array.shift(id=values)' : 'values.shift()';
          const setup = `${source}\nvalues = array.from(first, secondValue, first)\nread = ${shift}\nwitness = array.from(first, secondValue)`;
          assertType(setup, 'read', kind);
          assertValues(
            setup,
            [
              'witness.indexof(read)',
              'witness.indexof(values.get(0))',
              'witness.indexof(values.get(1))',
              'values.size()',
            ],
            [0, 1, 0, 2],
          );
        });
      }
    }
    if (kind === 'bool' || kind === 'udt') {
      it(`ranks124-127 matrix.new ${type} returns a rectangular ID with shared seeds`, () => {
        const setup = `${source}\ngrid = matrix.new<${type}>(initial_value=first, columns=3, rows=2)\notherGrid = matrix.new<${type}>(2, 3, first)\ngrid.set(0, 0, secondValue)\nwitness = array.from(first, secondValue)`;
        assertType(setup, 'grid', 'matrix', kind);
        assertValues(
          setup,
          [
            'grid.rows()',
            'grid.columns()',
            'witness.indexof(grid.get(0, 0))',
            'witness.indexof(grid.get(1, 2))',
            'witness.indexof(otherGrid.get(0, 0))',
          ],
          [2, 3, 1, 0, 0],
        );
      });
    }
  }

  for (const route of ['namespace', 'receiver'] as const) {
    for (const named of [false, true]) {
      it(`ranks88-92 ${route} set requires index with ${named ? 'reversed named' : 'positional'} binding`, () => {
        const call =
          route === 'namespace'
            ? named
              ? 'array.set(value=43, id=values)'
              : 'array.set(values)'
            : named
              ? 'values.set(value=43)'
              : 'values.set()';
        const result = check(`values = array.from(17, -8)\n${call}`);
        expect(result.diagnostics, reference).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'argument-count' })]),
        );
        const valid =
          route === 'namespace' ? 'array.set(value=43, index=1, id=values)' : 'values.set(value=43, index=1)';
        assertValues(`values = array.from(17, -8)\n${valid}`, ['values.get(0)', 'values.get(1)'], [17, 43]);
      });
    }
  }

  for (const kind of ['int', 'float'] as const) {
    for (const qualifier of qualifiers) {
      it(`rank130 matrix.new accepts ${qualifier} ${kind} seed in every cell`, () => {
        const source = `${scalarSeed(qualifier, kind, 'seed')}\ngrid = matrix.new<${kind}>(initial_value=seed, columns=3, rows=2)`;
        assertType(source, 'grid', 'matrix', kind);
        const expected = compatibilityBars.map(
          (_, index) => (kind === 'int' ? 17 : 2.5) + (qualifier === 'series' ? index : 0),
        );
        assertValues(source, ['grid.get(0, 0)', 'grid.get(1, 2)'], [expected, expected]);
      });
    }
  }
  for (const type of ['bool', 'string', 'color'] as const) {
    for (const qualifier of qualifiers) {
      it(`rank130 matrix.new accepts ${qualifier} ${type} seed in every cell`, () => {
        const value = type === 'bool' ? 'true' : type === 'string' ? '"seed"' : 'color.red';
        const varying =
          type === 'bool'
            ? 'bar_index % 2 == 0'
            : type === 'string'
              ? 'str.tostring(bar_index)'
              : 'bar_index % 2 == 0 ? color.red : color.blue';
        const seed =
          qualifier === 'input'
            ? `seed = input.${type}(${value})`
            : `${qualifier} ${type} seed = ${qualifier === 'series' ? varying : value}`;
        const setup = `${seed}\ngrid = matrix.new<${type}>(initial_value=seed, columns=3, rows=2)\nwitness = array.from(seed)`;
        assertType(setup, 'grid', 'matrix', type);
        assertValues(setup, ['witness.indexof(grid.get(0, 0))', 'witness.indexof(grid.get(1, 2))'], [0, 0]);
      });
    }
  }
  it('ranks83-130 generic constructors share a series UDT object across all slots', () => {
    const source = `${record}\nseed = Record.new(bar_index)\nvalues = array.new<Record>(3, seed)\ngrid = matrix.new<Record>(2, 3, seed)\nshared = grid.get(1, 2)\nshared.score := bar_index + 43`;
    const expected = compatibilityBars.map((_, index) => index + 43);
    assertValues(source, ['seed.score', 'values.get(2).score', 'grid.get(0, 0).score'], [expected, expected, expected]);
  });
  for (const type of ['bool', 'string', 'color', 'Record']) {
    it(`rank130 matrix.new ${type} refuses an incompatible supplied seed`, () => {
      const result = check(`${record}\ngrid = matrix.new<${type}>(initial_value=17, rows=2, columns=3)`);
      expect(result.diagnostics, reference).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
    });
  }

  for (const route of ['positional', 'named', 'receiver'] as const) {
    for (const operand of ['matrix', 'scalar', 'vector'] as const) {
      it(`ranks134-147 mult ${route} binds the ${operand} overload and exact result type`, () => {
        const source =
          'left = matrix.new<int>(2, 2, 0)\nleft.set(0, 0, 1)\nleft.set(0, 1, 2)\nleft.set(1, 0, 3)\nleft.set(1, 1, 4)\nright = matrix.new<float>(2, 1, 0.0)\nright.set(0, 0, 5.0)\nright.set(1, 0, 7.0)\nvector = array.from(5.0, 7.0)';
        const secondValue = operand === 'matrix' ? 'right' : operand === 'scalar' ? '2.5' : 'vector';
        const call =
          route === 'named'
            ? `matrix.mult(id2=${secondValue}, id1=left)`
            : route === 'receiver'
              ? `left.mult(id2=${secondValue})`
              : `matrix.mult(left, ${secondValue})`;
        const setup = `${source}\nresult = ${call}`;
        assertType(setup, 'result', operand === 'vector' ? 'array' : 'matrix', operand === 'scalar' ? 'int' : 'float');
        assertValues(
          setup,
          operand === 'vector'
            ? ['result.get(0)', 'result.get(1)']
            : operand === 'matrix'
              ? ['result.get(0, 0)', 'result.get(1, 0)', 'result.columns()']
              : ['result.get(0, 0)', 'result.get(0, 1)', 'result.get(1, 0)', 'result.get(1, 1)'],
          operand === 'scalar' ? [2.5, 5, 7.5, 10] : operand === 'matrix' ? [19, 43, 1] : [19, 43],
        );
      });
      for (const leftKind of ['int', 'float'] as const) {
        it(`ranks134-147 mult ${route} binds ${leftKind} left and integer ${operand} result`, () => {
          const source = `left = matrix.new<${leftKind}>(2, 2, ${leftKind === 'int' ? '0' : '0.0'})\nleft.set(0, 0, 1)\nleft.set(0, 1, 2)\nleft.set(1, 0, 3)\nleft.set(1, 1, 4)\nright = matrix.new<int>(2, 1, 0)\nright.set(0, 0, 5)\nright.set(1, 0, 7)\nvector = array.from(5, 7)`;
          const secondValue = operand === 'matrix' ? 'right' : operand === 'scalar' ? '2' : 'vector';
          const call =
            route === 'named'
              ? `matrix.mult(id2=${secondValue}, id1=left)`
              : route === 'receiver'
                ? `left.mult(id2=${secondValue})`
                : `matrix.mult(left, ${secondValue})`;
          const setup = `${source}\nresult = ${call}`;
          assertType(setup, 'result', operand === 'vector' ? 'array' : 'matrix', leftKind);
          assertValues(
            setup,
            operand === 'vector'
              ? ['result.get(0)', 'result.get(1)']
              : operand === 'matrix'
                ? ['result.get(0, 0)', 'result.get(1, 0)']
                : ['result.get(0, 0)', 'result.get(1, 1)'],
            operand === 'scalar' ? [2, 8] : [19, 43],
          );
        });
      }
    }
    for (const operand of [
      '"wrong"',
      'false',
      'matrix.new<string>(2, 1, "wrong")',
      'matrix.new<bool>(2, 1, false)',
      'array.from("wrong", "type")',
      'array.from(false, true)',
    ]) {
      it(`ranks134-147 mult ${route} refuses incompatible id2 ${operand}`, () => {
        const call =
          route === 'named'
            ? `matrix.mult(id2=${operand}, id1=left)`
            : route === 'receiver'
              ? `left.mult(id2=${operand})`
              : `matrix.mult(left, ${operand})`;
        const result = check(`left = matrix.new<int>(2, 2, 1)\n${call}`);
        expect(result.diagnostics, reference).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
      });
    }
  }
  for (const named of [false, true]) {
    for (const operand of [
      '17',
      '"wrong"',
      'false',
      'matrix.new<string>(2, 1, "wrong")',
      'matrix.new<bool>(2, 1, false)',
      'array.from(1, 2)',
    ]) {
      it(`ranks134-147 mult ${named ? 'named' : 'positional'} refuses incompatible id1 ${operand}`, () => {
        const call = named ? `matrix.mult(id2=2, id1=${operand})` : `matrix.mult(${operand}, 2)`;
        expect(check(call).diagnostics, reference).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
      });
    }
  }
  it('ranks134-147 selected custom mult retains its nonnumeric argument contract', () => {
    const source =
      'method mult(matrix<int> self, string selector) =>\n    array.from(7, 9)\nleft = matrix.new<int>(2, 2, 1)\narray<int> result = left.mult(selector="custom")';
    assertType(source, 'result', 'array', 'int');
    assertValues(source, ['result.get(0)', 'result.get(1)'], [7, 9]);
  });
});
