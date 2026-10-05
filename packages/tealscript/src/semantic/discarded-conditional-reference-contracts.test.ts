import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const mixed = `if close > open
        close
    else
        "open"`;
const bodies = [
  ['function', `f() =>\n    ${mixed}\n    1\nvalue = f()`],
  ['for', `value = for i = 1 to 1\n    ${mixed}\n    1`],
  ['while', `value = while false\n    ${mixed}\n    1`],
  ['switch', `value = switch\n    close > 0 =>\n        if close > open\n            close\n        else\n            "open"\n        1\n    => 1`],
] as const;

// Conditional structures / matching-local-block-type-requirement: discarded values need not match.
describe('discarded conditional values', () => {
  it.each(bodies)('allows different discarded branch types inside a %s', (_, body) => {
    const result = checkProgram(parse(`//@version=6
indicator("Discarded branches")
${body}`));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('int');
  });
});
