import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(body: string) {
  const ast = parse(`//@version=5\nlibrary("Globals")\n${body}`);
  return checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('exported library inferred global qualifiers', () => {
  it('admits an unmodified var literal global', () => {
    expect(errors('var int LIMIT = 4999\nexport read(int x) => x + LIMIT')).toEqual([]);
  });
  it('admits a const math overload global', () => {
    expect(errors('LOG_TWO = math.log(2)\nexport read(float x) => math.log(x) / LOG_TWO')).toEqual([]);
  });
  for (const name of ['SMA', 'EMA', 'WMA', 'CMA', 'VWMA', 'VAWMA']) {
    it(`admits inferred string global ${name} from MovingAverages/10`, () => {
      expect(errors(`SMA = 'SMA', EMA = 'EMA', WMA = 'WMA', CMA = 'CMA', VWMA = 'VWMA', VAWMA = 'VAWMA'\nexport read(string x) => x + ${name}`)).toEqual([]);
    });
  }
  it('retains rejection of an input global', () => {
    expect(errors('LIMIT = input.int(2)\nexport read(int x) => x + LIMIT')).toEqual([
      expect.objectContaining({ code: 'library-export', message: expect.stringContaining('non-const global variable: LIMIT') }),
    ]);
  });
  it('retains rejection of a series global', () => {
    expect(errors('VALUE = close\nexport read(float x) => x + VALUE')).toEqual([
      expect.objectContaining({ code: 'library-export', message: expect.stringContaining('non-const global variable: VALUE') }),
    ]);
  });
  it('retains rejection of a reassigned var', () => {
    expect(errors('var int LIMIT = 2\nLIMIT := bar_index\nexport read(int x) => x + LIMIT')).toEqual([
      expect.objectContaining({ code: 'library-export', message: expect.stringContaining('non-const global variable: LIMIT') }),
    ]);
  });
  it('retains rejection after reassignment to another literal', () => {
    expect(errors('var int LIMIT = 2\nLIMIT := 3\nexport read(int x) => x + LIMIT')).toEqual([
      expect.objectContaining({ code: 'library-export', message: expect.stringContaining('non-const global variable: LIMIT') }),
    ]);
  });
  it('preserves explicit const globals', () => {
    expect(errors('const int LIMIT = 2\nexport read(int x) => x + LIMIT')).toEqual([]);
  });
  it('preserves parameter shadowing of a series global', () => {
    expect(errors('VALUE = close\nexport read(float VALUE) => VALUE + 1')).toEqual([]);
  });
});
