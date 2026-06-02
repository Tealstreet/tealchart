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

  it('accepts session state helpers and session constants', () => {
    const result = checkProgram(parse(`
indicator("Session State")
active = session.ismarket or session.ispremarket or session.ispostmarket
plot(active ? 1 : 0)
plot(na(time("60", session.regular)) ? 0 : 1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts explicit Pine boolean and na guard idioms', () => {
    const result = checkProgram(parse(`
indicator("Boolean Guards")
isGreen = close > open
gap = close[100]
if isGreen and not na(gap)
    plot(bool(gap), title="Gap")
plot(na(gap) ? 0 : 1, title="Present")
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports direct na comparisons', () => {
    const result = checkProgram(parse(`
indicator("Direct NA")
gap = close[100]
plot(gap == na ? 1 : 0)
plot(na != gap ? 1 : 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Do not compare directly to na; use na(value) instead',
      'Do not compare directly to na; use na(value) instead',
    ]);
  });

  it('reports numeric expressions used as booleans', () => {
    const result = checkProgram(parse(`
indicator("Numeric Bool")
if close
    plot(close)
plot(volume ? 1 : 0)
while bar_index
    break
plot((close > open) and volume ? 1 : 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
    ]);
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

  it('accepts Pine log calls with format arguments', () => {
    const result = checkProgram(parse(`
indicator("Logs")
log.info("close={0}", close)
log.warning("bar {0}", bar_index)
log.error("done")
plot(close)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid Pine log call arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Logs")
log.info()
log.warning(text="bad")
log.trace("unsupported")
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'argument-count',
        message: 'log.info() expects at least 1 argument',
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: "log.info() missing required argument 'message'",
      }),
      expect.objectContaining({
        code: 'unknown-argument',
        message: "Unknown argument 'text' for log.warning()",
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: 'log.warning() expects at least 1 argument',
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: "log.warning() missing required argument 'message'",
      }),
      expect.objectContaining({
        code: 'unknown-function',
        message: 'Unknown function: log.trace',
      }),
    ]);
  });

  it('accepts Pine alert calls and alertcondition declarations', () => {
    const result = checkProgram(parse(`
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green", message="Close {{close}}")
if isUp
    alert("Green", alert.freq_once_per_bar_close)
plot(close)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid Pine alert arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Alerts")
alert()
alert("ok", alert.freq_all, true)
alertcondition(true, title="A", message="M", freq=alert.freq_all)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'alert() expects at least 1 argument',
      "alert() missing required argument 'message'",
      'alert() expects at most 2 arguments',
      "Unknown argument 'freq' for alertcondition()",
    ]);
  });

  it('accepts Pine strategy order and trade accessor calls', () => {
    const result = checkProgram(parse(`
strategy("Strategy", initial_capital=1000, pyramiding=1, default_qty_type=strategy.fixed, default_qty_value=1)
strategy.entry("Long", strategy.long, qty=1, limit=close, oca_type=strategy.oca.cancel, alert_message="entry")
strategy.order(id="Add", direction=strategy.long, qty=1)
strategy.exit("Exit", from_entry="Long", qty_percent=50, limit=close + 1, stop=close - 1)
strategy.close("Long", qty=1, alert_message="close")
strategy.close_all(comment="flat")
strategy.cancel("Add")
strategy.cancel_all()
plot(strategy.opentrades.entry_price(0))
plot(strategy.closedtrades.exit_price(trade_num=0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid Pine strategy call arguments', () => {
    const result = checkProgram(parse(`
strategy("Bad Strategy")
strategy.entry("Long")
strategy.cancel_all("unexpected")
strategy.entri("Long", strategy.long)
strategy.opentrades.entry_price()
strategy.exit("Exit", from_entry="Long", unknown=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'strategy.entry() expects at least 2 arguments',
      "strategy.entry() missing required argument 'direction'",
      'strategy.cancel_all() expects at most 0 arguments',
      'Unknown function: strategy.entri',
      'strategy.opentrades.entry_price() expects at least 1 argument',
      "strategy.opentrades.entry_price() missing required argument 'trade_num'",
      "Unknown argument 'unknown' for strategy.exit()",
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

  it('reports invalid library export declarations', () => {
    const validLibrary = checkProgram(parse(`
library("Valid")
export type Pivot
    float y
export scale(float value, simple float multiplier) => value * multiplier
export method lifted(Pivot this, float amount) => this
export enum Direction
    up = "Up"
    down = "Down"
export pick() => Direction.up
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
export enum Direction
    up = "Up"
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
      'Library scripts must export at least one function, method, user-defined type, enum, or constant',
    ]);
    expect(exportedInIndicator.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported declarations are only allowed in library scripts: scale',
      'Exported declarations are only allowed in library scripts: Pivot',
      'Exported declarations are only allowed in library scripts: Direction',
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
nestedValues = array.new<array<float>>()
nestedGrid = matrix.new<map<string, float>>(1, 1)
nestedLookup = map.new<string, array<float>>()
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
    expect(types.get('nestedValues')).toMatchObject({ kind: 'array', elementType: { kind: 'array', elementType: { kind: 'float' } } });
    expect(types.get('nestedGrid')).toMatchObject({
      kind: 'matrix',
      elementType: { kind: 'map', keyType: { kind: 'string' }, valueType: { kind: 'float' } },
    });
    expect(types.get('nestedLookup')).toMatchObject({
      kind: 'map',
      keyType: { kind: 'string' },
      valueType: { kind: 'array', elementType: { kind: 'float' } },
    });
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
matrix<input> invalidMatrix = matrix.new_int()
invalidMatrixCtorElement = matrix.new<series>()
invalidMatrixCtorArity = matrix.new<float, int>()
matrix<map> invalidNestedMatrix = matrix.new_float()
invalidMatrixCtorCollection = matrix.new<map>()
map<label, float> invalidKey = map.new<string, float>()
map<array<float>, float> invalidNestedKey = map.new<string, float>()
map<string, series> invalidValue = map.new<string, float>()
map<string, array> invalidCollectionValue = map.new<string, float>()
map<const, float> qualifierKey = map.new<string, float>()
invalidCtorKey = map.new<label, float>()
invalidCtorNestedKey = map.new<array<float>, float>()
invalidCtorValue = map.new<string, series>()
invalidCtorCollectionValue = map.new<string, matrix>()
invalidCtorArity = map.new<string>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      'array.new() expects exactly 1 type argument',
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid matrix element type 'input'; qualifiers cannot be used as template types",
      "Invalid matrix element type 'series'; qualifiers cannot be used as template types",
      'matrix.new() expects exactly 1 type argument',
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      'Map key type must be int, float, bool, string, or color in variable declaration',
      'Map key type must be int, float, bool, string, or color in variable declaration',
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'array'; collection template types must include their element templates",
      "Invalid map key type 'const'; qualifiers cannot be used as template types",
      'Map key type must be int, float, bool, string, or color in map.new',
      'Map key type must be int, float, bool, string, or color in map.new',
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'matrix'; collection template types must include their element templates",
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

  it('resolves map helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Map Signatures")
map<string, float> left = map.new<string, float>()
map<string, float> right = map.new<string, float>()
previous = map.put(id=left, key="BTC", value=1.0)
value = map.get(id=left, key="BTC")
exists = map.contains(id=left, key="BTC")
removed = map.remove(id=left, key="BTC")
map.put(id=right, key="ETH", value=2.0)
map.put_all(id=left, id2=right)
copied = map.copy(id=left)
keys = map.keys(id=copied)
values = map.values(id=copied)
size = map.size(id=copied)
map.clear(id=right)
plot(previous + value + removed + size + array.size(keys) + array.size(values) + (exists ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid map helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Map Signatures")
map<string, float> prices = map.new<string, float>()
duplicateSize = map.size(prices, id=prices)
unknownGet = map.get(id=prices, name="BTC")
missingKey = map.contains(id=prices)
tooManyClear = map.clear(prices, prices)
badNew = map.new<string, float>(1)
badPutAll = map.put_all(id=prices, other=prices)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'id' for map.size() was supplied multiple times",
      "Unknown argument 'name' for map.get()",
      'map.get() expects at least 2 arguments',
      "map.get() missing required argument 'key'",
      'map.contains() expects at least 2 arguments',
      "map.contains() missing required argument 'key'",
      'map.clear() expects at most 1 argument',
      'map.new() expects at most 0 arguments',
      "Unknown argument 'other' for map.put_all()",
      'map.put_all() expects at least 2 arguments',
      "map.put_all() missing required argument 'id2'",
    ]);
  });

  it('resolves core array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Core Signatures")
values = array.new_int(size=2, initial_value=1)
mixed = array.new_float(2, initial_value=2.5)
fromValues = array.from(1, 2, 3)
array.push(id=values, value=3)
array.unshift(id=values, value=0)
array.set(id=values, index=1, value=5)
removed = array.remove(id=values, index=2)
array.insert(id=values, index=2, value=9)
first = array.first(id=values)
last = array.last(id=values)
value = array.get(id=values, index=1)
copied = array.copy(id=values)
popped = array.pop(id=copied)
shifted = array.shift(id=copied)
size = array.size(id=copied)
array.clear(id=copied)
plot(first + last + value + removed + popped + shifted + size + array.size(fromValues) + array.size(mixed))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid core array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Core Signatures")
values = array.new_int(size=2, initial_value=1)
duplicateSize = array.size(values, id=values)
unknownGet = array.get(id=values, item=0)
missingIndex = array.remove(id=values)
tooManyClear = array.clear(values, values)
badNew = array.new_int(size=1, initial_value=0, extra=1)
shortSet = array.set(id=values, index=0)
unknownPush = array.push(id=values, item=1)
badFrom = array.from(value=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'id' for array.size() was supplied multiple times",
      "Unknown argument 'item' for array.get()",
      'array.get() expects at least 2 arguments',
      "array.get() missing required argument 'index'",
      'array.remove() expects at least 2 arguments',
      "array.remove() missing required argument 'index'",
      'array.clear() expects at most 1 argument',
      "Unknown argument 'extra' for array.new_int()",
      'array.set() expects at least 3 arguments',
      "array.set() missing required argument 'value'",
      "Unknown argument 'item' for array.push()",
      'array.push() expects at least 2 arguments',
      "array.push() missing required argument 'value'",
      "Unknown argument 'value' for array.from()",
    ]);
  });

  it('resolves extended array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Extended Signatures")
values = array.from(3, 1, 2)
other = array.from(4, 5)
array.fill(id=values, value=7, index_from=0, index_to=1)
window = array.slice(id=values, index_from=0, index_to=2)
array.reverse(id=window)
array.concat(id=values, id2=other)
array.sort(id=values, order=order.ascending)
array.sort(id=values, order=order.descending, sort_field=0)
indices = array.sort_indices(id=values, order=order.descending)
joined = array.join(id=window, separator=",")
plain = array.join(id=window)
plot(array.size(values) + array.size(window) + array.size(indices) + str.length(joined) + str.length(plain))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid extended array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Extended Signatures")
values = array.from(3, 1, 2)
other = array.from(4, 5)
duplicateConcat = array.concat(values, id=other)
unknownFill = array.fill(id=values, item=1)
missingSlice = array.slice(id=values, index_from=0)
tooManyReverse = array.reverse(values, other)
tooManyJoin = array.join(values, ",", ";")
unknownSort = array.sort(id=values, direction=order.ascending)
tooManySortIndices = array.sort_indices(values, order.ascending, 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.concat() expects at least 2 arguments',
      "array.concat() missing required argument 'id2'",
      "Argument 'id' for array.concat() was supplied multiple times",
      "Unknown argument 'item' for array.fill()",
      'array.fill() expects at least 2 arguments',
      "array.fill() missing required argument 'value'",
      'array.slice() expects at least 3 arguments',
      "array.slice() missing required argument 'index_to'",
      'array.reverse() expects at most 1 argument',
      'array.join() expects at most 2 arguments',
      "Unknown argument 'direction' for array.sort()",
      'array.sort_indices() expects at most 2 arguments',
    ]);
  });

  it('resolves array search helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Search Signatures")
values = array.from(1, 2, 3)
flags = array.from(true, true)
hasValue = array.includes(id=values, value=2)
index = array.indexof(id=values, value=2)
lastIndex = array.lastindexof(id=values, value=2)
binary = array.binary_search(id=values, value=2)
left = array.binary_search_leftmost(id=values, value=2)
right = array.binary_search_rightmost(id=values, value=2)
allFlags = array.every(id=flags)
someFlags = array.some(id=flags)
plot(index + lastIndex + binary + left + right + (hasValue ? 1 : 0) + (allFlags ? 1 : 0) + (someFlags ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid array search helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Search Signatures")
values = array.from(1, 2, 3)
duplicateIndex = array.indexof(values, id=values)
unknownIncludes = array.includes(id=values, item=2)
missingBinary = array.binary_search(id=values)
tooManyEvery = array.every(values, values)
unknownSome = array.some(items=values)
tooManyRight = array.binary_search_rightmost(values, 2, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.indexof() expects at least 2 arguments',
      "array.indexof() missing required argument 'value'",
      "Argument 'id' for array.indexof() was supplied multiple times",
      "Unknown argument 'item' for array.includes()",
      'array.includes() expects at least 2 arguments',
      "array.includes() missing required argument 'value'",
      'array.binary_search() expects at least 2 arguments',
      "array.binary_search() missing required argument 'value'",
      'array.every() expects at most 1 argument',
      "Unknown argument 'items' for array.some()",
      'array.some() expects at least 1 argument',
      "array.some() missing required argument 'id'",
      'array.binary_search_rightmost() expects at most 2 arguments',
    ]);
  });

  it('resolves array statistic helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Statistic Signatures")
values = array.from(1, 2, 3, 4)
other = array.from(2, 4, 6, 8)
absolute = array.abs(id=values)
standardized = array.standardize(id=values)
total = array.sum(id=values)
average = array.avg(id=values)
minimum = array.min(id=values)
maximum = array.max(id=values)
spread = array.range(id=values)
middle = array.median(id=values)
common = array.mode(id=values)
variance = array.variance(id=values)
deviation = array.stdev(id=values, biased=false)
covariance = array.covariance(id1=values, id2=other, biased=true)
covarianceAlias = array.covariance(id=values, id2=other)
nearest = array.percentile_nearest_rank(id=values, percentage=50)
linear = array.percentile_linear_interpolation(id=values, percentage=50)
rank = array.percentrank(id=values, value=2)
plot(total + average + minimum + maximum + spread + middle + common + variance + deviation + covariance + covarianceAlias + nearest + linear + rank + array.size(absolute) + array.size(standardized))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid array statistic helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Statistic Signatures")
values = array.from(1, 2, 3)
other = array.from(2, 4, 6)
unknownSum = array.sum(values=values)
tooManyAbs = array.abs(values, other)
missingPercentile = array.percentile_nearest_rank(id=values)
unknownStdev = array.stdev(id=values, sample=false)
duplicateCovariance = array.covariance(values, id1=other)
missingRank = array.percentrank(id=values)
tooManyVariance = array.variance(values, true, false)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'values' for array.sum()",
      'array.sum() expects at least 1 argument',
      "array.sum() missing required argument 'id'",
      'array.abs() expects at most 1 argument',
      'array.percentile_nearest_rank() expects at least 2 arguments',
      "array.percentile_nearest_rank() missing required argument 'percentage'",
      "Unknown argument 'sample' for array.stdev()",
      'array.covariance() expects at least 2 arguments',
      "array.covariance() missing required argument 'id2'",
      "Argument 'id1' for array.covariance() was supplied multiple times",
      'array.percentrank() expects at least 2 arguments',
      "array.percentrank() missing required argument 'value'",
      'array.variance() expects at most 2 arguments',
    ]);
  });

  it('resolves matrix core helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Core Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
generic = matrix.new<float>(rows=1, columns=1, initial_value=0)
flags = matrix.new_bool()
matrix.set(id=m, row=0, column=1, value=4)
rows = matrix.rows(id=m)
columns = matrix.columns(id=m)
elements = matrix.elements_count(id=m)
first = matrix.get(id=m, row=0, column=1)
valid = matrix.is_valid(id=m)
plot(rows + columns + elements + first + matrix.rows(id=generic) + matrix.rows(id=flags) + (valid ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix core helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Core Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
badNew = matrix.new_int(rows=1, columns=1, initial_value=0, extra=1)
duplicateRows = matrix.rows(m, id=m)
unknownGet = matrix.get(id=m, column=0, item=0)
missingValue = matrix.set(id=m, row=0, column=0)
tooManyRows = matrix.rows(m, m)
tooManyGet = matrix.get(m, 0, 0, 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'extra' for matrix.new_int()",
      "Argument 'id' for matrix.rows() was supplied multiple times",
      "Unknown argument 'item' for matrix.get()",
      'matrix.get() expects at least 3 arguments',
      "matrix.get() missing required argument 'row'",
      'matrix.set() expects at least 4 arguments',
      "matrix.set() missing required argument 'value'",
      'matrix.rows() expects at most 1 argument',
      'matrix.get() expects at most 3 arguments',
    ]);
  });

  it('resolves matrix structural helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Structural Signatures")
m = matrix.new_int(rows=3, columns=2, initial_value=1)
matrix.fill(id=m, value=7, from_row=1, to_row=2, from_column=0, to_column=2)
matrix.reshape(id=m, rows=2, columns=3)
matrix.add_row(id=m, row=1, array_id=array.from(1, 2, 3))
matrix.add_col(id=m, column=1, array_id=array.from(4, 5, 6))
matrix.add_column(id=m, column=2, array_id=array.from(7, 8, 9))
removedRow = matrix.remove_row(id=m, row=0)
removedCol = matrix.remove_col(id=m, column=0)
removedColumn = matrix.remove_column(id=m, column=0)
matrix.swap_rows(id=m, row1=0, row2=1)
matrix.swap_columns(id=m, column1=0, column2=1)
matrix.reverse(id=m)
plot(matrix.rows(id=m) + matrix.columns(id=m) + array.size(removedRow) + array.size(removedCol) + array.size(removedColumn))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix structural helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Structural Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
unknownFill = matrix.fill(id=m, item=1)
missingReshape = matrix.reshape(id=m, rows=1)
tooManyReverse = matrix.reverse(m, m)
duplicateAddRow = matrix.add_row(m, id=m)
unknownAddCol = matrix.add_col(id=m, row=0)
missingRemove = matrix.remove_column(id=m)
tooManySwap = matrix.swap_rows(m, 0, 1, 2)
missingSwapColumn = matrix.swap_columns(id=m, column1=0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'item' for matrix.fill()",
      'matrix.fill() expects at least 2 arguments',
      "matrix.fill() missing required argument 'value'",
      'matrix.reshape() expects at least 3 arguments',
      "matrix.reshape() missing required argument 'columns'",
      'matrix.reverse() expects at most 1 argument',
      "Argument 'id' for matrix.add_row() was supplied multiple times",
      "Unknown argument 'row' for matrix.add_col()",
      'matrix.remove_column() expects at least 2 arguments',
      "matrix.remove_column() missing required argument 'column'",
      'matrix.swap_rows() expects at most 3 arguments',
      'matrix.swap_columns() expects at least 3 arguments',
      "matrix.swap_columns() missing required argument 'column2'",
    ]);
  });

  it('resolves matrix extraction helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Extraction Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
tail = matrix.new_int(rows=1, columns=2, initial_value=5)
copy = matrix.copy(id=m)
transposed = matrix.transpose(id=m)
row = matrix.row(id=m, row=1)
col = matrix.col(id=m, column=0)
column = matrix.column(id=m, column=1)
slice = matrix.submatrix(id=m, from_row=0, to_row=2, from_column=0, to_column=1)
whole = matrix.submatrix(id=m)
matrix.concat(id=m, id2=tail)
matrix.concat(id1=copy, id2=tail)
plot(matrix.rows(id=m) + matrix.rows(id=transposed) + matrix.rows(id=slice) + matrix.rows(id=whole) + array.size(row) + array.size(col) + array.size(column))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix extraction helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Extraction Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
duplicateConcat = matrix.concat(m, id=m)
missingConcat = matrix.concat(id=m)
unknownSubmatrix = matrix.submatrix(id=m, start_row=0)
tooManySubmatrix = matrix.submatrix(m, 0, 1, 0, 1, 2)
tooManyCopy = matrix.copy(m, m)
missingRow = matrix.row(id=m)
unknownColumn = matrix.column(id=m, row=0)
tooManyCol = matrix.col(m, 0, 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'matrix.concat() expects at least 2 arguments',
      "matrix.concat() missing required argument 'id2'",
      "Argument 'id' for matrix.concat() was supplied multiple times",
      'matrix.concat() expects at least 2 arguments',
      "matrix.concat() missing required argument 'id2'",
      "Unknown argument 'start_row' for matrix.submatrix()",
      'matrix.submatrix() expects at most 5 arguments',
      'matrix.copy() expects at most 1 argument',
      'matrix.row() expects at least 2 arguments',
      "matrix.row() missing required argument 'row'",
      "Unknown argument 'row' for matrix.column()",
      'matrix.column() expects at least 2 arguments',
      "matrix.column() missing required argument 'column'",
      'matrix.col() expects at most 2 arguments',
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
grid = matrix.new<float>(2, 2, 0)
for [rowIndex, rowValues] in grid
    ints.push(rowIndex)
    strings.push(rowIndex)
    prices.push(rowValues.get(0))
    ints.push(rowValues.get(0))
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
      "ta.sma() missing required argument 'length'",
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

  it('resolves core TA helper named and default-source arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Core Signatures")
condition = close > open
since = ta.barssince(condition=condition)
last = ta.valuewhen(condition=condition, source=close, occurrence=0)
changed = ta.change(source=close, length=2)
crossed = ta.crossover(source1=close, source2=open) or ta.crossunder(source1=close, source2=open) or ta.cross(source1=close, source2=open)
highest = ta.highest(length=3)
lowest = ta.lowest(length=3)
highestOffset = ta.highestbars(length=3)
lowestOffset = ta.lowestbars(length=3)
singleLengthHighest = ta.highest(3)
spread = ta.range(source=close, length=3)
trend = ta.rising(source=close, length=2) or ta.falling(source=close, length=2)
plot(since + last + changed + highest + lowest + highestOffset + lowestOffset + singleLengthHighest + spread + (crossed ? 1 : 0) + (trend ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid core TA helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Core Signatures")
duplicateValuewhen = ta.valuewhen(close > open, condition=false, source=close, occurrence=0)
unknownCross = ta.cross(source1=close, source2=open, threshold=0)
missingHighestLength = ta.highest(source=high)
shortRange = ta.range(source=close)
tooManyBarsSince = ta.barssince(close > open, true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'condition' for ta.valuewhen() was supplied multiple times",
      "Unknown argument 'threshold' for ta.cross()",
      "ta.highest() missing required argument 'length'",
      "ta.range() expects at least 2 arguments",
      "ta.range() missing required argument 'length'",
      'ta.barssince() expects at most 1 argument',
    ]);
  });

  it('resolves TA statistics helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Stats Signatures")
variance = ta.variance(source=close, length=3, biased=false)
deviation = ta.dev(source=close, length=3)
correlation = ta.correlation(source1=close, source2=open, length=3)
cog = ta.cog(source=close, length=3)
median = ta.median(source=close, length=3)
mode = ta.mode(source=close, length=3)
nearest = ta.percentile_nearest_rank(source=close, length=3, percentage=75)
linear = ta.percentile_linear_interpolation(source=close, length=3, percentage=75)
rank = ta.percentrank(source=close, length=3)
total = ta.cum(source=close)
plot(variance + deviation + correlation + cog + median + mode + nearest + linear + rank + total)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA statistics helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Stats Signatures")
duplicateVariance = ta.variance(close, source=open, length=3)
unknownDeviation = ta.dev(source=close, length=3, average=2)
missingCorrelation = ta.correlation(source1=close, source2=open)
shortPercentile = ta.percentile_nearest_rank(source=close, length=3)
tooManyCum = ta.cum(close, open)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.variance() was supplied multiple times",
      "Unknown argument 'average' for ta.dev()",
      'ta.correlation() expects at least 3 arguments',
      "ta.correlation() missing required argument 'length'",
      'ta.percentile_nearest_rank() expects at least 3 arguments',
      "ta.percentile_nearest_rank() missing required argument 'percentage'",
      'ta.cum() expects at most 1 argument',
    ]);
  });

  it('resolves TA moving-average and momentum helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA MA Momentum Signatures")
vwma = ta.vwma(source=close, length=3)
rma = ta.rma(source=close, length=3)
wma = ta.wma(source=close, length=3)
swma = ta.swma(source=close)
alma = ta.alma(series=close, length=5, offset=0.85, sigma=6, floor=false)
hma = ta.hma(source=close, length=5)
momentum = ta.mom(source=close, length=2)
rate = ta.roc(source=close, length=2)
plot(vwma + rma + wma + swma + alma + hma + momentum + rate)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA moving-average and momentum helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA MA Momentum Signatures")
duplicateVwma = ta.vwma(close, source=open, length=3)
unknownAlma = ta.alma(series=close, length=5, offset=0.85, sigma=6, biased=false)
shortWma = ta.wma(source=close)
tooManySwma = ta.swma(close, open)
tooManyMom = ta.mom(close, 2, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.vwma() was supplied multiple times",
      "Unknown argument 'biased' for ta.alma()",
      'ta.wma() expects at least 2 arguments',
      "ta.wma() missing required argument 'length'",
      'ta.swma() expects at most 1 argument',
      'ta.mom() expects at most 2 arguments',
    ]);
  });

  it('resolves TA channel helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Channel Signatures")
[bbBasis, bbUpper, bbLower] = ta.bb(series=close, length=3, mult=2.0)
bbw = ta.bbw(series=close, length=3, mult=2.0)
[kcBasis, kcUpper, kcLower] = ta.kc(series=close, length=3, mult=1.25, useTrueRange=false)
kcw = ta.kcw(series=close, length=3, mult=1.25, useTrueRange=false)
plot(bbBasis + bbUpper + bbLower + bbw + kcBasis + kcUpper + kcLower + kcw)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA channel helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Channel Signatures")
duplicateBb = ta.bbw(close, series=open, length=3, mult=2.0)
unknownKc = ta.kc(series=close, length=3, mult=1.25, tr=false)
shortBb = ta.bb(series=close, length=3)
tooManyKcw = ta.kcw(close, 3, 1.25, true, false)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'series' for ta.bbw() was supplied multiple times",
      "Unknown argument 'tr' for ta.kc()",
      'ta.bb() expects at least 3 arguments',
      "ta.bb() missing required argument 'mult'",
      'ta.kcw() expects at most 4 arguments',
    ]);
  });

  it('resolves TA oscillator helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Oscillator Signatures")
stoch = ta.stoch(source=close, high=high, low=low, length=3)
mfi = ta.mfi(series=hlc3, length=3)
wpr = ta.wpr(length=3)
cmo = ta.cmo(source=close, length=3)
tsi = ta.tsi(source=close, short_length=2, long_length=3)
cci = ta.cci(source=hlc3, length=3)
plot(stoch + mfi + wpr + cmo + tsi + cci)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA oscillator helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Oscillator Signatures")
duplicateStoch = ta.stoch(close, source=open, high=high, low=low, length=3)
unknownMfi = ta.mfi(series=hlc3, length=3, volume=volume)
shortTsi = ta.tsi(source=close, short_length=2)
tooManyWpr = ta.wpr(3, 4)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.stoch() was supplied multiple times",
      "Unknown argument 'volume' for ta.mfi()",
      'ta.tsi() expects at least 3 arguments',
      "ta.tsi() missing required argument 'long_length'",
      'ta.wpr() expects at most 1 argument',
    ]);
  });

  it('resolves TA trend and pivot helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Trend Pivot Signatures")
[trend, direction] = ta.supertrend(factor=2.0, atrPeriod=3)
[diPlus, diMinus, adx] = ta.dmi(diLength=3, adxSmoothing=3)
sar = ta.sar(start=0.02, inc=0.02, max=0.2)
pivotHigh = ta.pivothigh(source=high, leftbars=2, rightbars=2)
pivotLow = ta.pivotlow(source=low, leftbars=2, rightbars=2)
defaultPivotHigh = ta.pivothigh(leftbars=2, rightbars=2)
defaultPivotLow = ta.pivotlow(leftbars=2, rightbars=2)
mixedPivotHigh = ta.pivothigh(2, rightbars=2)
mixedPivotLow = ta.pivotlow(2, rightbars=2)
linreg = ta.linreg(source=close, length=3, offset=1)
plot(trend + direction + diPlus + diMinus + adx + sar + pivotHigh + pivotLow + defaultPivotHigh + defaultPivotLow + mixedPivotHigh + mixedPivotLow + linreg)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA trend and pivot helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Trend Pivot Signatures")
duplicateDmi = ta.dmi(3, diLength=3, adxSmoothing=3)
unknownSar = ta.sar(start=0.02, inc=0.02, max=0.2, step=0.01)
shortPivot = ta.pivothigh(source=high, leftbars=2)
duplicatePivot = ta.pivotlow(2, leftbars=2, rightbars=2)
shortLinreg = ta.linreg(source=close, length=3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'diLength' for ta.dmi() was supplied multiple times",
      "Unknown argument 'step' for ta.sar()",
      "ta.pivothigh() missing required argument 'rightbars'",
      "Argument 'leftbars' for ta.pivotlow() was supplied multiple times",
      'ta.linreg() expects at least 3 arguments',
      "ta.linreg() missing required argument 'offset'",
    ]);
  });

  it('resolves remaining TA helper named arguments and series globals', () => {
    const result = checkProgram(parse(`
indicator("Remaining TA Signatures")
[line, signal, hist] = ta.macd(source=close, fastlen=12, slowlen=26, siglen=9)
legacyObv = ta.obv(source=close, volume=volume)
currentObv = ta.obv
range = ta.tr(handle_na=true)
rawRange = ta.tr
plot(line + signal + hist + legacyObv + currentObv + range + rawRange)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid remaining TA helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Remaining TA Signatures")
duplicateMacd = ta.macd(close, source=open, fastlen=12, slowlen=26, siglen=9)
unknownMacd = ta.macd(source=close, fastlen=12, slowlen=26, signal=9)
tooManyObv = ta.obv(close, volume, open)
unknownTr = ta.tr(handle_na=true, fallback=true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.macd() was supplied multiple times",
      "Unknown argument 'signal' for ta.macd()",
      'ta.macd() expects at least 4 arguments',
      "ta.macd() missing required argument 'siglen'",
      'ta.obv() expects at most 2 arguments',
      "Unknown argument 'fallback' for ta.tr()",
    ]);
  });

  it('resolves color helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Color Signatures")
base = color.rgb(red=1, green=2, blue=3, transp=25)
derived = color.rgb(color.r(color=base), color.g(color=base), color.b(color=base), color.t(color=base))
gradient = color.from_gradient(value=close, bottom_value=0, top_value=100, bottom_color=base, top_color=derived)
plot(close, color=gradient)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid color helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Color Signatures")
rgbDuplicate = color.rgb(1, 2, 3, red=4)
rgbUnknown = color.rgb(1, 2, 3, alpha=25)
channelUnknown = color.r(color.red, source=color.blue)
gradientShort = color.from_gradient(close, 0, 100, color.red)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'red' for color.rgb() was supplied multiple times",
      "Unknown argument 'alpha' for color.rgb()",
      "Unknown argument 'source' for color.r()",
      'color.from_gradient() expects at least 5 arguments',
      "color.from_gradient() missing required argument 'top_color'",
    ]);
  });

  it('resolves string helper named arguments and aliases', () => {
    const result = checkProgram(parse(`
indicator("String Signatures")
text = "BTC-USDT-USDT"
formatted = str.tostring(value=close, format="#.0")
parsed = str.tonumber(string="42.5")
timeText = str.format_time(time=time, format="yyyy-MM-dd", timezone=syminfo.timezone)
message = str.format(format="close={0}", close)
hasUsdt = str.contains(string=text, substring="USDT")
starts = str.startswith(source=text, target="BTC")
ends = str.endswith(source=text, str="USDT")
position = str.pos(source=text, str="USDT")
prefix = str.substring(string=text, begin_pos=0, end_pos=3)
match = str.match(source="Trade NASDAQ:AAPL", pattern="[A-Z]+:[A-Z]+")
repeated = str.repeat(string="?", repeat_count=3, separator=",")
parts = str.split(string=text, separator="-")
upper = str.upper(string=text)
lower = str.lower(string=text)
trimmed = str.trim(string=" BTC ")
replaceOne = str.replace(string=text, substring="USDT", replacement="PERP", occurrence=1)
replaceAll = str.replace_all(source=text, str="USDT", replacement="PERP")
plot(parsed + position + str.length(string=formatted + timeText + message + prefix + match + repeated + upper + lower + trimmed + replaceOne + replaceAll))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid string helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad String Signatures")
duplicateSource = str.contains("BTC", source="ETH", str="T")
duplicateAlias = str.replace(source="BTC", target="T", substring="B", replacement="X")
unknownArg = str.substring(source="BTC", start=0)
shortReplace = str.replace(source="BTC", target="B")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for str.contains() was supplied multiple times",
      "Argument 'substring' for str.replace() was supplied multiple times",
      "Unknown argument 'start' for str.substring()",
      "str.substring() expects at least 2 arguments",
      "str.substring() missing required argument 'begin_pos'",
      "str.replace() expects at least 3 arguments",
      "str.replace() missing required argument 'replacement'",
    ]);
  });

  it('resolves math helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Math Signatures")
rounded = math.round(number=math.pi, precision=3)
powered = math.pow(base=2, exponent=3)
root = math.sqrt(number=16)
logged = math.log(number=math.e) + math.log10(number=100) + math.exp(number=1)
trig = math.sin(number=0) + math.cos(number=0) + math.tan(number=0) + math.asin(number=0) + math.acos(number=1) + math.atan(number=1)
converted = math.toradians(number=180) + math.todegrees(number=math.pi)
unary = math.abs(number=-5) + math.trunc(number=-1.9) + math.floor(number=-1.2) + math.ceil(number=1.2) + math.sign(number=-5)
seriesSum = math.sum(source=close, length=3)
tick = math.round_to_mintick(number=1.005)
rand = math.random(min=10, max=20, seed=7)
plot(rounded + powered + root + logged + trig + converted + unary + seriesSum + tick + rand)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid math helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Math Signatures")
duplicateRound = math.round(math.pi, number=1, precision=2)
unknownPow = math.pow(base=2, power=3)
shortSum = math.sum(source=close)
tooManyMintick = math.round_to_mintick(1.0, 2)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'number' for math.round() was supplied multiple times",
      "Unknown argument 'power' for math.pow()",
      "math.pow() expects at least 2 arguments",
      "math.pow() missing required argument 'exponent'",
      "math.sum() expects at least 2 arguments",
      "math.sum() missing required argument 'length'",
      'math.round_to_mintick() expects at most 1 argument',
    ]);
  });

  it('resolves ticker helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Ticker Signatures")
base = ticker.new(prefix="NASDAQ", ticker="AAPL", session=session.extended, adjustment=adjustment.splits, backadjustment=backadjustment.on, settlement_as_close=settlement_as_close.off)
modified = ticker.modify(tickerid=base, session=session.regular, adjustment=adjustment.dividends, backadjustment=backadjustment.inherit, settlement_as_close=settlement_as_close.inherit)
standard = ticker.standard(symbol=modified)
inherited = ticker.inherit(from_tickerid=ticker.heikinashi(symbol=modified), symbol="NASDAQ:MSFT")
renko = ticker.renko(symbol="NASDAQ:AAPL", style="ATR", param=10, request_wicks=true, source="Close")
lineBreak = ticker.linebreak(symbol="NASDAQ:AAPL", number_of_lines=3)
kagi = ticker.kagi(symbol="NASDAQ:AAPL", style="ATR", param=10)
pointFigure = ticker.pointfigure(symbol="NASDAQ:AAPL", source="hl", style="ATR", param=14, reversal=3)
plot(str.length(standard + inherited + renko + lineBreak + kagi + pointFigure))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid ticker helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Ticker Signatures")
duplicatePrefix = ticker.new("NASDAQ", "AAPL", prefix="NYSE")
unknownModifier = ticker.modify("NASDAQ:AAPL", bad=session.extended)
shortRenko = ticker.renko("NASDAQ:AAPL", "ATR")
unknownChart = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3, request_wicks=true)
missingNewPrefix = ticker.new(ticker="AAPL", session=session.extended)
missingModifyTicker = ticker.modify(session=session.extended)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'prefix' for ticker.new() was supplied multiple times",
      "Unknown argument 'bad' for ticker.modify()",
      'ticker.renko() expects at least 3 arguments',
      "ticker.renko() missing required argument 'param'",
      "Unknown argument 'request_wicks' for ticker.pointfigure()",
      "ticker.new() missing required argument 'prefix'",
      "ticker.modify() missing required argument 'tickerid'",
    ]);
  });

  it('resolves request helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Request Signatures")
rate = request.currency_rate(currency.USD, "GBP", ignore_invalid_currency=true)
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, barmerge.gaps_on, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false, currency=currency.USD)
earning = request.earnings("NASDAQ:AAPL", earnings.actual, barmerge.gaps_off, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false, currency="USD")
split = request.splits("NASDAQ:AAPL", splits.denominator, barmerge.gaps_off, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", gaps=barmerge.gaps_off, ignore_invalid_symbol=false, currency="USD")
econ = request.economic("US", "GDP", gaps=barmerge.gaps_off, ignore_invalid_symbol=false)
seeded = request.seed("seed", "SYM", close, ignore_invalid_symbol=false, calc_bars_count=2)
plot(rate + dividend + earning + split + revenue + econ + seeded)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid request helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Request Signatures")
rate = request.currency_rate("USD", "GBP", from="EUR")
split = request.splits("NASDAQ:AAPL", splits.denominator, currency="USD")
econ = request.economic("US", "GDP", unexpected=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'from' for request.currency_rate() was supplied multiple times",
      "Unknown argument 'currency' for request.splits()",
      "Unknown argument 'unexpected' for request.economic()",
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

  it('validates array index assignment targets and values', () => {
    const valid = checkProgram(parse(`
indicator("Index Assignment")
values = array.new<float>()
values[0] := close
values[1] += 2
`));

    const invalid = checkProgram(parse(`
indicator("Bad Index Assignment")
values = array.new<int>()
values["first"] := 1
values[0] := "bad"
close[0] := 1
`));

    expect(valid.diagnostics).toEqual([]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Array assignment index must be numeric, got string',
      'Cannot assign string value to int array element',
      'Index assignment target must be an array, got float',
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
