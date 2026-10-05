import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Declaration-statements manual: exactly one global declaration in a full script.
function check(source: string) {
  return checkProgram(parse(`//@version=6\n${source}\n`), { requireDeclaration: true }).diagnostics;
}

describe('ledger gaps 45: declaration cardinality and scope', () => {
  it('1777 requires a declaration when checking a complete script', () => {
    expect(
      checkProgram(parse('//@version=6\nplot(close)'), { requireDeclaration: true }).diagnostics.filter(
        (diagnostic) => diagnostic.code === 'declaration-count' && diagnostic.severity === 'error',
      ),
    ).toHaveLength(1);
  });

  it('1777 preserves declaration-free fragment checking by default', () => {
    expect(checkProgram(parse('value = close\nplot(value)')).diagnostics).toEqual([]);
  });

  it.each([
    'indicator("Indicator")\nplot(close)',
    'strategy("Strategy")\nplot(close)',
    'library("Library")\nexport identity(float source) => source',
  ])('1777 accepts exactly one global declaration in complete scripts: %s', (source) => {
    expect(checkProgram(parse(`//@version=6\n${source}`), { requireDeclaration: true }).diagnostics).toEqual([]);
  });

  it.each([
    'indicator("One")\nindicator("Two")\nplot(close)',
    'indicator("One")\nstrategy("Two")\nplot(close)',
    'library("One")\nindicator("Two")\nexport identity(float source) => source',
  ])('1777 refuses multiple global declarations: %s', (source) => {
    expect(
      check(source).filter((diagnostic) => diagnostic.code === 'declaration-count' && diagnostic.severity === 'error'),
    ).toHaveLength(1);
  });

  it.each([
    'indicator("Global")\nif true\n    indicator("Local")\nplot(close)',
    'indicator("Global")\nfor i = 1 to 2\n    strategy("Local")\nplot(close)',
    'indicator("Global")\nif true\n    library("Local")\nplot(close)',
  ])('1777 refuses declaration statements inside a local scope: %s', (source) => {
    expect(
      check(source).filter((diagnostic) => diagnostic.code === 'declaration-scope' && diagnostic.severity === 'error'),
    ).toHaveLength(1);
  });
});
