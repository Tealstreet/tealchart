import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

describe('direct na comparison versions', () => {
  it.each(['==', '!='])('warns for v5 %s and refuses v6', (operator) => {
    for (const version of [5, 6]) {
      for (const expression of [`close ${operator} na`, `na ${operator} close`]) {
        const result = checkProgram(
          parse(`//@version=${version}\nindicator("Direct na")\nplot(${expression} ? 1 : 0)`),
        );
        expect(result.diagnostics.filter((d) => d.code === 'invalid-na-comparison')).toMatchObject([
          { severity: version === 5 ? 'warning' : 'error' },
        ]);
        expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(version === 5 ? 0 : 1);
      }
    }
  });
  it.each([5, 6])('accepts na(value) in v%s', (version) => {
    expect(
      checkProgram(parse(`//@version=${version}\nindicator("na helper")\nplot(na(close) ? 1 : 0)`)).diagnostics,
    ).toEqual([]);
  });
});
