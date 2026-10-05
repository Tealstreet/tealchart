import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Rank1867: https://www.tradingview.com/pine-script-docs/language/type-system/#qualifiers
// Values retrieved from series reference objects inherit the object's qualifier.
const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("Field qualifier")\n${body}`));

describe('ledger47 series object fields', () => {
  it('retrieves an imported object field with series provenance', () => {
    const library = parse('//@version=6\nlibrary("Fields")\nexport type Record\n    float value');
    const source = parse(
      '//@version=6\nindicator("Imported fields")\nimport Test/Fields/1 as lib\nobject = lib.Record.new(7)\nfield = object.value',
    );
    const result = checkProgram(source, { libraries: new Map([['Test/Fields/1', library]]) });
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((s) => s.name === 'field')?.type).toMatchObject({ kind: 'float', qualifier: 'series' });
  });
  for (const [kind, value] of [
    ['float', '7.0'],
    ['int', '7'],
    ['string', '"text"'],
    ['bool', 'true'],
    ['color', 'color.red'],
  ]) {
    it(`retrieves ${kind} fields as series even with a constant initializer`, () => {
      const result = check(`type Record\n    ${kind} value\nobject = Record.new(${value})\nfield = object.value`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((s) => s.name === 'object')?.type).toMatchObject({ kind: 'udt', qualifier: 'series' });
      expect(result.symbols.find((s) => s.name === 'field')?.type).toMatchObject({ kind, qualifier: 'series' });
    });
    it(`retains the independent ${kind} constant control`, () => {
      const result = check(`value = ${value}`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind, qualifier: 'const' });
    });
  }
});
