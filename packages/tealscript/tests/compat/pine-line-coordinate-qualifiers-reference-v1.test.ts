import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const setters = [
  { member: 'set_x1', entry: 887, parameter: 'x', field: 'x1', kinds: ['int'] },
  { member: 'set_y1', entry: 888, parameter: 'y', field: 'y1', kinds: ['int', 'float'] },
  { member: 'set_x2', entry: 890, parameter: 'x', field: 'x2', kinds: ['int'] },
  { member: 'set_y2', entry: 891, parameter: 'y', field: 'y2', kinds: ['int', 'float'] },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, parameter: string, binding: Binding, argument: string): string {
  if (binding === 'namespace-positional') return `line.${member}(id, ${argument})`;
  if (binding === 'namespace-named') return `line.${member}(${parameter}=${argument}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${argument})`;
  return `id.${member}(${parameter}=${argument})`;
}

// Frozen v6 entries887/888/890/891 parameter1: integer X; integer/float Y, four qualifiers.
// Reached coordinates certify operand binding; rendering, copying and time/future limits are excluded.
for (const setter of setters) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_line.${setter.member}`;
  for (const binding of bindings) {
    describe(`line.${setter.member} ${binding} [${setter.entry}]`, () => {
      for (const kind of setter.kinds) {
        for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
          it(`applies a ${qualifier} ${kind} operand to its specified endpoint`, () => {
            const first = kind === 'float' ? -2.5 : -7;
            const second = kind === 'float' ? 3.75 : 13;
            const declaration =
              qualifier === 'input'
                ? `operand = input.${kind}(${first})`
                : `${qualifier} ${kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${second} : ${first}` : first}`;
            const source = `//@version=6
indicator("Line coordinate operand qualifiers")
${declaration}
id = line.new(bar_index, 100, bar_index + 1, 200)
${call(setter.member, setter.parameter, binding, 'operand')}`;
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
              lines.map((line) => line[setter.field]),
              citation,
            ).toEqual([first, qualifier === 'series' ? second : first, first]);
          });
        }
      }
      for (const invalid of setter.parameter === 'x' ? ['true', '1.5'] : ['true']) {
        it(`refuses ${invalid} outside the documented coordinate kind`, () => {
          const source = `//@version=6
indicator("Line coordinate operand kind")
id = line.new(0, 100, 1, 200)
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
