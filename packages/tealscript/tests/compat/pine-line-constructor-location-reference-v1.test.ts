import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_line.new';
const coordinates = [
  { parameter: 'x1', kind: 'int', first: 7, second: 13 },
  { parameter: 'y1', kind: 'int', first: -12, second: 34 },
  { parameter: 'y1', kind: 'float', first: -12.25, second: 34.75 },
  { parameter: 'x2', kind: 'int', first: 7, second: 13 },
  { parameter: 'y2', kind: 'int', first: -12, second: 34 },
  { parameter: 'y2', kind: 'float', first: -12.25, second: 34.75 },
] as const;

function coordinateCall(parameter: string, argument: string, named: boolean): string {
  const values = { x1: '0', y1: '100', x2: '1', y2: '200', [parameter]: argument };
  return named
    ? `line.new(y2=${values.y2}, x2=${values.x2}, y1=${values.y1}, x1=${values.x1})`
    : `line.new(${values.x1}, ${values.y1}, ${values.x2}, ${values.y2})`;
}

function assertFlow(source: string, kind: string, qualifier: string, expected: object[]): void {
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics, citation).toEqual([]);
  expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
    kind,
    qualifier,
  });
  const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors, citation).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
  const lines = result.drawings.filter((drawing) => drawing.type === 'line');
  expect(lines, citation).toHaveLength(3);
  expect(
    lines.map((line) => ({ x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, xloc: line.xloc })),
    citation,
  ).toEqual(expected);
}

function assertRefused(source: string): void {
  const checked = checkProgram(parse(source));
  expect(
    checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    citation,
  ).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('line.new') })]));
}

for (const named of [false, true]) {
  describe(`line.new ${named ? 'reverse named' : 'positional'} coordinate operands`, () => {
    for (const coordinate of coordinates) {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`${coordinate.parameter} accepts and uses ${qualifier} ${coordinate.kind}`, () => {
          const declaration =
            qualifier === 'input'
              ? `operand = input.${coordinate.kind}(${coordinate.first})`
              : `${qualifier} ${coordinate.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${coordinate.second} : ${coordinate.first}` : coordinate.first}`;
          assertFlow(
            `//@version=6
indicator("Line coordinate operands")
${declaration}
id = ${coordinateCall(coordinate.parameter, 'operand', named)}`,
            coordinate.kind,
            qualifier,
            [0, 1, 2].map((index) => ({
              x1: 0,
              y1: 100,
              x2: 1,
              y2: 200,
              xloc: 'bar_index',
              [coordinate.parameter]: qualifier === 'series' && index === 1 ? coordinate.second : coordinate.first,
            })),
          );
        });
      }
      for (const invalid of coordinate.parameter.startsWith('x')
        ? ['true', '1.5']
        : coordinate.kind === 'int'
          ? ['true', '"price"']
          : ['true']) {
        it(`${coordinate.parameter} ${coordinate.kind} refuses ${invalid}`, () => {
          assertRefused(`//@version=6
indicator("Line coordinate kind")
id = ${coordinateCall(coordinate.parameter, invalid, named)}`);
        });
      }
    }
  });
  describe(`line.new ${named ? 'reverse named' : 'positional'} point operands`, () => {
    for (const parameter of ['first_point', 'second_point']) {
      function pointCall(argument: string, mode: string): string {
        const first = parameter === 'first_point' ? argument : 'peer';
        const second = parameter === 'second_point' ? argument : 'peer';
        return named
          ? `line.new(xloc=xloc.${mode}, second_point=${second}, first_point=${first})`
          : `line.new(${first}, ${second}, xloc.${mode})`;
      }
      for (const mode of ['bar_index', 'bar_time']) {
        it(`${parameter} uses changing series point ${mode} coordinates and price`, () => {
          assertFlow(
            `//@version=6
indicator("Line point operands")
operand = chart.point.new(1000 + bar_index, 7 + bar_index, 12.25 + bar_index)
peer = chart.point.new(3000, 23, 44.5)
id = ${pointCall('operand', mode)}`,
            'chart.point',
            'series',
            [0, 1, 2].map((index) => ({
              x1:
                parameter === 'first_point'
                  ? (mode === 'bar_index' ? 7 : 1000) + index
                  : mode === 'bar_index'
                    ? 23
                    : 3000,
              y1: parameter === 'first_point' ? 12.25 + index : 44.5,
              x2:
                parameter === 'second_point'
                  ? (mode === 'bar_index' ? 7 : 1000) + index
                  : mode === 'bar_index'
                    ? 23
                    : 3000,
              y2: parameter === 'second_point' ? 12.25 + index : 44.5,
              xloc: mode,
            })),
          );
        });
      }
      for (const invalid of ['true', '1', '1.5', '"point"', 'array.new<float>()']) {
        it(`${parameter} refuses ${invalid} outside chart.point`, () => {
          assertRefused(`//@version=6
indicator("Line point kind")
peer = chart.point.new(3000, 23, 44.5)
id = ${pointCall(invalid, 'bar_index')}`);
        });
      }
    }
  });
}
