import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const parameters = ['title', 'tooltip', 'inline', 'group', 'confirm', 'active'] as const;
const overloads = [
  { name: 'int range', callee: 'input.int', base: '1, minval=0, maxval=2, step=1', firstRank: 57 },
  { name: 'int options', callee: 'input.int', base: '1, options=[1, 2]', firstRank: 63 },
  { name: 'color', callee: 'input.color', base: 'color.red', firstRank: 272 },
] as const;

function diagnostics(setup: string, call: string) {
  return checkProgram(
    parse(`//@version=6\nindicator("Metadata qualifiers")\n${setup}\nvalue = ${call}\nplot(close)`),
  ).diagnostics.filter((d) => d.severity === 'error');
}

for (const overload of overloads) {
  describe(overload.name, () => {
    for (const [index, parameter] of parameters.entries()) {
      const rank = overload.firstRank + index;
      const call = (value: string) => `${overload.callee}(${overload.base}, ${parameter}=${value})`;
      const isString = ['title', 'tooltip', 'inline', 'group'].includes(parameter);
      const required = parameter === 'active' ? 'input' : 'const';

      it(`ledger ${rank}: refuses a stronger same-kind qualifier`, () => {
        const setup = isString
          ? 'strong = input.string("Text")'
          : parameter === 'confirm'
            ? 'strong = input.bool(true)'
            : 'simple bool strong = true';
        const errors = diagnostics(setup, call('strong'));
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(parameter);
        expect(errors[0].message).toContain(required);
      });

      it(`ledger ${rank}: refuses series metadata independently`, () => {
        const setup = isString ? 'strong = str.tostring(bar_index)' : 'strong = close > open';
        const errors = diagnostics(setup, call('strong'));
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(parameter);
        expect(errors[0].message).toContain(required);
      });

      it(`ledger ${rank}: admits the declared qualifier boundary`, () => {
        const setup = parameter === 'active' ? 'boundary = input.bool(true)' : '';
        const value = isString ? '"Text"' : parameter === 'active' ? 'boundary' : 'true';
        expect(diagnostics(setup, call(value))).toEqual([]);
      });

      it(`ledger ${rank}: admits weaker const metadata`, () => {
        expect(diagnostics('', call(isString ? '"Text"' : 'false'))).toEqual([]);
      });
    }
  });
}
