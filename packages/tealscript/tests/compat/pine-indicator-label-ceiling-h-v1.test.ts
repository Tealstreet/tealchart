import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(count: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("Label ceiling", max_labels_count=${count})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator resolved constant label ceiling', () => {
  it.each([
    ['500 + 1', ''],
    ['COUNT', 'const int COUNT = 501\n'],
    ['BASE + 1', 'const int BASE = 500\n'],
    ['COUNT', 'const int BASE = 500\nconst int COUNT = BASE + 1\n'],
  ])('refuses above-ceiling const count %s (%s)', (count, setup) => {
    expect(errors(count, setup)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: 'indicator max_labels_count must be a non-negative integer no greater than 500' }),
    ]));
  });
  it.each([
    ['1', ''],
    ['500', ''],
    ['250 * 2', ''],
    ['COUNT', 'const int BASE = 499\nconst int COUNT = BASE + 1\n'],
  ])('admits valid const count %s (%s)', (count, setup) => {
    expect(errors(count, setup)).toEqual([]);
  });
  it('retains literal 501 refusal', () => {
    expect(errors('501')).toHaveLength(1);
  });
  it.each(['bar_index', 'input.int(10)'])('retains non-const %s refusal', (count) => {
    expect(errors(count).length).toBeGreaterThan(0);
  });
  it('leaves the equivalent strategy check unchanged', () => {
    expect(errors('500 + 1', '', 'strategy')).toEqual([]);
  });
});
