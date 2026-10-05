import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: language/enums, distinct enum types remain unique despite identical fields.
const prefix = '//@version=6\nindicator("Enum identity")\nenum First\n    one = "Same"\n    two\nenum Second\n    one = "Same"\n    two\n';
const errors = (body: string) => checkProgram(parse(prefix + body)).diagnostics.filter((entry) => entry.severity === 'error');
describe('worklist enum nominal assignment and argument identity', () => {
  it('admits matching explicit/inferred assignment and typed arguments', () => {
    expect(errors('First value = First.one\nvalue := First.two\ninferred = First.one\ninferred := First.two\nconsume(First x) => x == First.two\nplot(consume(value) ? 1 : 0)')).toEqual([]);
  });
  it.each(['First value = Second.one', 'value = First.one\nvalue := Second.two'])('rejects a different enum in %s', (body) => {
    expect(errors(body + '\nplot(1)').some((entry) => entry.code === 'type-mismatch')).toBe(true);
  });
  it('rejects a distinct enum argument with the same member title', () => {
    expect(errors('consume(First x) => x == First.one\nplot(consume(Second.one) ? 1 : 0)').length).toBeGreaterThan(0);
  });
});
