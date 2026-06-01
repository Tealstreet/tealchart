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
plot(time_tradingday, title="Trading Day")
plot(last_bar_time, title="Last Bar Time")
`));

    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      'variable:length',
      'variable:basis',
      'function:spread',
    ]);
  });

  it('accepts calendar functions with named time and timezone arguments', () => {
    const result = checkProgram(parse(`
indicator("Calendar Functions")
stamp = timestamp("Asia/Singapore", 2024, 1, 6, 0, 5, 7)
plot(year(time=stamp, timezone="Asia/Singapore"))
plot(month(time=stamp, timezone="Asia/Singapore"))
plot(weekofyear(time=stamp, timezone="Asia/Singapore"))
plot(dayofmonth(time=stamp, timezone="Asia/Singapore"))
plot(dayofweek(time=stamp, timezone="Asia/Singapore"))
plot(hour(time=stamp, timezone="Asia/Singapore"))
plot(minute(time=stamp, timezone="Asia/Singapore"))
plot(second(time=stamp, timezone="Asia/Singapore"))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts named timestamp and time filter arguments', () => {
    const result = checkProgram(parse(`
indicator("Time Variants")
stamp = timestamp(timezone="America/New_York", year=2024, month=1, day=5, hour=9, minute=30)
dateStamp = timestamp("20 Aug 2024 00:00:00 +0000")
plot(time(timeframe="60", session="0930-1600", timezone="America/New_York"))
plot(time_close(timeframe="60", session="0930-1600", timezone="America/New_York"))
plot(stamp + dateStamp)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts timeframe utility functions with named arguments', () => {
    const result = checkProgram(parse(`
indicator("Timeframe Utilities")
isLower = timeframe.in_seconds(timeframe="15") < timeframe.in_seconds("1D")
rounded = timeframe.from_seconds(seconds=44)
changed = timeframe.change(timeframe="60")
plot(isLower and changed ? 1 : 0)
`));

    expect(result.diagnostics).toEqual([]);
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

  it('reports invalid library export declarations', () => {
    const validLibrary = checkProgram(parse(`
library("Valid")
export type Pivot
    float y
export scale(float value, simple float multiplier) => value * multiplier
export method lifted(Pivot this, float amount) => this
`));
    const emptyLibrary = checkProgram(parse(`
library("Empty")
helper(float value) => value
`));
    const exportedInIndicator = checkProgram(parse(`
indicator("Export Outside Library")
export scale(float value) => value * 2
export type Pivot
    float y
`));
    const untypedExport = checkProgram(parse(`
library("Untyped Export")
export scale(value, float multiplier) => value * multiplier
export method lifted(Pivot this, amount) => this
export type Pivot
    float y
`));

    expect(validLibrary.diagnostics).toEqual([]);
    expect(emptyLibrary.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Library scripts must export at least one function, method, or user-defined type',
    ]);
    expect(exportedInIndicator.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported declarations are only allowed in library scripts: scale',
      'Exported declarations are only allowed in library scripts: Pivot',
    ]);
    expect(untypedExport.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function scale parameter value must declare a type',
      'Exported method lifted parameter amount must declare a type',
    ]);
  });

  it('reports invalid exported library function scopes', () => {
    const result = checkProgram(parse(`
library("Export Scope")
const int allowed = 2
scale = input.int(2)
globalPrice = close
export usesGlobals(float value) =>
    localScale = allowed
    value * scale + globalPrice + localScale
export usesInput(float value) =>
    length = input.int(14)
    value + length
export shadowsGlobal(float scale) => scale + allowed
export lateShadow(float value) =>
    before = value + scale
    scale = 1
    before + scale
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function usesGlobals cannot use non-const global variable: scale',
      'Exported function usesGlobals cannot use non-const global variable: globalPrice',
      'Exported function usesInput cannot call input.*() functions',
      'Exported function lateShadow cannot use non-const global variable: scale',
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

  it('validates template annotation type arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Templates")
array<series> invalidArray = array.new_float()
matrix<input> invalidMatrix = matrix.new_int()
map<label, float> invalidKey = map.new<label, float>()
map<string, series> invalidValue = map.new<string, float>()
map<const, float> qualifierKey = map.new<string, float>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      "Invalid matrix element type 'input'; qualifiers cannot be used as template types",
      'Map key type must be int, float, bool, string, or color in variable declaration',
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map key type 'const'; qualifiers cannot be used as template types",
    ]);
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

  it('resolves Pine input overload bindings for range and options calls', () => {
    const result = checkProgram(parse(`
indicator("Input Overloads")
rangeLength = input.int(14, "Length", 1, 50, 1, "Range tooltip")
optionLength = input.int(14, "Length", [7, 14, 21], "Options tooltip")
rangeFloat = input.float(2.0, "Multiplier", minval=1.0, maxval=4.0)
optionFloat = input.float(2.0, "Multiplier", options=[1.0, 2.0, 3.0])
tf = input.timeframe("60", "Timeframe", ["15", "60"], "TF tooltip")
source = input.source(close, "Source", "Source tooltip", "src", "Data", true)
price = input.price(101.25, "Level", "Drag level")
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports duplicate Pine input bindings against the selected overload', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Input Args")
rangeLength = input.int(14, "Length", 1, 50, 1, minval=2)
optionLength = input.int(14, "Length", [7, 14, 21], options=[14, 21])
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'minval' for input.int() was supplied multiple times",
      "Argument 'options' for input.int() was supplied multiple times",
    ]);
  });

  it('reports invalid user-defined type constructor arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Constructor")
type Pivot
    int x
    float y
tooMany = Pivot.new(1, 2.0, 3.0)
unknown = Pivot.new(z=1)
duplicate = Pivot.new(1, x=2)
duplicateNamed = Pivot.new(y=1, y=2)
badOrder = Pivot.new(x=1, "bad")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Pivot.new() expects at most 2 arguments',
      "Unknown field 'z' for Pivot.new()",
      "Field 'x' for Pivot.new() was supplied multiple times",
      "Field 'y' for Pivot.new() was supplied multiple times",
      'Pivot.new() cannot use positional arguments after named arguments',
    ]);
  });

  it('reports unknown user-defined type fields on reads and assignments', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Fields")
type Pivot
    int x
    float y
pivot = Pivot.new(1, close)
valid = pivot.x
missing = pivot.z
pivot.other := 1
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown field 'z' on type Pivot",
      "Unknown field 'other' on type Pivot",
    ]);
    expect(result.symbols.find((symbol) => symbol.name === 'valid')?.type).toMatchObject({ kind: 'int' });
  });

  it('does not treat user-defined method calls as field reads', () => {
    const result = checkProgram(parse(`
indicator("UDT Methods")
type Pivot
    float y
method lift(Pivot this, float amount) =>
    this.y += amount
    this
pivot = Pivot.new(close)
lifted = pivot.lift(1)
plot(lifted.y)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports conservative user-defined type field value mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Field Types")
type Pivot
    int x
    float y
    bool active
    string name
    color tint
    label tag
valid = Pivot.new(1, 2, true, "pivot", #ff00ff, na)
badCtor = Pivot.new("bad", "also bad", "yes", 3, "not color", "not checked")
pivot = Pivot.new(1, 2.0, true, "pivot", #00ffff, na)
pivot.x := "bad"
pivot.y := "bad"
pivot.active := 1
pivot.name := 3
pivot.tint := "not color"
pivot.tag := "not checked"
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign string value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign int value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
    ]);
  });

  it('rejects mixed Pine input range and options overload arguments', () => {
    const result = checkProgram(parse(`
indicator("Mixed Input Overloads")
length = input.int(14, "Length", options=[7, 14, 21], minval=1)
multiplier = input.float(2.0, "Multiplier", options=[1.0, 2.0], step=0.5)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'minval' for input.int()",
      "Unknown argument 'step' for input.float()",
    ]);
  });
});
