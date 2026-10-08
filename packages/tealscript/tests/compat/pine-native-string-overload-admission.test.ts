import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const program = (expression: string) => `//@version=6
indicator("String argument kinds")
enum ReviewEnum
    one = "One"
enum Direction
    up = "UP"
value = ${expression}
plot(str.length(value))`;

const refusals = [
  ['str.format("{0}", ReviewEnum.one)', 'str.format', 'enum'],
  ['str.format("{0}", matrix.new<bool>(1, 2, true))', 'str.format', 'matrix'],
  ['str.format("{0}", matrix.new<float>(1, 2, 1.2))', 'str.format', 'matrix'],
  ['str.format("{0}", matrix.new<int>(1, 2, 1))', 'str.format', 'matrix'],
  ['str.format("{0}", matrix.new<string>(1, 2, "abc"))', 'str.format', 'matrix'],
  ['str.tostring(array.new<bool>(2, true), "#.00")', 'str.tostring', 'array'],
  ['str.tostring(array.new<string>(2, "abc"), "#.00")', 'str.tostring', 'array'],
  ['str.tostring(true, "#.00")', 'str.tostring', 'bool'],
  ['str.tostring(ReviewEnum.one, "#.00")', 'str.tostring', 'enum'],
  ['str.tostring(matrix.new<bool>(1, 2, true), "#.00")', 'str.tostring', 'matrix'],
  ['str.tostring(matrix.new<string>(1, 2, "abc"), "#.00")', 'str.tostring', 'matrix'],
  ['str.tostring("abc", "#.00")', 'str.tostring', 'string'],
] as const;
const controls = [
  'str.tostring(Direction.up)',
  'str.format("{0}", 3)',
  'str.format("{0}", 1.5)',
  'str.format("{0}", true)',
  'str.format("{0}", "abc")',
  'str.format("{0}", array.from(1,2))',
  'str.format("{0}", array.from(true,false))',
  'str.format("{0}", array.from("a","b"))',
  'str.tostring(3,"#.00")',
  'str.tostring(1.5,"#.00")',
  'str.tostring(array.from(1,2),"#.00")',
  'str.tostring(array.from(1.5,2.5),"#.00")',
  'str.tostring(matrix.new<int>(1,1,2),"#.00")',
  'str.tostring(matrix.new<float>(1,1,2.5),"#.00")',
  'str.tostring(true)',
  'str.tostring("abc")',
  'str.tostring(format="#.00",value=2.5)',
];

describe('string conversion argument kinds', () => {
  for (const [expression, callee, kind] of refusals) {
    it(`refuses ${expression}`, () => {
      const checked = checkProgram(parse(program(expression)));
      const errors = checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
      expect(errors).not.toEqual([]);
      const messages = errors.map((error) => error.message).join(' ');
      expect(messages).toContain(callee);
      expect(messages).toContain(kind);
    });
  }
  for (const expression of controls) {
    it(`admits ${expression}`, () => {
      const checked = checkProgram(parse(program(expression)));
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    });
  }
});
