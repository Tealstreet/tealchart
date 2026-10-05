import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// V5 migration reserves these variable/function names; v4 permits them.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#reserved-keywords
const words = ['catch', 'class', 'do', 'ellipse', 'in', 'is', 'polygon', 'range', 'return', 'struct', 'text', 'throw', 'try'];
const forms = ['variable', 'function', 'parameter', 'counter'] as const;
const declarations = words.flatMap((word) => forms.map((form) => ({ word, form })));
const refusals = declarations.flatMap((item) => [5, 6].map((version) => ({ ...item, version })));

function source(version: number, name: string, form: typeof forms[number]) {
  const declaration = version === 4 ? 'study' : 'indicator';
  const body = {
    variable: `${name} = 7\nplot(${name})`,
    function: `${name}(x) => x + 1\nplot(${name}(7))`,
    parameter: `f(${name}) => ${name} + 1\nplot(f(7))`,
    counter: `total = 0\nfor ${name} = 0 to 1\n    total += ${name}\nplot(total)`,
  }[form];
  return `//@version=${version}\n${declaration}("Reserved identifier boundary")\n${body}`;
}

describe('ledger gaps 48: v5 reserved variable and function names', () => {
  it.each(refusals)('refuses $word as a $form name in v$version', ({ word, form, version }) => {
    const checked = checkProgram(parse(source(version, word, form)));
    expect(checked.diagnostics).toEqual([
      expect.objectContaining({ code: 'reserved-identifier', severity: 'error', message: expect.stringContaining(`'${word}'`) }),
    ]);
  });

  it.each(declarations)('accepts legacy v4 $word as a $form name', ({ word, form }) => {
    expect(checkProgram(parse(source(4, word, form))).diagnostics).toEqual([]);
  });

  it.each(declarations)('accepts a longer v6 name for $word as a $form', ({ word, form }) => {
    expect(checkProgram(parse(source(6, `${word}Value`, form))).diagnostics).toEqual([]);
  });
});
