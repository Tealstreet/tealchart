import { describe, expect, it } from 'vitest';

import { parse } from './parser';

describe('Explicit expression grouping', () => {
  it.each(['(source - removed)', '((source - removed))'])(
    '%s retains an explicit grouping marker',
    (source) => {
      expect(parse(source, { startRule: 'Expression' })).toHaveProperty('parenthesized', true);
    },
  );

  it('keeps grouping on the nested left child', () => {
    const expression = parse('(source - removed) - next', { startRule: 'Expression' });
    expect(expression).not.toHaveProperty('parenthesized');
    expect(expression).toMatchObject({ type: 'BinaryExpression', left: { parenthesized: true } });
  });

  it('keeps grouping on the nested right child', () => {
    const expression = parse('source - (removed - next)', { startRule: 'Expression' });
    expect(expression).not.toHaveProperty('parenthesized');
    expect(expression).toMatchObject({ type: 'BinaryExpression', right: { parenthesized: true } });
  });
});
