import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const members = ['set_first_point', 'set_second_point'] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, argument: string, binding: Binding): string {
  if (binding === 'namespace-positional') return `line.${member}(id, ${argument})`;
  if (binding === 'namespace-named') return `line.${member}(point=${argument}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${argument})`;
  return `id.${member}(point=${argument})`;
}

for (const member of members) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_line.${member}`;
  for (const binding of bindings) {
    describe(`line.${member} ${binding} series point binding`, () => {
      for (const xloc of ['bar_index', 'bar_time'] as const) {
        it(`uses the series point's ${xloc === 'bar_index' ? 'index' : 'time'} and price at the specified endpoint`, () => {
          const source = `//@version=6
indicator("Line point operand")
operand = chart.point.new(1000 + bar_index, 7 + bar_index, 12.25 + bar_index)
id = line.new(bar_index, 100, bar_index + 1, 200, xloc=xloc.${xloc})
${call(member, 'operand', binding)}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
            kind: 'chart.point',
            qualifier: 'series',
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const lines = result.drawings.filter((drawing) => drawing.type === 'line');
          expect(lines, citation).toHaveLength(3);
          expect(
            lines.map((line) => ({ x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, xloc: line.xloc })),
            citation,
          ).toEqual(
            [0, 1, 2].map((index) => ({
              x1: member === 'set_first_point' ? (xloc === 'bar_index' ? 7 : 1000) + index : index,
              y1: member === 'set_first_point' ? 12.25 + index : 100,
              x2: member === 'set_second_point' ? (xloc === 'bar_index' ? 7 : 1000) + index : index + 1,
              y2: member === 'set_second_point' ? 12.25 + index : 200,
              xloc,
            })),
          );
        });
      }
      for (const invalid of ['true', '1', '1.5', '"point"', 'id']) {
        it(`refuses ${invalid} outside the chart.point kind`, () => {
          const checked = checkProgram(
            parse(`//@version=6
indicator("Line point operand kind")
id = line.new(0,100,1,200)
${call(member, invalid, binding)}`),
          );
          expect(
            checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
            citation,
          ).toEqual(
            expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining(`line.${member}`) })]),
          );
        });
      }
    });
  }
}
