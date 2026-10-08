import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_string';

// Frozen v6 string300-303 preserves the string argument qualifier and value.
// Raw label text observes cast and alias independently; no extra string transform.
// Missing casts, coercion from other kinds, Unicode and rendering are separate.
for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
  for (const binding of ['positional', 'named'] as const) {
    describe(`string cast ${qualifier} ${binding} [functions:300-303]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let texts: Array<string | undefined>;
      let aliases: Array<string | undefined>;
      beforeAll(() => {
        const declaration =
          qualifier === 'input'
            ? 'sourceValue = input.string("Ab 09!")'
            : `${qualifier} string sourceValue = ${qualifier === 'series' ? 'bar_index == 1 ? "X y" : "Ab 09!"' : '"Ab 09!"'}`;
        const source = `//@version=6
indicator("String cast identity")
${declaration}
measured = string(${binding === 'named' ? 'x=' : ''}sourceValue)
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
          kind: 'string',
          qualifier,
        });
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        const labels = result.drawings.filter((drawing) => drawing.type === 'label');
        expect(labels, citation).toHaveLength(6);
        texts = labels.filter((_, index) => index % 2 === 0).map((label) => label.text);
        aliases = labels.filter((_, index) => index % 2 === 1).map((label) => label.text);
      });
      it('preserves the qualifier, cast text and alias text', () => {
        for (const name of ['measured', 'alias'])
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'string',
            qualifier,
          });
        const expected = ['Ab 09!', qualifier === 'series' ? 'X y' : 'Ab 09!', 'Ab 09!'];
        expect(texts, citation).toEqual(expected);
        expect(aliases, citation).toEqual(expected);
      });
    });
  }
}
