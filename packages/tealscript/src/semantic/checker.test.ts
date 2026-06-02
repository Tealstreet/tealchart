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
      'Library scripts must export at least one function, method, user-defined type, or constant',
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

  it('validates exported library constants', () => {
    const valid = checkProgram(parse(`
library("Constants")
export const int length = 14
export color bull = color.green
export float ratio = math.pi
export string period = timeframe.period
export string ticker = syminfo.ticker
export prefix(simple string value) => value
`));

    const outsideLibrary = checkProgram(parse(`
export const int outside = 1
indicator("Outside")
plot(close)
`));

    const invalid = checkProgram(parse(`
library("Bad Constants")
export value = 1
export const float seriesValue = close
export const int functionReference = ta.sma
export const string requestReference = request.security
export [a, b] = array.from(1, 2)
`));

    expect(valid.diagnostics).toEqual([]);
    expect(outsideLibrary.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported declarations are only allowed in library scripts: outside',
    ]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported constants must declare a type',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants cannot use tuple declarations',
      'Exported constants must declare a type',
      'Exported constants must be literal values or compatible built-in variables',
      'Cannot assign series value to const float',
    ]);
  });

  it('reports exported library signatures that expose non-exported user-defined types', () => {
    const result = checkProgram(parse(`
library("Exported UDT Contracts")
type Hidden
    float value
export type Visible
    Hidden direct
    array<Hidden> list
    map<string, Hidden> lookup
export consume(Hidden direct, array<Hidden> list, map<string, Hidden> lookup) => direct.value
export method lifted(Hidden this, float amount) => this
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported field direct in Visible uses non-exported user-defined type: Hidden',
      'Exported field list in Visible uses non-exported user-defined type: Hidden',
      'Exported field lookup in Visible uses non-exported user-defined type: Hidden',
      'Exported function parameter direct in consume uses non-exported user-defined type: Hidden',
      'Exported function parameter list in consume uses non-exported user-defined type: Hidden',
      'Exported function parameter lookup in consume uses non-exported user-defined type: Hidden',
      'Exported method parameter this in lifted uses non-exported user-defined type: Hidden',
      'Exported method lifted returns non-exported user-defined type: Hidden',
    ]);
  });

  it('reports exported library callables that return non-exported user-defined types', () => {
    const result = checkProgram(parse(`
library("Exported UDT Returns")
type Hidden
    float value
export type Visible
    float value
export makeHidden(float value) => Hidden.new(value)
export makeHiddenList(float value) => array.from(Hidden.new(value))
export makeHiddenMap(float value) => map.new<string, Hidden>()
export makeHiddenFromBlock(float value) =>
    result = Hidden.new(value)
    result
export makeVisible(float value) => Visible.new(value)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function makeHidden returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenList returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenMap returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenFromBlock returns non-exported user-defined type: Hidden',
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
export assignsGlobal(float value) =>
    scale := value
    value
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
      'Exported function assignsGlobal cannot use non-const global variable: scale',
      'Exported function usesInput cannot call input.*() functions',
      'Exported function lateShadow cannot use non-const global variable: scale',
    ]);
  });

  it('reports exported library request expressions that depend on parameters', () => {
    const result = checkProgram(parse(`
library("Export Request Scope")
export validRequest(float value) => request.security(syminfo.tickerid, "1", close)
export invalidPositional(float value) => request.security(syminfo.tickerid, "1", value)
export invalidNamed(float value) => request.security(syminfo.tickerid, "1", expression=value + close)
export invalidNested(float value) => request.security(syminfo.tickerid, "1", ta.sma(value, 2))
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function invalidPositional request expression cannot depend on exported parameters',
      'Exported function invalidNamed request expression cannot depend on exported parameters',
      'Exported function invalidNested request expression cannot depend on exported parameters',
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
genericValues = array.new<float>()
genericGrid = matrix.new<float>(1, 1, 0)
floatValues = array.new_float()
intValues = array.new_int()
labelValues = array.new_label()
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
    expect(types.get('genericValues')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('genericGrid')).toMatchObject({ kind: 'matrix', elementType: { kind: 'float' } });
    expect(types.get('floatValues')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('intValues')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('labelValues')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
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
invalidArrayCtorElement = array.new<series>()
invalidArrayCtorArity = array.new<float, int>()
array<array> invalidNestedArray = array.new_float()
invalidArrayCtorCollection = array.new<array>()
array<array<float>> unsupportedNestedArray = array.new_float()
invalidArrayCtorNestedCollection = array.new<array<float>>()
matrix<input> invalidMatrix = matrix.new_int()
invalidMatrixCtorElement = matrix.new<series>()
invalidMatrixCtorArity = matrix.new<float, int>()
matrix<map> invalidNestedMatrix = matrix.new_float()
invalidMatrixCtorCollection = matrix.new<map>()
matrix<map<string, float>> unsupportedNestedMatrix = matrix.new_float()
invalidMatrixCtorNestedCollection = matrix.new<map<string, float>>()
map<label, float> invalidKey = map.new<string, float>()
map<array<float>, float> invalidNestedKey = map.new<string, float>()
map<string, series> invalidValue = map.new<string, float>()
map<string, array> invalidCollectionValue = map.new<string, float>()
map<string, array<float>> unsupportedNestedValue = map.new<string, float>()
map<const, float> qualifierKey = map.new<string, float>()
invalidCtorKey = map.new<label, float>()
invalidCtorNestedKey = map.new<array<float>, float>()
invalidCtorValue = map.new<string, series>()
invalidCtorCollectionValue = map.new<string, matrix>()
invalidCtorNestedValue = map.new<string, matrix<float>>()
invalidCtorArity = map.new<string>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      'array.new() expects exactly 1 type argument',
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid array element type 'array<float>'; collections cannot directly contain collection types",
      "Invalid array element type 'array<float>'; collections cannot directly contain collection types",
      "Invalid matrix element type 'input'; qualifiers cannot be used as template types",
      "Invalid matrix element type 'series'; qualifiers cannot be used as template types",
      'matrix.new() expects exactly 1 type argument',
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      "Invalid matrix element type 'map<string, float>'; collections cannot directly contain collection types",
      "Invalid matrix element type 'map<string, float>'; collections cannot directly contain collection types",
      'Map key type must be int, float, bool, string, or color in variable declaration',
      "Invalid map key type 'array<float>'; collections cannot directly contain collection types",
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'array'; collection template types must include their element templates",
      "Invalid map value type 'array<float>'; collections cannot directly contain collection types",
      "Invalid map key type 'const'; qualifiers cannot be used as template types",
      'Map key type must be int, float, bool, string, or color in map.new',
      "Invalid map key type 'array<float>'; collections cannot directly contain collection types",
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'matrix'; collection template types must include their element templates",
      "Invalid map value type 'matrix<float>'; collections cannot directly contain collection types",
      'map.new() expects exactly 2 type arguments',
    ]);
  });

  it('reports map key and value template mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad Map Types")
map<string, float> prices = map.new<string, float>()
map<string, label> labels = map.new<string, label>()
type Pivot
    float price
type Other
    float price
map<string, Pivot> pivots = map.new<string, Pivot>()
map.put(prices, "BTC", 1)
prices.put("ETH", 2.5)
labels.put("entry", label.new(bar_index, close))
pivots.put("high", Pivot.new(high))
map.get(prices, 1)
prices.contains(true)
prices.remove(2)
map.put(prices, 3, 4)
prices.put("SOL", "bad")
labels.put("bad", line.new(bar_index, low, bar_index, high))
pivots.put("bad", Other.new(low))
string symbol = "DOGE"
float price = 3
prices.put(symbol, price)
inferred = map.new<string, float>()
inferred.put(1, 1)
inferred.put("ADA", "bad")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use int value as string map key',
      'Cannot use bool value as string map key',
      'Cannot use int value as string map key',
      'Cannot use int value as string map key',
      'Cannot use string value as float map value',
      'Cannot use line value as label map value',
      'Cannot use Other value as Pivot map value',
      'Cannot use int value as string map key',
      'Cannot use string value as float map value',
    ]);
  });

  it('reports array element template mismatches for known mutable arrays', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Types")
array<float> prices = array.new_float()
array.push(prices, 1)
prices.push(2.5)
array.push(prices, "bad")
prices.unshift(true)
prices.set(0, "bad")
array.insert(prices, 0, "bad")
array.fill(prices, "bad")
typed = array.new_int()
typed.push(1)
typed.push("bad")
copied = prices.copy()
copied.push("bad")
window = array.slice(prices, 0, 1)
window.push("bad")
indices = prices.sort_indices()
indices.push("bad")
absolute = array.abs(prices)
absolute.push("bad")
ints = array.new_int()
prices.concat(ints)
strings = array.new_string()
prices.concat(strings)
array.concat(prices, strings)
unknown = array.from(1, "mixed")
unknown.push("allowed")
prices.concat(unknown)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use string value as float array element',
      'Cannot use bool value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as int array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as int array element',
      'Cannot use string value as float array element',
      'Cannot concatenate string array into float array',
      'Cannot concatenate string array into float array',
    ]);
  });

  it('infers collection and numeric for-loop symbol types', () => {
    const result = checkProgram(parse(`
indicator("Loop Types")
prices = array.new_float()
ints = array.new_int()
strings = array.new_string()
for value in prices
    prices.push(value)
    ints.push(value)
for [index, value] in prices
    ints.push(index)
    strings.push(index)
m = map.new<string, float>()
for [key, value] in m
    strings.push(key)
    ints.push(key)
    prices.push(value)
    ints.push(value)
for i = 0 to 2
    ints.push(i)
    strings.push(i)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use int value as string array element',
      'Cannot use string value as int array element',
      'Cannot use float value as int array element',
      'Cannot use int value as string array element',
    ]);
  });

  it('infers array element read types', () => {
    const result = checkProgram(parse(`
indicator("Array Read Types")
prices = array.new_float()
ints = array.new_int()
fromIndex = prices[0]
fromGet = prices.get(0)
fromFirst = array.first(prices)
fromLast = prices.last()
fromRemove = prices.remove(0)
ints.push(fromIndex)
ints.push(fromGet)
ints.push(fromFirst)
ints.push(fromLast)
ints.push(fromRemove)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('fromIndex')).toMatchObject({ kind: 'float' });
    expect(types.get('fromGet')).toMatchObject({ kind: 'float' });
    expect(types.get('fromFirst')).toMatchObject({ kind: 'float' });
    expect(types.get('fromLast')).toMatchObject({ kind: 'float' });
    expect(types.get('fromRemove')).toMatchObject({ kind: 'float' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
    ]);
  });

  it('infers matrix element reads and reports mutable element mismatches', () => {
    const result = checkProgram(parse(`
indicator("Matrix Types")
matrix<float> prices = matrix.new<float>(1, 1, 0)
matrix.set(prices, 0, 0, 1)
prices.set(0, 0, 2.5)
matrix.fill(prices, 3)
prices.fill(4.5)
matrix.set(prices, 0, 0, "bad")
prices.set(0, 0, true)
matrix.fill(prices, "bad")
prices.fill(true)
typed = matrix.new<int>(1, 1, 0)
typed.set(0, 0, 1)
typed.set(0, 0, "bad")
value = prices.get(0, 0)
ints = array.new_int()
ints.push(value)
namespaceValue = matrix.get(typed, 0, 0)
float widened = namespaceValue
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('value')).toMatchObject({ kind: 'float' });
    expect(types.get('namespaceValue')).toMatchObject({ kind: 'int' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use string value as float matrix element',
      'Cannot use bool value as float matrix element',
      'Cannot use string value as float matrix element',
      'Cannot use bool value as float matrix element',
      'Cannot use string value as int matrix element',
      'Cannot use float value as int array element',
    ]);
  });

  it('validates matrix sort_field const int and string requirements', () => {
    const result = checkProgram(parse(`
indicator("Matrix Sort Field Types")
type Ranked
    float score
    string name
values = matrix.new<Ranked>()
const string scoreField = "score"
const int nameField = 1
matrix.sort(values, 0, order.ascending, scoreField)
values.sort(0, order.descending, nameField)
values.sort(0, order.ascending, "score")
matrix.sort(values, 0, order.ascending, 1)
inputField = input.string("score")
simple string simpleField = "score"
seriesIndex = bar_index
int unqualifiedField = 1
matrix.sort(values, 0, order.ascending, inputField)
values.sort(0, order.ascending, simpleField)
values.sort(0, order.ascending, seriesIndex)
values.sort(0, order.ascending, unqualifiedField)
values.sort(0, order.ascending, true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'matrix.sort() sort_field requires const int or const string, got input unknown',
      'matrix.sort() sort_field requires const int or const string, got simple string',
      'matrix.sort() sort_field requires const int or const string, got series int',
      'matrix.sort() sort_field requires const int or const string, got unqualified int',
      'matrix.sort() sort_field must be a const int or const string, got bool',
    ]);
  });

  it('validates array sort_field const int and string requirements', () => {
    const result = checkProgram(parse(`
indicator("Array Sort Field Types")
type Ranked
    float score
    string name
values = array.new<Ranked>()
const string scoreField = "score"
const int nameField = 1
array.sort(values, order.ascending, scoreField)
values.sort(order.descending, nameField)
values.sort(order.ascending, "score")
array.sort(values, order.ascending, 1)
inputField = input.string("score")
simple string simpleField = "score"
seriesIndex = bar_index
int unqualifiedField = 1
array.sort(values, order.ascending, inputField)
values.sort(order.ascending, simpleField)
values.sort(order.ascending, seriesIndex)
values.sort(order.ascending, unqualifiedField)
values.sort(order.ascending, true)
matrixValues = matrix.new<float>()
matrixValues.sort(0, order.ascending, inputField)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.sort() sort_field requires const int or const string, got input unknown',
      'array.sort() sort_field requires const int or const string, got simple string',
      'array.sort() sort_field requires const int or const string, got series int',
      'array.sort() sort_field requires const int or const string, got unqualified int',
      'array.sort() sort_field must be a const int or const string, got bool',
      'matrix.sort() sort_field requires const int or const string, got input unknown',
    ]);
  });

  it('infers homogeneous array literal and array.from element types', () => {
    const result = checkProgram(parse(`
indicator("Array Literal Types")
literalInts = [1, 2]
literalFloats = [1, 2.5]
fromStrings = array.from("a", "b")
mixed = array.from(1, "b")
label labelId = na
fromLabels = array.from(labelId)
fromConstructedLabels = array.from(label.new(bar_index, close))
literalLabels = [label.new(bar_index, close)]
fromPoints = array.from(chart.point.from_index(bar_index, close))
ints = array.new_int()
strings = array.new_string()
labels = array.new_label()
ints.push(literalInts[0])
ints.push(literalFloats[0])
strings.push(array.get(fromStrings, 0))
labels.push(array.get(fromLabels, 0))
labels.push(array.get(fromConstructedLabels, 0))
labels.push(literalLabels[0])
labels.push("bad")
fromPoints.push(label.new(bar_index, close))
ints.push(array.get(fromStrings, 0))
ints.push(mixed[0])
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('literalInts')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('literalFloats')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('fromStrings')).toMatchObject({ kind: 'array', elementType: { kind: 'string' } });
    expect(types.get('fromLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('fromConstructedLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('literalLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('fromPoints')).toMatchObject({ kind: 'array', elementType: { kind: 'chart.point' } });
    expect(types.get('mixed')).toMatchObject({ kind: 'array', elementType: { kind: 'unknown' } });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use string value as label array element',
      'Cannot use label value as chart.point array element',
      'Cannot use string value as int array element',
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
floatValues = array.new_float()
copied = floatValues.copy()
sliced = array.slice(floatValues, 0, 1)
absolute = array.abs(floatValues)
standardized = floatValues.standardize()
indices = floatValues.sort_indices()
sizeValue = floatValues.size()
hasValue = array.includes(floatValues, 1.5)
indexValue = floatValues.indexof(1.5)
averageValue = array.avg(floatValues)
joinedValue = floatValues.join(",")
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('count')).toMatchObject({ kind: 'int' });
    expect(types.get('ratio')).toMatchObject({ kind: 'float' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool' });
    expect(types.get('name')).toMatchObject({ kind: 'string' });
    expect(types.get('tint')).toMatchObject({ kind: 'color' });
    expect(types.get('values')).toMatchObject({ kind: 'array' });
    expect(types.get('copied')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('sliced')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('absolute')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('standardized')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('indices')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('sizeValue')).toMatchObject({ kind: 'int' });
    expect(types.get('hasValue')).toMatchObject({ kind: 'bool' });
    expect(types.get('indexValue')).toMatchObject({ kind: 'int' });
    expect(types.get('averageValue')).toMatchObject({ kind: 'float' });
    expect(types.get('joinedValue')).toMatchObject({ kind: 'string' });
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

  it('reports user-defined method receiver mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad Method Receivers")
type Pivot
    float y
type Other
    float y
method lift(Pivot this, float amount) =>
    this.y += amount
    this
method scale(float this, float amount) => this * amount
pivot = Pivot.new(close)
other = Other.new(close)
count = 1
validPivot = pivot.lift(1)
validFloat = close.scale(2)
badUdt = other.lift(1)
badPrimitive = count.lift(1)
badScale = pivot.scale(2)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'No method lift() overload accepts Other receiver',
      'No method lift() overload accepts const int receiver',
      'No method scale() overload accepts Pivot receiver',
    ]);
  });

  it('does not report user method receiver mismatches for builtin collection member calls', () => {
    const result = checkProgram(parse(`
indicator("Builtin Method Names")
method size(float this) => this
values = array.new_float()
count = values.size()
plot(count)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('honors qualifiers for user-defined method receiver diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Qualified Method Receivers")
method smooth(simple float this) => this
literal = 1.0
valid = literal.smooth()
invalid = close.smooth()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'No method smooth() overload accepts series float receiver',
    ]);
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
      'Cannot assign string value to label field Pivot.tag',
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign int value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to label field Pivot.tag',
    ]);
  });

  it('reports user-defined type field default value mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Field Defaults")
type Pivot
    int x = "bad"
    float y = "also bad"
    bool active = 1
    string name = 3
    color tint = "not color"
    label tag = "not checked"
    array<float> values = array.new<string>()
    map<string, float> prices = map.new<int, float>()
    matrix<int> grid = matrix.new<float>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign int value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to label field Pivot.tag',
      'Default value for field Pivot.values must be a literal value or compatible built-in variable',
      'Default value for field Pivot.prices must be a literal value or compatible built-in variable',
      'Default value for field Pivot.grid must be a literal value or compatible built-in variable',
    ]);
  });

  it('reports computed user-defined type field defaults', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Default Expressions")
period = 3
type Pivot
    int validNegative = -1
    float validSource = close
    string validBuiltin = xloc.bar_time
    int fromUser = period
    float fromCall = math.max(open, close)
    float fromBinary = close + 1
    bool fromCondition = close > open ? true : false
    array<float> values = array.new<float>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Default value for field Pivot.fromUser must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromCall must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromBinary must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromCondition must be a literal value or compatible built-in variable',
      'Default value for field Pivot.values must be a literal value or compatible built-in variable',
    ]);
  });

  it('validates user-defined type collection field references', () => {
    const valid = checkProgram(parse(`
indicator("UDT Collection Fields")
type Cache
    array<float> values
    map<string, float> prices
    matrix<int> grid
cache = Cache.new(array.new<float>(), map.new<string, float>(), matrix.new<int>())
cache.values := array.new<float>()
cache.prices := map.new<string, float>()
cache.grid := matrix.new<int>()
value = cache.values.get(0)
price = cache.prices.get("BTC")
cell = cache.grid.get(0, 0)
`));

    const invalid = checkProgram(parse(`
indicator("Bad UDT Collection Fields")
type Cache
    array<float> values
    map<string, float> prices
    matrix<int> grid
type Pivot
    float price
type Other
    float price
type HasPivot
    Pivot pivot
badCtor = Cache.new(array.new<string>(), map.new<int, float>(), matrix.new<float>())
cache = Cache.new(array.new<float>(), map.new<string, float>(), matrix.new<int>())
cache.values := array.new<string>()
cache.values := map.new<string, float>()
cache.prices := map.new<string, string>()
cache.prices := array.new<float>()
cache.grid := matrix.new<float>()
pivotHolder = HasPivot.new(Other.new(close))
`));

    expect(valid.diagnostics).toEqual([]);
    expect(valid.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind: 'float' });
    expect(valid.symbols.find((symbol) => symbol.name === 'price')?.type).toMatchObject({ kind: 'float' });
    expect(valid.symbols.find((symbol) => symbol.name === 'cell')?.type).toMatchObject({ kind: 'int' });
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign array<string> value to array<float> field Cache.values',
      'Cannot assign map<int, float> value to map<string, float> field Cache.prices',
      'Cannot assign matrix<float> value to matrix<int> field Cache.grid',
      'Cannot assign array<string> value to array<float> field Cache.values',
      'Cannot assign map<string, float> value to array<float> field Cache.values',
      'Cannot assign map<string, string> value to map<string, float> field Cache.prices',
      'Cannot assign array<float> value to map<string, float> field Cache.prices',
      'Cannot assign matrix<float> value to matrix<int> field Cache.grid',
      'Cannot assign Other value to Pivot field HasPivot.pivot',
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
