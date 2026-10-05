import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { checkProgram } from '../../src/semantic/checker';

// Version migration preserves numeric sources while renaming v4 x/y.
// Independent verifier: oracle-replay-v1/verifier-ledger11-v1/verification-v2.md.
describe('legacy crossunder numeric operands', () => {
  it.each([['strings', '"A"', '"B"'], ['booleans', 'true', 'false']])
    ('refuses %s in legacy and modern operand slots', (_kind, first, second) => {
      for (const args of [`${first}, ${second}`, `x=${first}, y=${second}`, `y=${second}, x=${first}`, `${first}, y=${second}`, `x=${first}, ${second}`]) {
        const ast = parse(`//@version=4\nstudy("Operand kinds")\nplot(crossunder(${args}) ? 1 : 0)`);
        const errors = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        expect(errors.filter((diagnostic) => diagnostic.code === 'type-mismatch'), args).toHaveLength(2);
        expect(errors.every((diagnostic) => diagnostic.message.includes('must be a number')), args).toBe(true);
      }
      const modern = parse(`//@version=5\nindicator("Operand kinds")\nplot(ta.crossunder(source2=${second}, source1=${first}) ? 1 : 0)`);
      expect(checkProgram(modern).diagnostics.filter((diagnostic) => diagnostic.code === 'type-mismatch')).toHaveLength(2);
      const local = parse(`//@version=4\nstudy("Local shadow")\ncrossunder(x, y) => true\nplot(crossunder(x=${first}, y=${second}) ? 1 : 0)`);
      expect(checkProgram(local).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    });
});
