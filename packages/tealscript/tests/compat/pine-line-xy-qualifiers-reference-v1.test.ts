import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const setters = [
  { member: 'set_xy1', entry: 889, endpoint: 1 },
  { member: 'set_xy2', entry: 892, endpoint: 2 },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, binding: Binding, x: string, y: string): string {
  if (binding === 'namespace-positional') return `line.${member}(id, ${x}, ${y})`;
  if (binding === 'namespace-named') return `line.${member}(y=${y}, x=${x}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${x}, ${y})`;
  return `id.${member}(y=${y}, x=${x})`;
}

for (const setter of setters) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_line.${setter.member}`;
  for (const binding of bindings) {
    describe(`line.${setter.member} ${binding} [${setter.entry}]`, () => {
      for (const parameter of ['x', 'y'] as const) {
        for (const kind of parameter === 'x' ? (['int'] as const) : (['int', 'float'] as const)) {
          for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
            it(`applies ${qualifier} ${kind} ${parameter} while retaining the other endpoint`, () => {
              const first = kind === 'float' ? -2.5 : -7;
              const second = kind === 'float' ? 3.75 : 13;
              const declaration =
                qualifier === 'input'
                  ? `operand = input.${kind}(${first})`
                  : `${qualifier} ${kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${second} : ${first}` : first}`;
              const source = `//@version=6
indicator("Composite line XY operand qualifiers")
${declaration}
id = line.new(bar_index, 100, bar_index + 1, 200)
${call(setter.member, binding, parameter === 'x' ? 'operand' : '17', parameter === 'y' ? 'operand' : '80')}`;
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
                lines.map((line) => [line.x1, line.y1, line.x2, line.y2]),
                citation,
              ).toEqual(
                [0, 1, 2].map((index) => {
                  const value = qualifier === 'series' && index === 1 ? second : first;
                  const x = parameter === 'x' ? value : 17;
                  const y = parameter === 'y' ? value : 80;
                  return setter.endpoint === 1 ? [x, y, index + 1, 200] : [index, 100, x, y];
                }),
              );
            });
          }
        }
        for (const invalid of parameter === 'x' ? ['true', '1.5'] : ['true']) {
          it(`refuses ${invalid} outside the documented ${parameter} kind`, () => {
            const source = `//@version=6
indicator("Composite line XY operand kinds")
id = line.new(0, 100, 1, 200)
${call(setter.member, binding, parameter === 'x' ? invalid : '17', parameter === 'y' ? invalid : '80')}`;
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
      }
    });
  }
}
