import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_color.from_gradient';
const slots = [
  { name: 'value', kind: 'float', value: '-1.0', alternate: '3.0' },
  { name: 'bottom_value', kind: 'float', value: '0.0', alternate: '1.0' },
  { name: 'top_value', kind: 'float', value: '2.0', alternate: '4.0' },
  { name: 'bottom_color', kind: 'color', value: '#000000', alternate: '#0A141E' },
  { name: 'top_color', kind: 'color', value: '#FFFFFF', alternate: '#28323C' },
] as const;
const cases = [
  { qualifier: 'const', slot: undefined },
  ...slots.flatMap((slot) => ['input', 'simple', 'series'].map((qualifier) => ({ qualifier, slot: slot.name }))),
];

// Frozen v6 gradient33 always returns series color, regardless of each argument.
// Endpoint-only literal RGB controls avoid interpolation and rounding authority.
// Existing gradient arithmetic, missing-bound and native-value proofs remain separate.
for (const row of cases) {
  for (const binding of ['positional', 'named'] as const) {
    describe(`gradient ${row.slot ?? 'all'} ${row.qualifier} ${binding} [functions:33]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let outputs: Array<Array<number | null>>;
      beforeAll(() => {
        const declarations = slots
          .map((slot) => {
            const qualifier = row.slot === slot.name ? row.qualifier : 'const';
            const value = row.slot === 'top_color' && slot.name === 'value' ? '3.0' : slot.value;
            const expression = qualifier === 'series' ? `bar_index == 1 ? ${slot.alternate} : ${value}` : value;
            return qualifier === 'input'
              ? `${slot.name}Value = input.${slot.kind}(${value})`
              : `${qualifier} ${slot.kind} ${slot.name}Value = ${expression}`;
          })
          .join('\n');
        const args =
          binding === 'named'
            ? [...slots]
                .reverse()
                .map((slot) => `${slot.name}=${slot.name}Value`)
                .join(', ')
            : slots.map((slot) => `${slot.name}Value`).join(', ');
        const source = `//@version=6
indicator("Gradient slot qualifiers")
${declarations}
measured = color.from_gradient(${args})
alias = measured
plot(color.r(measured), "red")
plot(color.g(measured), "green")
plot(color.b(measured), "blue")
plot(color.t(measured), "transparency")
plot(measured == alias ? 1 : 0, "alias_identity")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        for (const slot of slots)
          expect(checked.symbols.find((symbol) => symbol.name === `${slot.name}Value`)?.type, citation).toMatchObject({
            kind: slot.kind,
            qualifier: row.slot === slot.name ? row.qualifier : 'const',
          });
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        outputs = ['red', 'green', 'blue', 'transparency', 'alias_identity'].map(
          (name) => getPlot(result, name).values,
        );
        outputs.forEach((values) => expect(values, citation).toHaveLength(3));
      });
      it('retains the series color result and alias across independent argument qualifiers', () => {
        for (const name of ['measured', 'alias'])
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'color',
            qualifier: 'series',
          });
        const base = row.slot === 'top_color' ? 255 : 0;
        for (const [index, alternateChannel] of [10, 20, 30].entries()) {
          const middle =
            row.qualifier !== 'series'
              ? base
              : row.slot === 'value'
                ? 255
                : row.slot === 'bottom_color'
                  ? alternateChannel
                  : row.slot === 'top_color'
                    ? alternateChannel + 30
                    : base;
          expect(outputs[index], citation).toEqual([base, middle, base]);
        }
        expect(outputs[3], citation).toEqual([0, 0, 0]);
        expect(outputs[4], citation).toEqual([1, 1, 1]);
      });
    });
  }
}
