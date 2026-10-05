import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

function source(version: number, expression: string) {
  return `//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Version rename")
plot(${expression}, "value")
`;
}

describe('ledger gaps 106/108/111: documented builtin renames', () => {
  it('rank 106: v3 n becomes v4 bar_index, with the old name refused in v4', () => {
    for (const [version, expression] of [
      [3, 'n'],
      [4, 'bar_index'],
    ] as const) {
      const script = source(version, expression);
      expect(checkProgram(parse(script)).diagnostics).toEqual([]);
      const result = runCompatScript(script);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
    expect(checkProgram(parse(source(4, 'n'))).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('n') }),
      ]),
    );
  });

  it('rank 108: v3 red becomes v4 color.red, with the old name refused in v4', () => {
    for (const [version, color] of [
      [3, 'red'],
      [4, 'color.red'],
    ] as const) {
      const script = `//@version=${version}
study("Color rename")
plot(close, "value", color=${color})
`;
      expect(checkProgram(parse(script)).diagnostics).toEqual([]);
      const result = runCompatScript(script);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').color).toEqual(Array(12).fill('#FF5252'));
    }
    for (const name of ['red', 'yellow', 'teal', 'blue']) {
      const obsolete = `//@version=4
study("Obsolete color")
plot(close, color=${name})
`;
      expect(checkProgram(parse(obsolete)).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining(name) }),
        ]),
      );
    }
    const shadowed = `//@version=4
study("Declared color")
red = #123456
plot(close, "value", color=red)
`;
    expect(checkProgram(parse(shadowed)).diagnostics).toEqual([]);
    const result = runCompatScript(shadowed);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').color).toEqual(Array(12).fill('#123456'));
  });

  it('rank 111: v4 max becomes v5 math.max and the old name is refused in v5', () => {
    for (const [version, expression] of [
      [4, 'max(1, 7, -3)'],
      [5, 'math.max(number2 = 7, number0 = 1, number1 = -3)'],
    ] as const) {
      const script = source(version, expression);
      expect(checkProgram(parse(script)).diagnostics).toEqual([]);
      const result = runCompatScript(script);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual(Array(12).fill(7));
    }
    expect(checkProgram(parse(source(5, 'max(1, 7)'))).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('math.max') }),
      ]),
    );
  });
});
