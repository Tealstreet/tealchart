import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

// Pine script-structure documentation permits comma-separated one-line
// statements. These are hand-written programs, independent of corpus source.
describe('global declaration statement chains', () => {
  it('chains a variable declaration and plot after an indicator declaration', () => {
    const ast = parse('//@version=6\nindicator("chain"), seed = 2, plot(seed)\n');
    expect(ast.body.map((statement) => statement.type)).toEqual(['IndicatorDeclaration', 'VariableDeclaration', 'ExpressionStatement']);
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(executeScript(ast, bars).plots[0].values).toEqual([2]);
  });

  it('allows a wrapped comma after a multiline indicator declaration', () => {
    const ast = parse('//@version=6\nindicator("chain",\n overlay=true)\n , seed = 3\nplot(seed)\n');
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(executeScript(ast, bars).plots[0].values).toEqual([3]);
  });

  it('chains two imports with explicit aliases and resolves both libraries', () => {
    const library = parse('//@version=6\nlibrary("One")\nexport value() => 1\n');
    const ast = parse('//@version=6\nindicator("imports")\nimport Test/One/1 as a, import Test/Two/1 as b\nplot(a.value() + b.value())\n');
    // Verified b54f5b5b8b permits one import per library version.
    // Preserve the comma-chain grammar control using two distinct libraries.
    const secondLibrary = parse('//@version=6\nlibrary("Two")\nexport value() => 1\n');
    const libraries = new Map([['Test/One/1', library], ['Test/Two/1', secondLibrary]]);
    expect(ast.body.filter((statement) => statement.type === 'ImportDeclaration')).toHaveLength(2);
    expect(checkProgram(ast, { libraries }).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars, undefined, { libraries });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([2]);
  });

  it('retains default import aliases in a chain', () => {
    const ast = parse('//@version=6\nindicator("imports")\nimport Test/One/1, import Test/Two/1\nplot(close)\n');
    expect(ast.body.flatMap((statement) => statement.type === 'ImportDeclaration' ? [statement.alias.name] : [])).toEqual(['One', 'Two']);
  });
});
