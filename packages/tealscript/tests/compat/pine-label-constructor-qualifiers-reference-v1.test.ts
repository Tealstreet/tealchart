import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const slots = [
  { parameter: 'text', kind: 'string', field: 'text' },
  { parameter: 'tooltip', kind: 'string', field: 'tooltip' },
  { parameter: 'color', kind: 'color', field: 'color' },
  { parameter: 'textcolor', kind: 'color', field: 'textColor' },
] as const;

function construction(overload: string, parameter: string, argument: string): string {
  const values = {
    text: '"untouched"',
    tooltip: '"untouched-tip"',
    color: '#111111',
    textcolor: '#222222',
    [parameter]: argument,
  };
  const coordinates = overload === 'point' ? 'point=chart.point.from_index(bar_index, high)' : 'y=high, x=bar_index';
  return `label.new(tooltip=${values.tooltip}, textcolor=${values.textcolor}, color=${values.color}, text=${values.text}, ${coordinates})`;
}

// Frozen v6 label.new entries911/912: these four slots admit const/input/simple/series.
// Distinct middle-bar values discriminate qualifier-dependent argument loss in each overload.
for (const overload of ['point', 'coordinate'] as const) {
  const entry = overload === 'point' ? 911 : 912;
  const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_label.new';
  for (const slot of slots) {
    describe(`label.new ${overload} ${slot.parameter} [${entry}]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`publishes the ${qualifier} ${slot.kind} operand`, () => {
          const first = slot.kind === 'string' ? 'constructed-one' : '#123456';
          const second = slot.kind === 'string' ? 'constructed-two' : '#ABCDEF';
          const literal = slot.kind === 'string' ? JSON.stringify(first) : first;
          const alternate = slot.kind === 'string' ? JSON.stringify(second) : second;
          const declaration =
            qualifier === 'input'
              ? `operand = input.${slot.kind}(${literal})`
              : `${qualifier} ${slot.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${literal}` : literal}`;
          const source = `//@version=6
indicator("Label constructor operand qualifiers")
${declaration}
id = ${construction(overload, slot.parameter, 'operand')}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
            kind: slot.kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const labels = result.drawings.filter((drawing) => drawing.type === 'label');
          expect(labels, citation).toHaveLength(3);
          expect(
            labels.map((label) => label[slot.field]),
            citation,
          ).toEqual([first, qualifier === 'series' ? second : first, first]);
        });
      }
      it('refuses a boolean in the documented string/color operand slot', () => {
        const source = `//@version=6
indicator("Label constructor operand kind")
id = ${construction(overload, slot.parameter, 'true')}`;
        const checked = checkProgram(parse(source));
        expect(
          checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
          citation,
        ).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('label.new') })]));
      });
    });
  }
}
