import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_label.new';
const locations = [
  { parameter: 'x', kind: 'int', first: 1, second: 2 },
  { parameter: 'y', kind: 'int', first: 12, second: 34 },
  { parameter: 'y', kind: 'float', first: 12.25, second: 34.75 },
] as const;

function checkLocation(source: string, kind: string, qualifier: string, expected: number[][]): void {
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics, citation).toEqual([]);
  expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
    kind,
    qualifier,
  });
  const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors, citation).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
  const labels = result.drawings.filter((drawing) => drawing.type === 'label');
  expect(labels, citation).toHaveLength(3);
  expect(
    labels.map((label) => [label.x, label.y]),
    citation,
  ).toEqual(expected);
}

describe('label.new location operand qualification and flow [911/912]', () => {
  for (const named of [false, true]) {
    for (const location of locations) {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`${named ? 'named' : 'positional'} ${location.parameter} accepts and uses ${qualifier} ${location.kind}`, () => {
          const declaration =
            qualifier === 'input'
              ? `operand = input.${location.kind}(${location.first})`
              : `${qualifier} ${location.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${location.second} : ${location.first}` : location.first}`;
          const x = location.parameter === 'x' ? 'operand' : '1';
          const y = location.parameter === 'y' ? 'operand' : '12.25';
          const call = named ? `label.new(text="location", y=${y}, x=${x})` : `label.new(${x}, ${y}, "location")`;
          const values = [location.first, qualifier === 'series' ? location.second : location.first, location.first];
          checkLocation(
            `//@version=6
indicator("Label location operands")
${declaration}
id = ${call}`,
            location.kind,
            qualifier,
            values.map((value) => (location.parameter === 'x' ? [value, 12.25] : [1, value])),
          );
        });
      }
    }
    it(`${named ? 'named' : 'positional'} point retains series identity and selected index/price`, () => {
      const call = named ? 'label.new(text="point", point=operand)' : 'label.new(operand, "point")';
      checkLocation(
        `//@version=6
indicator("Label point operand")
operand = bar_index == 1 ? chart.point.from_index(2, 34.75) : chart.point.from_index(1, 12.25)
id = ${call}`,
        'chart.point',
        'series',
        [
          [1, 12.25],
          [2, 34.75],
          [1, 12.25],
        ],
      );
    });
  }
});
