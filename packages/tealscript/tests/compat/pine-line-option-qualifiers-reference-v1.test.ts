import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const setters = [
  {
    member: 'set_extend',
    parameter: 'extend',
    kind: 'string',
    first: '"left"',
    second: '"right"',
    firstValue: 'left',
    secondValue: 'right',
  },
  {
    member: 'set_color',
    parameter: 'color',
    kind: 'color',
    first: '#123456',
    second: '#654321',
    firstValue: '#123456',
    secondValue: '#654321',
  },
  {
    member: 'set_style',
    parameter: 'style',
    kind: 'string',
    first: '"dashed"',
    second: '"dotted"',
    firstValue: 'dashed',
    secondValue: 'dotted',
  },
  { member: 'set_width', parameter: 'width', kind: 'int', first: '2', second: '5', firstValue: 2, secondValue: 5 },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, parameter: string, binding: Binding, argument: string): string {
  if (binding === 'namespace-positional') return `line.${member}(id, ${argument})`;
  if (binding === 'namespace-named') return `line.${member}(${parameter}=${argument}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${argument})`;
  return `id.${member}(${parameter}=${argument})`;
}

for (const setter of setters) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_line.${setter.member}`;
  for (const binding of bindings) {
    describe(`line.${setter.member} ${binding}`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`applies the ${qualifier} ${setter.kind} operand to its field`, () => {
          const declaration =
            qualifier === 'input'
              ? `operand = input.${setter.kind}(${setter.first})`
              : `${qualifier} ${setter.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${setter.second} : ${setter.first}` : setter.first}`;
          const source = `//@version=6
indicator("Line option operand qualifiers")
${declaration}
id = line.new(bar_index, 100, bar_index + 1, 200, extend=extend.none, color=#789012, style=line.style_solid, width=1)
${call(setter.member, setter.parameter, binding, 'operand')}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
            kind: setter.kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const lines = result.drawings.filter((drawing) => drawing.type === 'line');
          expect(lines, citation).toHaveLength(3);
          expect(
            lines.map((line) => ({
              x1: line.x1,
              y1: line.y1,
              x2: line.x2,
              y2: line.y2,
              extend: line.extend,
              color: line.color,
              style: line.style,
              width: line.width,
            })),
            citation,
          ).toEqual(
            [0, 1, 2].map((index) => ({
              x1: index,
              y1: 100,
              x2: index + 1,
              y2: 200,
              extend: 'none',
              color: '#789012',
              style: 'solid',
              width: 1,
              [setter.parameter]: qualifier === 'series' && index === 1 ? setter.secondValue : setter.firstValue,
            })),
          );
        });
      }
      for (const invalid of setter.kind === 'int' ? ['true', '1.5'] : ['true']) {
        it(`refuses ${invalid} outside ${setter.kind}`, () => {
          const source = `//@version=6
indicator("Line option operand kind")
id = line.new(0,100,1,200)
${call(setter.member, setter.parameter, binding, invalid)}`;
          const checked = checkProgram(parse(source));
          expect(
            checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
            citation,
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ message: expect.stringContaining(`line.${setter.member}`) }),
            ]),
          );
        });
      }
    });
  }
}
