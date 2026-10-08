import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Frozen bool overloads292/295 retain const and series numeric qualifiers.
// Missing and zero become false; both finite signs become true.
describe('numeric missing bool cast qualifiers', () => {
  for (const kind of ['int', 'float']) {
    for (const qualifier of ['const', 'series']) {
      it(`${kind} ${qualifier} preserves bool kind and qualifier`, () => {
        const declaration =
          qualifier === 'series'
            ? `${kind} source = bar_index == 0 ? na : ${kind}(close)`
            : `const ${kind} source = na`;
        const source = `//@version=6
indicator("Missing bool qualifiers")
${declaration}
converted = bool(source)
alias = converted
plot(converted ? 1 : 0, "Value")
plot(bool(x=0) ? 1 : 0, "Zero")
plot(bool(x=-7) ? 1 : 0, "Negative")
plot(bool(x=4) ? 1 : 0, "Positive")`;
        const checked = checkProgram(parse(source));
        expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
        for (const name of ['converted', 'alias']) {
          expect(checked.symbols.find((entry) => entry.name === name)?.type).toMatchObject({ kind: 'bool', qualifier });
        }
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(getPlot(result, 'Value').values).toEqual(qualifier === 'series' ? [0, 1, 1] : [0, 0, 0]);
        expect(getPlot(result, 'Zero').values).toEqual([0, 0, 0]);
        expect(getPlot(result, 'Negative').values).toEqual([1, 1, 1]);
        expect(getPlot(result, 'Positive').values).toEqual([1, 1, 1]);
      });
    }
  }
});
