import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_line.new';
const contracts = [
  {
    parameter: 'xloc',
    kind: 'string',
    first: 'xloc.bar_time',
    second: 'xloc.bar_index',
    expected: ['bar_time', 'bar_index'],
  },
  { parameter: 'extend', kind: 'string', first: 'extend.both', second: 'extend.right', expected: ['both', 'right'] },
  { parameter: 'color', kind: 'color', first: '#123456', second: '#ABCDEF', expected: ['#123456', '#ABCDEF'] },
  {
    parameter: 'style',
    kind: 'string',
    first: 'line.style_dashed',
    second: 'line.style_dotted',
    expected: ['dashed', 'dotted'],
  },
  { parameter: 'width', kind: 'int', first: '3', second: '5', expected: [3, 5] },
] as const;
const setup = `firstPoint = chart.point.new(1000, 7, 12.25)
secondPoint = chart.point.new(3000, 23, 44.5)`;

function call(parameter: string, argument: string, point: boolean, named: boolean): string {
  const coordinates: Record<string, string> = point
    ? { first_point: 'firstPoint', second_point: 'secondPoint' }
    : { x1: '7', y1: '12.25', x2: '23', y2: '44.5' };
  const values = {
    ...coordinates,
    xloc: 'xloc.bar_index',
    extend: 'extend.none',
    color: '#111111',
    style: 'line.style_solid',
    width: '1',
    force_overlay: 'false',
    [parameter]: argument,
  };
  const args = named
    ? Object.entries(values)
        .reverse()
        .map(([key, value]) => `${key}=${value}`)
    : Object.values(values);
  return `line.new(${args.join(', ')})`;
}

function refuse(source: string): void {
  expect(
    checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    citation,
  ).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('line.new') })]));
}

for (const point of [false, true])
  for (const named of [false, true]) {
    describe(`line.new ${point ? 'point' : 'coordinate'} ${named ? 'reverse named' : 'positional'} options`, () => {
      for (const contract of contracts) {
        for (const qualifier of ['const', 'input', 'simple', 'series']) {
          it(`${contract.parameter} accepts and uses ${qualifier} ${contract.kind}`, () => {
            const declaration =
              qualifier === 'input'
                ? `operand = input.${contract.kind}(${contract.first})`
                : `${qualifier} ${contract.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${contract.second} : ${contract.first}` : contract.first}`;
            const source = `//@version=6
indicator("Line option operands")
${setup}
${declaration}
id = ${call(contract.parameter, 'operand', point, named)}`;
            const checked = checkProgram(parse(source));
            expect(checked.diagnostics, citation).toEqual([]);
            expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
              kind: contract.kind,
              qualifier,
            });
            const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
            expect(result.errors, citation).toEqual([]);
            expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
            const lines = result.drawings.filter((drawing) => drawing.type === 'line');
            expect(lines, citation).toHaveLength(3);
            for (const [index, line] of lines.entries())
              expect(line, citation).toMatchObject({
                [contract.parameter]: contract.expected[qualifier === 'series' && index === 1 ? 1 : 0],
              });
          });
        }
        for (const invalid of contract.kind === 'int'
          ? ['true', '1.5']
          : contract.kind === 'color'
            ? ['"#123456"']
            : ['true']) {
          it(`${contract.parameter} refuses ${invalid} outside ${contract.kind}`, () => {
            refuse(`//@version=6
indicator("Line option kind")
${setup}
id = ${call(contract.parameter, invalid, point, named)}`);
          });
        }
      }
      for (const value of ['false', 'true']) {
        it(`force_overlay accepts and publishes const ${value}`, () => {
          const source = `//@version=6
indicator("Line force overlay")
${setup}
const bool operand = ${value}
id = ${call('force_overlay', 'operand', point, named)}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
            kind: 'bool',
            qualifier: 'const',
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          expect(
            result.drawings.filter((drawing) => drawing.type === 'line').map((line) => line.forceOverlay),
            citation,
          ).toEqual([value === 'true', value === 'true', value === 'true']);
        });
      }
      for (const qualifier of ['input', 'simple', 'series']) {
        it(`force_overlay refuses ${qualifier} bool`, () => {
          const declaration =
            qualifier === 'input'
              ? 'operand = input.bool(true)'
              : `${qualifier} bool operand = ${qualifier === 'series' ? 'bar_index == 1' : 'true'}`;
          refuse(`//@version=6
indicator("Line force overlay qualifier")
${setup}
${declaration}
id = ${call('force_overlay', 'operand', point, named)}`);
        });
      }
      for (const invalid of ['1', '"true"']) {
        it(`force_overlay refuses ${invalid} outside bool`, () => {
          refuse(`//@version=6
indicator("Line force overlay kind")
${setup}
id = ${call('force_overlay', invalid, point, named)}`);
        });
      }
    });
  }
