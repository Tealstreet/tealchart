import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_polyline.new';
const defaults: Record<string, string> = {
  points: 'points',
  curved: 'false',
  closed: 'false',
  xloc: 'xloc.bar_index',
  line_color: '#111111',
  fill_color: '#222222',
  line_style: 'line.style_solid',
  line_width: '1',
  force_overlay: 'false',
};
const setup = `first = chart.point.new(time, 1, 12.25)
secondPoint = chart.point.new(time + 60000, 5, 34.75)
points = array.from(first, secondPoint)`;

const contracts = [
  {
    parameter: 'curved',
    kind: 'bool',
    field: 'curved',
    first: 'true',
    second: 'false',
    expectedFirst: true,
    expectedSecond: false,
  },
  {
    parameter: 'closed',
    kind: 'bool',
    field: 'closed',
    first: 'true',
    second: 'false',
    expectedFirst: true,
    expectedSecond: false,
  },
  {
    parameter: 'xloc',
    kind: 'string',
    field: 'xloc',
    first: 'xloc.bar_index',
    second: 'xloc.bar_time',
    expectedFirst: 'bar_index',
    expectedSecond: 'bar_time',
  },
  {
    parameter: 'line_color',
    kind: 'color',
    field: 'lineColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
  },
  {
    parameter: 'fill_color',
    kind: 'color',
    field: 'fillColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
  },
  {
    parameter: 'line_style',
    kind: 'string',
    field: 'lineStyle',
    first: 'line.style_solid',
    second: 'line.style_dashed',
    expectedFirst: 'solid',
    expectedSecond: 'dashed',
  },
  {
    parameter: 'line_width',
    kind: 'int',
    field: 'lineWidth',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
  },
] as const;

function call(parameter: string, named: boolean): string {
  const values = { ...defaults, [parameter]: 'operand' };
  const args = named
    ? Object.entries(values)
        .reverse()
        .map(([name, value]) => `${name}=${value}`)
    : Object.values(values);
  return `polyline.new(${args.join(', ')})`;
}

for (const named of [false, true]) {
  for (const contract of contracts) {
    describe(`polyline.new ${named ? 'named' : 'positional'} ${contract.parameter} operand [1175]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`accepts and uses ${qualifier} ${contract.kind}`, () => {
          const declaration =
            qualifier === 'input'
              ? `operand = input.${contract.kind}(${contract.first})`
              : `${qualifier} ${contract.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${contract.second} : ${contract.first}` : contract.first}`;
          const source = `//@version=6
indicator("Polyline operands")
${setup}
${declaration}
id = ${call(contract.parameter, named)}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toEqual({
            kind: contract.kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const polylines = result.drawings.filter((drawing) => drawing.type === 'polyline');
          expect(polylines, citation).toHaveLength(3);
          const expected = [
            contract.expectedFirst,
            qualifier === 'series' ? contract.expectedSecond : contract.expectedFirst,
            contract.expectedFirst,
          ];
          for (const [index, polyline] of polylines.entries())
            expect(polyline, citation).toEqual(expect.objectContaining({ [contract.field]: expected[index] }));
        });
      }
    });
  }
  it(`polyline.new ${named ? 'named' : 'positional'} uses a series array<chart.point> operand [1175]`, () => {
    const source = `//@version=6
indicator("Polyline points operand")
${setup}
operand = bar_index == 1 ? array.from(chart.point.new(time, 2, 77), secondPoint) : points
id = ${call('points', named)}`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics, citation).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
      kind: 'array',
      qualifier: 'series',
      elementType: { kind: 'chart.point' },
    });
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors, citation).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
    const polylines = result.drawings.filter((drawing) => drawing.type === 'polyline');
    expect(polylines, citation).toHaveLength(3);
    expect(
      polylines.map((polyline) => polyline.points.map((point) => [point.index, point.price])),
      citation,
    ).toEqual([
      [
        [1, 12.25],
        [5, 34.75],
      ],
      [
        [2, 77],
        [5, 34.75],
      ],
      [
        [1, 12.25],
        [5, 34.75],
      ],
    ]);
  });
  it(`polyline.new ${named ? 'named' : 'positional'} accepts a const force_overlay operand [1175]`, () => {
    const source = `//@version=6
indicator("Polyline overlay operand")
${setup}
const bool operand = false
id = ${call('force_overlay', named)}`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics, citation).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toEqual({
      kind: 'bool',
      qualifier: 'const',
    });
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors, citation).toEqual([]);
    const polylines = result.drawings.filter((drawing) => drawing.type === 'polyline');
    expect(polylines, citation).toHaveLength(3);
    for (const polyline of polylines) expect(polyline.forceOverlay, citation).toBe(false);
  });
  for (const qualifier of ['input', 'simple', 'series']) {
    it(`polyline.new ${named ? 'named' : 'positional'} refuses ${qualifier} force_overlay [1175]`, () => {
      const declaration = qualifier === 'input' ? 'operand = input.bool(true)' : `${qualifier} bool operand = true`;
      const checked = checkProgram(
        parse(`//@version=6
indicator("Polyline overlay qualifier ceiling")
${setup}
${declaration}
id = ${call('force_overlay', named)}`),
      );
      expect(checked.diagnostics, citation).toContainEqual(
        expect.objectContaining({ severity: 'error', code: 'qualifier-mismatch' }),
      );
    });
  }
}
