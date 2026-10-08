import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_line.set_xloc';
const contracts = [
  { parameter: 'x1', kind: 'int', first: '-7', second: '13', firstValue: -7, secondValue: 13 },
  { parameter: 'x2', kind: 'int', first: '-7', second: '13', firstValue: -7, secondValue: 13 },
  {
    parameter: 'xloc',
    kind: 'string',
    first: 'xloc.bar_time',
    second: 'xloc.bar_index',
    firstValue: 'bar_time',
    secondValue: 'bar_index',
  },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(parameter: string, argument: string, binding: Binding): string {
  const values = { x1: '17', x2: '19', xloc: 'xloc.bar_index', [parameter]: argument };
  if (binding === 'namespace-positional') return `line.set_xloc(id, ${values.x1}, ${values.x2}, ${values.xloc})`;
  if (binding === 'namespace-named')
    return `line.set_xloc(xloc=${values.xloc}, x2=${values.x2}, x1=${values.x1}, id=id)`;
  if (binding === 'method-positional') return `id.set_xloc(${values.x1}, ${values.x2}, ${values.xloc})`;
  return `id.set_xloc(xloc=${values.xloc}, x2=${values.x2}, x1=${values.x1})`;
}

for (const contract of contracts) {
  for (const binding of bindings) {
    describe(`line.set_xloc ${contract.parameter} ${binding} [893/1228]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
        it(`applies a ${qualifier} ${contract.kind} operand to the specified location field`, () => {
          const declaration =
            qualifier === 'input'
              ? `operand = input.${contract.kind}(${contract.first})`
              : `${qualifier} ${contract.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${contract.second} : ${contract.first}` : contract.first}`;
          const source = `//@version=6
indicator("Line xloc operand qualifiers")
${declaration}
id = line.new(bar_index, 100, bar_index + 1, 200)
${call(contract.parameter, 'operand', binding)}`;
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
          expect(
            lines.map((line) => ({ x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, xloc: line.xloc })),
            citation,
          ).toEqual(
            [0, 1, 2].map((index) => ({
              x1: 17,
              y1: 100,
              x2: 19,
              y2: 200,
              xloc: 'bar_index',
              [contract.parameter]: qualifier === 'series' && index === 1 ? contract.secondValue : contract.firstValue,
            })),
          );
        });
      }
      for (const invalid of contract.kind === 'int' ? ['true', '1.5'] : ['true']) {
        it(`refuses ${invalid} outside the documented ${contract.kind} kind`, () => {
          const checked = checkProgram(
            parse(`//@version=6
indicator("Line xloc operand kinds")
id = line.new(0,100,1,200)
${call(contract.parameter, invalid, binding)}`),
          );
          expect(
            checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
            citation,
          ).toEqual(
            expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('line.set_xloc') })]),
          );
        });
      }
    });
  }
}
