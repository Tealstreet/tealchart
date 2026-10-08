import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference string overloads300-303 cast missing values while preserving qualifiers.
// This cast is distinct from str.tostring, whose missing result is display text.
describe('missing string cast qualifier and value', () => {
  for (const qualifier of ['input', 'simple', 'series']) {
    it(`${qualifier} missing string remains missing through cast and alias`, () => {
      const declarations =
        qualifier === 'input'
          ? 'missing = input.bool(true) ? string(na) : input.string("unused")\npresent = input.string("sentinel")'
          : `${qualifier} string missing = na\n${qualifier} string present = "sentinel"`;
      const source = `//@version=6
indicator("Missing string cast")
${declarations}
convertedMissing = string(missing)
convertedPresent = string(x=present)
alias = convertedMissing
plot(na(convertedMissing) ? 1 : 0, "Missing")
plot(na(alias) ? 1 : 0, "Alias")
plot(convertedPresent == "sentinel" ? 1 : 0, "Present")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
      for (const name of ['convertedMissing', 'convertedPresent', 'alias']) {
        expect(checked.symbols.find((entry) => entry.name === name)?.type).toMatchObject({ kind: 'string', qualifier });
      }
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Missing', 'Alias', 'Present']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
