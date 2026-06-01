import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

describe('semantic checker', () => {
  it('accepts known Pine globals, namespaces, and user declarations', () => {
    const result = checkProgram(parse(`
indicator("Semantic OK")
length = input.int(3)
basis = ta.sma(close, length)
spread(source) => source - basis
plot(spread(high), title="Spread")
plot(not na(time("1", "0930-1600")) ? 1 : 0, title="Session")
`));

    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      'variable:length',
      'variable:basis',
      'function:spread',
    ]);
  });

  it('reports duplicate declarations in the same scope', () => {
    const result = checkProgram(parse(`
indicator("Duplicate")
length = 3
length = 5
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate-symbol',
        message: 'Duplicate declaration: length',
      }),
    ]);
  });

  it('allows nested scopes to shadow outer declarations', () => {
    const result = checkProgram(parse(`
indicator("Shadow")
value = 1
adjust(value) =>
    value + 1
plot(adjust(close))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports duplicate function parameters and tuple names', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Params")
bad(left, left) => left
[a, a] = [1, 2]
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Duplicate declaration: left',
      'Duplicate declaration: a',
    ]);
  });

  it('reports assignments to undeclared identifiers', () => {
    const result = checkProgram(parse(`
indicator("Unknown Assignment")
known = close
missing := known + 1
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-assignment-target',
        message: 'Cannot assign to undeclared identifier: missing',
      }),
    ]);
  });

  it('reports unknown identifiers and functions', () => {
    const result = checkProgram(parse(`
indicator("Unknowns")
value = missingSource + 1
plot(customFn(value))
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown identifier: missingSource',
      'Unknown function: customFn',
    ]);
  });

  it('records value and reference types from annotations', () => {
    const result = checkProgram(parse(`
indicator("Typed Symbols")
type pivotPoint
    int x
    float y
int length = 3
float basis = 1.5
bool enabled = true
string labelText = "hi"
color tint = color.red
array<float> values = array.new_float()
matrix<int> grid = matrix.new<int>(1, 1, 0)
map<string, float> lookup = map.new<string, float>()
pivotPoint pivot = na
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('length')).toMatchObject({ kind: 'int' });
    expect(types.get('basis')).toMatchObject({ kind: 'float' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool' });
    expect(types.get('labelText')).toMatchObject({ kind: 'string' });
    expect(types.get('tint')).toMatchObject({ kind: 'color' });
    expect(types.get('values')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('grid')).toMatchObject({ kind: 'matrix', elementType: { kind: 'int' } });
    expect(types.get('lookup')).toMatchObject({
      kind: 'map',
      keyType: { kind: 'string' },
      valueType: { kind: 'float' },
    });
    expect(types.get('pivot')).toMatchObject({ kind: 'udt', name: 'pivotPoint' });
  });

  it('infers simple literal and array expression types', () => {
    const result = checkProgram(parse(`
indicator("Inferred Symbols")
count = 3
ratio = 1.5
enabled = true
name = "BTC"
tint = #ff00ff
values = [1, 2]
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('count')).toMatchObject({ kind: 'int' });
    expect(types.get('ratio')).toMatchObject({ kind: 'float' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool' });
    expect(types.get('name')).toMatchObject({ kind: 'string' });
    expect(types.get('tint')).toMatchObject({ kind: 'color' });
    expect(types.get('values')).toMatchObject({ kind: 'array' });
  });

  it('records explicit qualifiers and infers common qualifier sources', () => {
    const result = checkProgram(parse(`
indicator("Qualifiers")
const int literal = 3
input int configured = input.int(14)
simple int promoted = configured
series float price = close
series float average = ta.sma(close, configured)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('literal')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('configured')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('promoted')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('price')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('average')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid qualifier demotions', () => {
    const result = checkProgram(parse(`
indicator("Bad Qualifier")
simple float badPrice = close
input float badAverage = ta.sma(close, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple float',
      'Cannot assign series value to input float',
    ]);
  });

  it('reports invalid built-in argument names, counts, and ordering', () => {
    const result = checkProgram(parse(`
indicator("Bad Builtins")
one = ta.sma(close)
two = ta.rsi(source=close, length=14, bad=14)
three = plot(series=close, "bad order")
four = color.new(color.red, 10, 20)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'ta.sma() expects at least 2 arguments',
      "Unknown argument 'bad' for ta.rsi()",
      'plot() cannot use positional arguments after named arguments',
      'color.new() expects at most 2 arguments',
    ]);
  });

  it('reports duplicate built-in bindings from positional and named arguments', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Builtin Args")
value = ta.sma(close, source=open, length=14)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.sma() was supplied multiple times",
    ]);
  });
});
