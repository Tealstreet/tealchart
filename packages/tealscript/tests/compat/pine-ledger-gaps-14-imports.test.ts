import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const library = parse(`//@version=6
library("Numbers")
export abs(float value) => value + 100
hidden(float value) => value + 200
`);

const libraries = new Map([['First/Numbers/1', library], ['First/Numbers/2', library], ['Second/Numbers/1', library]]);

describe(`Ledger gaps544/546-549: ${reference} keywords[11/13]`, () => {
  it('admits exported functions and refuses private library functions', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Exported access")
import First/Numbers/1 as numbers
plot(numbers.abs(1.0))
plot(numbers.hidden(1.0))
`), { libraries });
    expect(result.diagnostics.some((diagnostic) => diagnostic.message === 'Unknown library function: numbers.hidden')).toBe(true);
  });

  it('refuses the same library version under distinct aliases and permits distinct versions', () => {
    const invalid = checkProgram(parse(`//@version=6
indicator("Repeated version")
import First/Numbers/1 as first
import First/Numbers/1 as second
plot(first.abs(1.0) + second.abs(2.0))
`), { libraries });
    expect(invalid.diagnostics.some((diagnostic) => diagnostic.message.includes('only be imported once'))).toBe(true);
    const valid = checkProgram(parse(`//@version=6
indicator("Distinct versions")
import First/Numbers/1 as first
import First/Numbers/2 as second
plot(first.abs(1.0) + second.abs(2.0))
`), { libraries });
    expect(valid.diagnostics).toEqual([]);
  });

  it('refuses duplicate aliases for different imported libraries', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Duplicate aliases")
import First/Numbers/1 as same
import Second/Numbers/1 as same
plot(same.abs(1.0))
`), { libraries });
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'duplicate-symbol')).toBe(true);
  });

  it('resolves the exported function of an import alias that replaces math', () => {
    const result = runCompatScript(`//@version=6
indicator("Builtin namespace shadow")
import First/Numbers/1 as math
plot(math.abs(-1.0), title="Imported")
`, { bars: compatibilityBars.slice(0, 1), engineOptions: { libraries } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Imported').values).toEqual([99]);
  });

  it('refuses as and import as alias identifiers', () => {
    const source = `//@version=6
indicator("Reserved import alias")
import First/Numbers/1 as as
plot(1)
`;
    const result = checkProgram(parse(source), { libraries });
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('reserved'))).toBe(true);
    expect(() => parse(source.replace(' as as', ' as import'))).toThrow();
  });

  for (const keyword of ['import', 'as']) {
    for (const position of ['owner', 'library']) {
      it(`refuses reserved ${keyword} as the ${position} path identifier`, () => {
        const path = position === 'owner' ? `${keyword}/Numbers/1` : `First/${keyword}/1`;
        const result = checkProgram(parse(`//@version=6
indicator("Reserved import path")
import ${path} as n
plot(1)
`), { libraries: new Map([[path, library]]) });
        expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('reserved'))).toBe(true);
      });
    }
  }
});
