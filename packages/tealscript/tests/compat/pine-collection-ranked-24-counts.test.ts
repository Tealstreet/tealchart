import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  ['matrix.elements_count namespace', 'm = matrix.new<int>(2, 3, 7)', 'matrix.elements_count(m)'],
  ['matrix.elements_count receiver', 'm = matrix.new<float>(2, 3, 7.5)', 'm.elements_count()'],
  ['map.size namespace', 'm = map.new<string, int>()', 'map.size(m)'],
  ['map.size receiver', 'm = map.new<int, float>()', 'm.size()'],
] as const;

function check(setup: string, declaration: string, options?: Parameters<typeof checkProgram>[1]) {
  return checkProgram(
    parse(`//@version=6
indicator("Collection ranked24 counts")
${setup}
${declaration}
plot(close)`),
    options,
  );
}

describe('collection ranks939-944 and960 count return types', () => {
  for (const [name, setup, call] of cases) {
    it(`${name} infers series int`, () => {
      const result = check(setup, `value = ${call}`);
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({
        kind: 'int',
        qualifier: 'series',
      });
    });

    it(`${name} refuses a simple int declaration`, () => {
      const result = check(setup, `simple int value = ${call}`);
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
      );
    });

    it(`${name} accepts a series int declaration`, () => {
      const result = check(setup, `series int value = ${call}`);
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    });
  }

  for (const [member, type, setup] of [
    ['elements_count', 'matrix<int>', 'matrix.new<int>(2, 3, 7)'],
    ['size', 'map<string, int>', 'map.new<string, int>()'],
  ]) {
    it(`m.${member} preserves an eligible local count method`, () => {
      const result = check(`method ${member}(${type} receiver) => 7\nm = ${setup}`, `simple int value = m.${member}()`);
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    });
  }

  for (const [namespace, member, type] of [
    ['matrix', 'elements_count', 'matrix<int>'],
    ['map', 'size', 'map<string, int>'],
  ]) {
    it(`${namespace}.${member} preserves an imported count callable`, () => {
      const library = parse(`//@version=6
library("CountControls")
export ${member}(${type} receiver) => 7`);
      const result = check(
        `import Example/CountControls/1 as ${namespace}\n${type} m = na`,
        `simple int value = ${namespace}.${member}(m)`,
        { libraries: new Map([['Example/CountControls/1', library]]) },
      );
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    });
  }
});
