export const PINE_V6_GRAMMAR_REFERENCE_SOURCES = {
  scriptStructure: 'https://www.tradingview.com/pine-script-docs/language/script-structure/',
  typeSystem: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
  variableDeclarations: 'https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
  operators: 'https://www.tradingview.com/pine-script-docs/language/operators/',
  conditionalStructures: 'https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
  loops: 'https://www.tradingview.com/pine-script-docs/language/loops/',
  userDefinedFunctions: 'https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
  methods: 'https://www.tradingview.com/pine-script-docs/language/methods/',
  objects: 'https://www.tradingview.com/pine-script-docs/language/objects/',
  enums: 'https://www.tradingview.com/pine-script-docs/language/enums/',
  arrays: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
  matrices: 'https://www.tradingview.com/pine-script-docs/language/matrices/',
  maps: 'https://www.tradingview.com/pine-script-docs/language/maps/',
} as const;

export type PineV6GrammarCategory =
  | 'arrays-matrices-maps'
  | 'conditionals'
  | 'declarations'
  | 'enums'
  | 'formatting'
  | 'functions-methods'
  | 'imports'
  | 'loops'
  | 'operators'
  | 'tuples'
  | 'types'
  | 'variables';

export interface PineV6GrammarConstruct {
  id: string;
  category: PineV6GrammarCategory;
  name: string;
  source: string;
  snippet: string;
  notes?: string;
}

const script = (body: string): string => `//@version=6
${body.trim()}
`;

export const PINE_V6_GRAMMAR_CONSTRUCTS = [
  {
    id: 'declarations.version-indicator',
    category: 'declarations',
    name: 'v6 indicator declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Grammar indicator", overlay=true, max_labels_count=10)
plot(close)
`),
  },
  {
    id: 'declarations.strategy',
    category: 'declarations',
    name: 'strategy declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
strategy("Grammar strategy", overlay=true, initial_capital=1000, pyramiding=1)
strategy.entry("L", strategy.long)
plot(strategy.position_size)
`),
  },
  {
    id: 'declarations.library-export-function',
    category: 'declarations',
    name: 'library declaration with exported function',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
library("GrammarLib", overlay=true)
export add(float x, float y) => x + y
`),
  },
  {
    id: 'imports.explicit-alias',
    category: 'imports',
    name: 'import declaration with explicit alias',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Import alias")
import TestUser/RangeTools/1 as rt
plot(close)
`),
  },
  {
    id: 'imports.implicit-alias',
    category: 'imports',
    name: 'import declaration with implicit alias',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Import implicit")
import TestUser/RangeTools/1
plot(close)
`),
  },
  {
    id: 'variables.untyped-declaration',
    category: 'variables',
    name: 'untyped variable declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Untyped variable")
value = close
plot(value)
`),
  },
  {
    id: 'variables.typed-declaration',
    category: 'variables',
    name: 'typed variable declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Typed variable")
float value = close
plot(value)
`),
  },
  {
    id: 'variables.var',
    category: 'variables',
    name: 'var declaration mode',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Var")
var float running = 0.0
running += close
plot(running)
`),
  },
  {
    id: 'variables.varip',
    category: 'variables',
    name: 'varip declaration mode',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Varip")
varip float tickValue = close
plot(tickValue)
`),
  },
  {
    id: 'variables.reassignment',
    category: 'variables',
    name: 'reassignment operator',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Reassignment")
value = close
value := value + 1
plot(value)
`),
  },
  {
    id: 'variables.compound-assignments',
    category: 'variables',
    name: 'compound assignment operators',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Compound assignments")
value = 10.0
value += 1
value -= 2
value *= 3
value /= 2
value %= 5
plot(value)
`),
  },
  {
    id: 'variables.multi-declaration',
    category: 'variables',
    name: 'comma-separated declarations',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Multi declaration")
float first = close, float second = open
plot(first + second)
`),
  },
  {
    id: 'types.primitive-annotations',
    category: 'types',
    name: 'primitive type annotations',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Primitive annotations")
int length = 2
float price = close
bool rising = close > open
string labelText = "price"
color candleColor = color.green
plot(rising ? price : length, color=candleColor, title=labelText)
`),
  },
  {
    id: 'types.qualifier-annotations',
    category: 'types',
    name: 'const/input/simple/series qualified annotations',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Qualifier annotations")
const int fast = 2
input int slow = input.int(3)
simple int smoothing = 1
series float value = close
plot(ta.sma(value, fast + slow + smoothing))
`),
  },
  {
    id: 'types.casts',
    category: 'types',
    name: 'explicit type casting calls',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Casts")
asFloat = float(1)
asInt = int(asFloat)
asBool = bool(close > open)
asString = string("ok")
plot(asBool ? asInt : str.length(asString))
`),
  },
  {
    id: 'types.na-typed-initializer',
    category: 'types',
    name: 'typed na initializer',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Typed NA")
float maybe = na
plot(maybe)
`),
  },
  {
    id: 'types.array-template',
    category: 'types',
    name: 'array template type annotation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Array type")
array<float> values = array.new_float()
array.push(values, close)
plot(array.get(values, 0))
`),
  },
  {
    id: 'types.array-shorthand',
    category: 'types',
    name: 'array shorthand type annotation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Array shorthand")
float[] values = array.new_float(1, close)
plot(array.get(values, 0))
`),
  },
  {
    id: 'types.matrix-template',
    category: 'types',
    name: 'matrix template type annotation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Matrix type")
matrix<float> grid = matrix.new<float>(1, 1, close)
plot(matrix.get(grid, 0, 0))
`),
  },
  {
    id: 'types.map-template',
    category: 'types',
    name: 'map template type annotation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Map type")
map<string, float> values = map.new<string, float>()
map.put(values, "close", close)
plot(map.get(values, "close"))
`),
  },
  {
    id: 'types.object-provider-annotations',
    category: 'types',
    name: 'built-in object and provider type annotations',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.typeSystem,
    snippet: script(`
indicator("Object provider annotations", overlay=true)
box b = box.new(bar_index, high, bar_index + 1, low)
chart.point p = chart.point.now(close)
footprint fp = request.footprint(10, 70)
label lbl = label.new(bar_index, close, "x")
line l1 = line.new(bar_index, high, bar_index + 1, high)
line l2 = line.new(bar_index, low, bar_index + 1, low)
linefill lf = linefill.new(l1, l2, color.new(color.blue, 80))
array<chart.point> pts = array.from(chart.point.now(close), chart.point.now(open))
polyline pl = polyline.new(pts)
table t = table.new(position.top_right, 1, 1)
volume_row row = footprint.poc(fp)
table.cell(t, 0, 0, "x")
plot(p.price + footprint.total_volume(fp) + volume_row.up_price(row))
`),
  },
  {
    id: 'operators.arithmetic',
    category: 'operators',
    name: 'arithmetic operators',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Arithmetic")
value = ((close + open) - low) * high / 2 % 5
plot(value)
`),
  },
  {
    id: 'operators.comparison',
    category: 'operators',
    name: 'comparison operators',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Comparison")
state = close == open or close != high or close > low or close >= low or low < high or low <= high
plot(state ? 1 : 0)
`),
  },
  {
    id: 'operators.logical',
    category: 'operators',
    name: 'logical operators',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Logical")
state = not na(close) and close > open or bar_index == 0
plot(state ? 1 : 0)
`),
  },
  {
    id: 'operators.conditional',
    category: 'operators',
    name: 'ternary conditional operator',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Conditional")
value = close > open ? high : low
plot(value)
`),
  },
  {
    id: 'operators.nested-conditional',
    category: 'operators',
    name: 'nested ternary conditional operator',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Nested conditional")
value = close > open ? high : close < open ? low : close
plot(value)
`),
  },
  {
    id: 'operators.history-reference',
    category: 'operators',
    name: 'history-reference operator',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("History")
plot(close[1])
`),
  },
  {
    id: 'operators.member-access',
    category: 'operators',
    name: 'member access operator',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.operators,
    snippet: script(`
indicator("Member access")
plot(color.r(color.rgb(1, 2, 3)))
`),
  },
  {
    id: 'operators.method-call',
    category: 'operators',
    name: 'method call syntax',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.methods,
    snippet: script(`
indicator("Method call")
values = array.new_float()
values.push(close)
plot(values.get(0))
`),
  },
  {
    id: 'conditionals.if-statement',
    category: 'conditionals',
    name: 'if statement',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("If")
value = close
if close > open
    value := high
else
    value := low
plot(value)
`),
  },
  {
    id: 'conditionals.else-if',
    category: 'conditionals',
    name: 'else if chain',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("Else if")
value = close
if close > open
    value := high
else if close < open
    value := low
else
    value := close
plot(value)
`),
  },
  {
    id: 'conditionals.if-expression',
    category: 'conditionals',
    name: 'if used as an expression',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("If expression")
value = if close > open
    high
else
    low
plot(value)
`),
  },
  {
    id: 'conditionals.switch-expression',
    category: 'conditionals',
    name: 'switch expression with discriminant',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("Switch expression")
state = close > open ? 1 : 0
value = switch state
    1 => high
    => low
plot(value)
`),
  },
  {
    id: 'conditionals.switch-condition-form',
    category: 'conditionals',
    name: 'switch expression without discriminant',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("Switch condition")
value = switch
    close > open => high
    close < open => low
    => close
plot(value)
`),
  },
  {
    id: 'conditionals.once',
    category: 'conditionals',
    name: 'once block',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.conditionalStructures,
    snippet: script(`
indicator("Once")
var value = 0.0
once
    value := close
plot(value)
`),
  },
  {
    id: 'loops.for-to',
    category: 'loops',
    name: 'numeric for loop',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("For to")
sum = 0
for i = 0 to 2
    sum += i
plot(sum)
`),
  },
  {
    id: 'loops.for-to-by',
    category: 'loops',
    name: 'numeric for loop with by step',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("For by")
sum = 0
for i = 0 to 4 by 2
    sum += i
plot(sum)
`),
  },
  {
    id: 'loops.for-in-value',
    category: 'loops',
    name: 'for...in value loop',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("For in value")
values = array.from(1.0, 2.0, 3.0)
sum = 0.0
for value in values
    sum += value
plot(sum)
`),
  },
  {
    id: 'loops.for-in-index-value',
    category: 'loops',
    name: 'for...in index/value loop',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("For in tuple")
values = array.from(1.0, 2.0, 3.0)
sum = 0.0
for [index, value] in values
    sum += value + index
plot(sum)
`),
  },
  {
    id: 'loops.while',
    category: 'loops',
    name: 'while loop',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("While")
sum = 0
i = 0
while i < 3
    sum += i
    i += 1
plot(sum)
`),
  },
  {
    id: 'loops.break',
    category: 'loops',
    name: 'break statement',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("Break")
sum = 0
for i = 0 to 3
    if i == 2
        break
    sum += i
plot(sum)
`),
  },
  {
    id: 'loops.continue',
    category: 'loops',
    name: 'continue statement',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.loops,
    snippet: script(`
indicator("Continue")
sum = 0
for i = 0 to 3
    if i == 2
        continue
    sum += i
plot(sum)
`),
  },
  {
    id: 'functions.expression-body',
    category: 'functions-methods',
    name: 'function declaration with expression body',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.userDefinedFunctions,
    snippet: script(`
indicator("Function expression")
scale(float value, float multiplier=2.0) => value * multiplier
plot(scale(close))
`),
  },
  {
    id: 'functions.block-body',
    category: 'functions-methods',
    name: 'function declaration with block body',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.userDefinedFunctions,
    snippet: script(`
indicator("Function block")
scale(float value) =>
    adjusted = value * 2
    adjusted
plot(scale(close))
`),
  },
  {
    id: 'functions.exported',
    category: 'functions-methods',
    name: 'exported library function',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.userDefinedFunctions,
    snippet: script(`
library("ExportedFunctions")
export scale(float value) => value * 2
`),
  },
  {
    id: 'methods.declaration',
    category: 'functions-methods',
    name: 'method declaration with receiver parameter',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.methods,
    snippet: script(`
indicator("Method declaration")
method scaled(float this, float factor) => this * factor
plot(close.scaled(2))
`),
  },
  {
    id: 'methods.overload',
    category: 'functions-methods',
    name: 'overload method declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.methods,
    snippet: script(`
indicator("Method overload")
method shifted(float this, float amount) => this + amount
overload method shifted(int this, int amount) => this + amount
plot(close.shifted(1) + bar_index.shifted(1))
`),
  },
  {
    id: 'methods.exported',
    category: 'functions-methods',
    name: 'exported library method',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.methods,
    snippet: script(`
library("ExportedMethods")
export method shifted(float this, float amount) => this + amount
`),
  },
  {
    id: 'objects.udt-field-defaults',
    category: 'types',
    name: 'UDT with field defaults',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.objects,
    snippet: script(`
indicator("UDT defaults")
type Pivot
    int index = 0
    float price = close
Pivot point = Pivot.new()
plot(point.price + point.index)
`),
  },
  {
    id: 'objects.field-assignment',
    category: 'types',
    name: 'UDT field reassignment',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.objects,
    snippet: script(`
indicator("UDT assignment")
type Pivot
    float price = close
Pivot point = Pivot.new(close)
point.price := high
plot(point.price)
`),
  },
  {
    id: 'objects.exported-udt',
    category: 'types',
    name: 'exported UDT in library',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.objects,
    snippet: script(`
library("ExportedTypes")
export type Pivot
    float price = 0.0
export make(float price) => Pivot.new(price)
`),
  },
  {
    id: 'enums.declaration',
    category: 'enums',
    name: 'enum declaration with titles',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.enums,
    snippet: script(`
indicator("Enum")
enum Direction
    up = "Up"
    down = "Down"
Direction selected = Direction.up
plot(selected == Direction.up ? 1 : 0)
`),
  },
  {
    id: 'enums.exported',
    category: 'enums',
    name: 'exported enum in library',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.enums,
    snippet: script(`
library("ExportedEnums")
export enum Direction
    up = "Up"
    down = "Down"
export defaultDirection() => Direction.up
`),
  },
  {
    id: 'tuples.declaration',
    category: 'tuples',
    name: 'tuple declaration',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Tuple declaration")
[basis, upper, lower] = ta.bb(close, 2, 2.0)
plot(basis + upper + lower)
`),
  },
  {
    id: 'tuples.discard-underscore',
    category: 'tuples',
    name: 'tuple destructuring with underscore discard',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Tuple discard")
[_, upper, lower] = ta.bb(close, 2, 2.0)
plot(upper + lower)
`),
  },
  {
    id: 'tuples.reassignment',
    category: 'tuples',
    name: 'tuple reassignment',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.variableDeclarations,
    snippet: script(`
indicator("Tuple reassignment")
[basis, upper, lower] = ta.bb(close, 2, 2.0)
[basis, upper, lower] := ta.bb(open, 2, 2.0)
plot(basis + upper + lower)
`),
  },
  {
    id: 'arrays.array-literal',
    category: 'arrays-matrices-maps',
    name: 'array literal expression',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.arrays,
    snippet: script(`
indicator("Array literal")
values = [1.0, 2.0, close]
plot(values.get(2))
`),
  },
  {
    id: 'arrays.generic-new-call',
    category: 'arrays-matrices-maps',
    name: 'generic collection constructor call',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.arrays,
    snippet: script(`
indicator("Generic new")
values = array.new<float>(1, close)
plot(values.get(0))
`),
  },
  {
    id: 'formatting.call-continuation',
    category: 'formatting',
    name: 'multi-line call continuation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Call continuation")
plot(
    close,
    title="Close"
)
`),
  },
  {
    id: 'formatting.expression-continuation',
    category: 'formatting',
    name: 'multi-line expression continuation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Expression continuation")
value = close +
    open -
    low
plot(value)
`),
  },
  {
    id: 'formatting.method-chain-continuation',
    category: 'formatting',
    name: 'multi-line method-chain continuation',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Method chain")
values = array.new_float()
values
    .push(close)
plot(values.get(0))
`),
  },
  {
    id: 'formatting.inline-comment',
    category: 'formatting',
    name: 'line comments',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
indicator("Comments")
// line comment
value = close // trailing comment
plot(value)
`),
  },
  {
    id: 'formatting.doc-annotations',
    category: 'formatting',
    name: 'doc-comment annotations',
    source: PINE_V6_GRAMMAR_REFERENCE_SOURCES.scriptStructure,
    snippet: script(`
library("DocAnnotations")
//@description Library docs
//@function Scales a value
//@param value source value
//@returns scaled value
export scale(float value) => value * 2
//@type Pivot Docs
//@field price Price docs
export type Pivot
    float price = 0.0
//@enum Direction Docs
export enum Direction
    up = "Up"
//@variable defaultPrice Docs
export float defaultPrice = 1.0
//@strategy_alert_message fill
export message() => "fill"
`),
    notes: 'Pine doc annotations are comment syntax for parser compatibility here; TealScript does not interpret their metadata payloads.',
  },
] as const satisfies readonly PineV6GrammarConstruct[];

export const PINE_V6_KNOWN_MISSING_GRAMMAR = [] as const;

export interface PineV6GrammarCoverageSummary {
  total: number;
  covered: number;
  missing: number;
  byCategory: Record<PineV6GrammarCategory, { total: number; covered: number; missing: number }>;
}

export function summarizePineV6GrammarCoverage(): PineV6GrammarCoverageSummary {
  const missingIds = new Set<string>(PINE_V6_KNOWN_MISSING_GRAMMAR);
  const byCategory = {} as Record<PineV6GrammarCategory, { total: number; covered: number; missing: number }>;

  for (const construct of PINE_V6_GRAMMAR_CONSTRUCTS) {
    byCategory[construct.category] ??= { total: 0, covered: 0, missing: 0 };
    byCategory[construct.category].total += 1;
    if (missingIds.has(construct.id)) {
      byCategory[construct.category].missing += 1;
    } else {
      byCategory[construct.category].covered += 1;
    }
  }

  return {
    total: PINE_V6_GRAMMAR_CONSTRUCTS.length,
    covered: PINE_V6_GRAMMAR_CONSTRUCTS.length - PINE_V6_KNOWN_MISSING_GRAMMAR.length,
    missing: PINE_V6_KNOWN_MISSING_GRAMMAR.length,
    byCategory,
  };
}
