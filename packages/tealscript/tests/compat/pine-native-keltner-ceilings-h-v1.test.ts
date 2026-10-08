import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

function program(fn: string, mult: string, range: string, setup = '', version = 6) {
  const call =
    fn === 'kc' ? `[m,u,l] = ta.kc(close, 3, ${mult}, ${range})\nplot(m)` : `plot(ta.kcw(close, 3, ${mult}, ${range}))`;
  return `//@version=${version}\nindicator("Keltner option ceilings")\n${setup}${call}\n`;
}

describe('Keltner simple option ceilings', () => {
  for (const fn of ['kc', 'kcw']) {
    for (const [name, mult, range] of [
      ['mult', 'bar_index % 4 + 1', 'true'],
      ['useTrueRange', '2.0', 'bar_index % 2 == 0'],
    ]) {
      for (const form of ['named', 'positional']) {
        it(`${fn} ${form} ${name} refuses series qualifier`, () => {
          const source = program(fn, mult, range);
          const call =
            form === 'named'
              ? source.replace(
                  `close, 3, ${mult}, ${range}`,
                  `series=close, length=3, mult=${mult}, useTrueRange=${range}`,
                )
              : source;
          expect(errors(call)).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'qualifier-mismatch',
                message: expect.stringContaining(`Cannot pass series value to simple parameter '${name}' for ta.${fn}`),
              }),
            ]),
          );
        });
      }
      it(`${fn} v5 ${name} keeps its earlier admission route`, () => {
        expect(errors(program(fn, mult, range, '', 5))).toEqual([]);
      });
    }
    for (const [name, setup, mult, range] of [
      ['literal float', '', '2.0', 'true'],
      ['literal integer', '', '2', 'false'],
      ['input', 'factor = input.float(2.0)\nuseRange = input.bool(true)\n', 'factor', 'useRange'],
      ['simple', 'simple float factor = 2.0\nsimple bool useRange = true\n', 'factor', 'useRange'],
    ]) {
      it(`${fn} retains ${name} option kinds and qualifiers`, () => {
        expect(errors(program(fn, mult, range, setup))).toEqual([]);
      });
    }
  }
});
