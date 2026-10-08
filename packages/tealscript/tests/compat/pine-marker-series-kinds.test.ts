import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[2/3], series accepts int/float/bool.
function errors(name: string, value: string, location: string, declaration = '') {
  return checkProgram(parse(`//@version=6
indicator("Marker series kinds")
p = plot(2)
h = hline(2)
${declaration}
${name}(location=${location}, series=${value})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented marker series argument kinds', () => {
  for (const [name, entry] of [['plotshape', 2], ['plotchar', 3]] as const) {
    for (const location of ['location.abovebar', 'location.absolute']) {
      it(`${name} accepts numeric and boolean series at ${location} [functions[${entry}]]`, () => {
        for (const value of ['0', '-3', '1.25', 'false', 'true', 'na']) {
          expect(errors(name, value, location), value).toEqual([]);
        }
      });

      // Rendering location does not expand the int/float/bool admission contract.
      it(`marker-series-argument-kind: ${name} rejects other series kinds at ${location} [functions[${entry}]]`, () => {
        for (const value of ['"1"', '#123456', 'array.from(1)', 'p', 'h']) {
          expect(errors(name, value, location), value).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
          );
        }
      });
    }
  }

  it('checks inferred series kinds without applying builtin rules to user callables', () => {
    for (const name of ['plotshape', 'plotchar']) {
      expect(errors(name, 'value', 'location.absolute', 'string value = "bad"')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
      expect(errors(name, 'value', 'location.absolute', 'bool value = true')).toEqual([]);
      const source = `//@version=6
indicator("Shadowed marker")
${name}(series) => series
result = ${name}("custom")`;
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    }
  });
});
