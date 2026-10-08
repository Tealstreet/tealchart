import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const setters = [
  { member: 'set_text', entry: 918, parameter: 'text', kind: 'string', field: 'text' },
  { member: 'set_tooltip', entry: 926, parameter: 'tooltip', kind: 'string', field: 'tooltip' },
  { member: 'set_color', entry: 921, parameter: 'color', kind: 'color', field: 'color' },
  { member: 'set_textcolor', entry: 923, parameter: 'textcolor', kind: 'color', field: 'textColor' },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, parameter: string, binding: Binding, argument: string): string {
  if (binding === 'namespace-positional') return `label.${member}(id, ${argument})`;
  if (binding === 'namespace-named') return `label.${member}(${parameter}=${argument}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${argument})`;
  return `id.${member}(${parameter}=${argument})`;
}

// Frozen v6 functions entries918/926/921/923: parameter1 lists all four qualifiers.
// Changed fields certify argument flow, not copying, visual rendering or palette defaults.
for (const setter of setters) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_label.${setter.member}`;
  for (const binding of bindings) {
    describe(`label.${setter.member} ${binding} [${setter.entry}]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`admits and applies a ${qualifier} ${setter.kind} operand`, () => {
          const first = setter.kind === 'string' ? 'changed-one' : '#123456';
          const second = setter.kind === 'string' ? 'changed-two' : '#ABCDEF';
          const literal = setter.kind === 'string' ? JSON.stringify(first) : first;
          const alternate = setter.kind === 'string' ? JSON.stringify(second) : second;
          const declaration =
            qualifier === 'input'
              ? `operand = input.${setter.kind}(${literal})`
              : `${qualifier} ${setter.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${literal}` : literal}`;
          const source = `//@version=6
indicator("Label setter operand qualifiers")
${declaration}
id = label.new(bar_index, high, "untouched", tooltip="untouched-tip", color=#111111, textcolor=#222222)
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
          const labels = result.drawings.filter((drawing) => drawing.type === 'label');
          expect(labels, citation).toHaveLength(3);
          expect(
            labels.map((label) => label[setter.field]),
            citation,
          ).toEqual([first, qualifier === 'series' ? second : first, first]);
        });
      }
      it('refuses a boolean instead of the documented operand kind', () => {
        const source = `//@version=6
indicator("Label setter operand kind")
id = label.new(0, 1, "untouched")
${call(setter.member, setter.parameter, binding, 'true')}`;
        const checked = checkProgram(parse(source));
        expect(
          checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
          citation,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining(`label.${setter.member}`) }),
          ]),
        );
      });
    });
  }
}
