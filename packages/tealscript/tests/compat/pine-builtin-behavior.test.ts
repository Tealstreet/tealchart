import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import type { Bar } from '../../src/runtime';
import {
  addExpectedValueProvenanceCount,
  assertExpectedValueProvenanceDeclared,
  countExpectedErrors,
  countExpectedPlotValues,
  emptyExpectedValueProvenanceCounts,
  type ExpectedValueProvenanceDeclaration,
  type ExpectedValueProvenanceCounts,
} from './behaviorProvenance';
import { getPlot, roundSeries, runCompatScript } from './fixtures';

type ExpectedValue = number | null;

interface BehaviorCase extends ExpectedValueProvenanceDeclaration {
  name: string;
  covers: readonly string[];
  source: string;
  bars?: Bar[];
  expectedPlots?: Record<string, ExpectedValue | ExpectedValue[]>;
  expectedErrors?: string[];
}

type BehaviorCaseInput = Omit<BehaviorCase, keyof ExpectedValueProvenanceDeclaration>;

const behaviorNamespaces = ['math', 'str', 'array', 'matrix', 'map', 'color'] as const;
const manualBehaviorNames = [...new Set(Object.values(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX).flat())]
  .filter((name) => behaviorNamespaces.some((namespace) => name.startsWith(`${namespace}.`)))
  .sort();

const singleBar: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 1_000 },
];

const threeBars: Bar[] = [
  { time: 1, open: 100, high: 103, low: 99, close: 102, volume: 1_000 },
  { time: 2, open: 102, high: 106, low: 101, close: 105, volume: 1_100 },
  { time: 3, open: 105, high: 108, low: 104, close: 107, volume: 900 },
];

const namespaceCaseInputs: Record<(typeof behaviorNamespaces)[number], BehaviorCaseInput[]> = {
  math: [
    {
      name: 'constants, unary helpers, trig, rounding, and random range',
      covers: [
        'math.abs',
        'math.acos',
        'math.asin',
        'math.atan',
        'math.ceil',
        'math.cos',
        'math.e',
        'math.exp',
        'math.floor',
        'math.log',
        'math.log10',
        'math.phi',
        'math.pi',
        'math.pow',
        'math.random',
        'math.round',
        'math.round_to_mintick',
        'math.rphi',
        'math.sign',
        'math.sin',
        'math.sqrt',
        'math.tan',
        'math.todegrees',
        'math.toradians',
      ],
      source: `
indicator("math full")
rand = math.random(0, 1, 42)
plot(math.abs(-3), title="Abs")
plot(math.round(math.acos(0), 6), title="Acos")
plot(math.round(math.asin(1), 6), title="Asin")
plot(math.round(math.atan(1), 6), title="Atan")
plot(math.ceil(1.2), title="Ceil")
plot(math.round(math.cos(0), 6), title="Cos")
plot(math.round(math.e, 2), title="E")
plot(math.round(math.exp(1), 2), title="Exp")
plot(math.floor(1.9), title="Floor")
plot(math.round(math.log(math.e), 6), title="Log")
plot(math.round(math.log10(100), 6), title="Log10")
plot(math.round(math.phi, 3), title="Phi")
plot(math.round(math.pi, 2), title="Pi")
plot(math.pow(2, 3), title="Pow")
plot(rand >= 0 and rand < 1 ? 1 : 0, title="Random Range")
plot(math.round(1.234, 2), title="Round")
plot(math.round_to_mintick(1.234), title="Mintick")
plot(math.round(math.rphi, 3), title="RPhi")
plot(math.sign(-42), title="Sign")
plot(math.round(math.sin(math.pi / 2), 6), title="Sin")
plot(math.sqrt(9), title="Sqrt")
plot(math.round(math.tan(0), 6), title="Tan")
plot(math.todegrees(math.pi), title="Degrees")
plot(math.round(math.toradians(180), 6), title="Radians")
`,
      expectedPlots: {
        Abs: 3,
        Acos: 1.570796,
        Asin: 1.570796,
        Atan: 0.785398,
        Ceil: 2,
        Cos: 1,
        E: 2.72,
        Exp: 2.72,
        Floor: 1,
        Log: 1,
        Log10: 2,
        Phi: 1.618,
        Pi: 3.14,
        Pow: 8,
        'Random Range': 1,
        Round: 1.23,
        Mintick: 1.23,
        RPhi: 0.618,
        Sign: -1,
        Sin: 1,
        Sqrt: 3,
        Tan: 0,
        Degrees: 180,
        Radians: 3.141593,
      },
    },
    {
      name: 'variadic numeric helpers and na propagation',
      covers: ['math.avg', 'math.max', 'math.min'],
      source: `
indicator("math variadic")
plot(math.max(1, 5, -2), title="Max")
plot(math.min(1, 5, -2), title="Min")
plot(math.avg(1, 2, 3), title="Avg")
plot(math.avg(1, na, 3), title="Avg NA")
`,
      expectedPlots: { Max: 5, Min: -2, Avg: 2, 'Avg NA': null },
    },
    {
      name: 'series window sum requires a complete non-na lookback',
      covers: ['math.sum'],
      bars: threeBars,
      source: `
indicator("math sum")
src = bar_index == 1 ? na : close
plot(math.sum(close, 2), title="Sum")
plot(math.sum(src, 2), title="Sum With NA")
`,
      expectedPlots: {
        Sum: [null, 207, 212],
        'Sum With NA': [null, null, 209],
      },
    },
  ],
  str: [
    {
      name: 'search, slicing, replacement, regex, and unicode case helpers',
      covers: [
        'str.contains',
        'str.endswith',
        'str.length',
        'str.lower',
        'str.match',
        'str.pos',
        'str.replace',
        'str.replace_all',
        'str.startswith',
        'str.substring',
        'str.trim',
        'str.upper',
      ],
      source: `
indicator("string helpers")
text = "Ångström café"
plot(str.length(text), title="Length")
plot(str.pos(text, "ström"), title="Position")
plot(str.contains(text, "café") ? 1 : 0, title="Contains")
plot(str.startswith(text, "Ång") ? 1 : 0, title="Starts")
plot(str.endswith(text, "fé") ? 1 : 0, title="Ends")
plot(str.substring("abcdef", 1, 4) == "bcd" ? 1 : 0, title="Substring")
plot(str.match("abc123", "[0-9]+") == "123" ? 1 : 0, title="Match")
plot(str.replace("one two one", "one", "1", 1) == "one two 1" ? 1 : 0, title="Replace")
plot(str.replace_all("one two one", "one", "1") == "1 two 1" ? 1 : 0, title="Replace All")
plot(str.upper("å") == "Å" ? 1 : 0, title="Upper")
plot(str.lower("CAFÉ") == "café" ? 1 : 0, title="Lower")
plot(str.trim("  Pine  ") == "Pine" ? 1 : 0, title="Trim")
`,
      expectedPlots: {
        Length: 13,
        Position: 3,
        Contains: 1,
        Starts: 1,
        Ends: 1,
        Substring: 1,
        Match: 1,
        Replace: 1,
        'Replace All': 1,
        Upper: 1,
        Lower: 1,
        Trim: 1,
      },
    },
    {
      name: 'formatting, time formatting, split, tonumber, tostring, repeat, and na edge cases',
      covers: ['str.format', 'str.format_time', 'str.repeat', 'str.split', 'str.tonumber', 'str.tostring'],
      source: `
indicator("string format")
formatted = str.format("range {0,number,#.#}-{1,number,integer}", 1.34, 2.9)
parts = str.split("α|β|γ", "|")
plot(formatted == "range 1.3-3" ? 1 : 0, title="Format")
plot(str.format_time(1700000000000, "yyyy-MM-dd HH:mm", "UTC") == "2023-11-14 22:13" ? 1 : 0, title="Format Time")
plot(array.size(parts), title="Split Size")
plot(array.get(parts, 1) == "β" ? 1 : 0, title="Split Unicode")
plot(str.tonumber("12.5"), title="Number")
plot(na(str.tonumber("nope")) ? 1 : 0, title="Bad Number")
plot(str.tostring(12.3456, "#.##") == "12.35" ? 1 : 0, title="To String")
plot(str.tostring(na) == "NaN" ? 1 : 0, title="To String NA")
plot(str.repeat("ha", 3, "-") == "ha-ha-ha" ? 1 : 0, title="Repeat")
plot(na(str.repeat("ha", -1)) ? 1 : 0, title="Repeat Negative")
plot(na(str.length(na)) ? 1 : 0, title="Length NA")
plot(na(str.pos("abc", "z")) ? 1 : 0, title="Missing Position")
`,
      expectedPlots: {
        Format: 1,
        'Format Time': 1,
        'Split Size': 3,
        'Split Unicode': 1,
        Number: 12.5,
        'Bad Number': 1,
        'To String': 1,
        'To String NA': 1,
        Repeat: 1,
        'Repeat Negative': 1,
        'Length NA': 1,
        'Missing Position': 1,
      },
    },
  ],
  array: [
    {
      name: 'constructors, copy, slice view mutation, search, and statistics',
      covers: [
        'array.abs',
        'array.avg',
        'array.copy',
        'array.first',
        'array.from',
        'array.get',
        'array.includes',
        'array.indexof',
        'array.last',
        'array.lastindexof',
        'array.max',
        'array.median',
        'array.min',
        'array.mode',
        'array.new',
        'array.new_bool',
        'array.new_box',
        'array.new_color',
        'array.new_float',
        'array.new_int',
        'array.new_label',
        'array.new_line',
        'array.new_linefill',
        'array.new_string',
        'array.new_table',
        'array.range',
        'array.size',
        'array.slice',
        'array.sum',
        'array.variance',
      ],
      source: `
indicator("array behavior")
values = array.from(3, 1, 2, 2)
copy = array.copy(values)
copy.set(0, 9)
slice = array.slice(values, 1, 3)
slice.set(0, 7)
slice.push(8)
tailAfterSlicePush = array.last(values)
absValues = array.abs(array.from(-2, 3))
plot(array.size(array.new(1, 4)), title="New")
plot(array.size(array.new_float(2, 1.5)), title="New Float")
plot(array.size(array.new_int(2, 1)), title="New Int")
plot(array.size(array.new_bool(2, true)), title="New Bool")
plot(array.size(array.new_string(1, "x")), title="New String")
plot(array.get(array.new_color(1, color.red), 0) == color.red ? 1 : 0, title="New Color")
plot(array.size(array.new_label(1)), title="New Label")
plot(array.size(array.new_line(1)), title="New Line")
plot(array.size(array.new_box(1)), title="New Box")
plot(array.size(array.new_linefill(1)), title="New Linefill")
plot(array.size(array.new_table(1)), title="New Table")
plot(array.get(values, 0), title="Original Head")
plot(array.get(copy, 0), title="Copy Head")
plot(array.get(values, 1), title="Slice Mutated")
plot(array.size(values), title="Slice Push Size")
plot(array.first(values), title="First")
plot(tailAfterSlicePush, title="Last")
plot(array.get(absValues, 0), title="Abs First")
plot(values.includes(8) ? 1 : 0, title="Includes")
plot(values.indexof(2), title="Index")
plot(values.lastindexof(2), title="Last Index")
plot(values.min(), title="Min")
plot(values.max(), title="Max")
plot(values.sum(), title="Sum")
plot(values.avg(), title="Avg")
plot(values.range(), title="Range")
plot(values.median(), title="Median")
plot(values.mode(), title="Mode")
plot(array.variance(array.from(1, 2, 3), true), title="Variance Biased")
plot(array.variance(array.from(1, 2, 3), false), title="Variance Unbiased")
`,
      expectedPlots: {
        New: 1,
        'New Float': 2,
        'New Int': 2,
        'New Bool': 2,
        'New String': 1,
        'New Color': 1,
        'New Label': 1,
        'New Line': 1,
        'New Box': 1,
        'New Linefill': 1,
        'New Table': 1,
        'Original Head': 3,
        'Copy Head': 9,
        'Slice Mutated': 7,
        'Slice Push Size': 5,
        First: 3,
        Last: 2,
        'Abs First': 2,
        Includes: 1,
        Index: 2,
        'Last Index': 4,
        Min: 2,
        Max: 8,
        Sum: 22,
        Avg: 4.4,
        Range: 6,
        Median: 3,
        Mode: 2,
        'Variance Biased': 0.666667,
        'Variance Unbiased': 1,
      },
    },
    {
      name: 'mutation helpers, sorting, joining, and covariance',
      covers: [
        'array.clear',
        'array.concat',
        'array.covariance',
        'array.every',
        'array.fill',
        'array.insert',
        'array.join',
        'array.pop',
        'array.push',
        'array.remove',
        'array.reverse',
        'array.set',
        'array.shift',
        'array.some',
        'array.sort',
        'array.sort_indices',
        'array.stdev',
        'array.unshift',
      ],
      source: `
indicator("array mutation behavior")
values = array.from(1, 2)
pushSize = array.push(values, 3)
unshiftSize = array.unshift(values, 0)
insertSize = array.insert(values, 2, 9)
array.set(values, 0, -1)
removed = array.remove(values, 2)
popped = array.pop(values)
shifted = array.shift(values)
array.fill(values, 5)
array.concat(values, array.from(7, 8))
joined = array.join(values, "|")
filledHead = array.get(values, 0)
array.reverse(values)
sortMe = array.from(3, 1, 2)
indices = array.sort_indices(sortMe)
array.sort(sortMe)
clearMe = array.from(1, 2)
array.clear(clearMe)
bools = array.from(true, true)
mixed = array.from(false, 0, 3)
plot(pushSize, title="Push Size")
plot(unshiftSize, title="Unshift Size")
plot(insertSize, title="Insert Size")
plot(removed, title="Removed")
plot(popped, title="Popped")
plot(shifted, title="Shifted")
plot(filledHead, title="Filled Head")
plot(array.size(values), title="Concat Size")
plot(joined == "5|5|7|8" ? 1 : 0, title="Join")
plot(array.get(values, 0), title="Reverse Head")
plot(array.get(indices, 0), title="Sort Index First")
plot(array.get(sortMe, 0), title="Sorted Head")
plot(array.size(clearMe), title="Cleared Size")
plot(array.every(bools) ? 1 : 0, title="Every")
plot(array.some(mixed) ? 1 : 0, title="Some")
plot(array.stdev(array.from(1, 2, 3), true), title="Stdev")
plot(array.covariance(array.from(1, 2, 3), array.from(2, 4, 6), true), title="Covariance")
`,
      expectedPlots: {
        'Push Size': 3,
        'Unshift Size': 4,
        'Insert Size': 5,
        Removed: 9,
        Popped: 3,
        Shifted: -1,
        'Filled Head': 5,
        'Concat Size': 4,
        Join: 1,
        'Reverse Head': 8,
        'Sort Index First': 1,
        'Sorted Head': 1,
        'Cleared Size': 0,
        Every: 1,
        Some: 1,
        Stdev: 0.816497,
        Covariance: 1.333333,
      },
    },
    {
      name: 'binary search, percentile, percentrank, standardize, and empty aggregate edges',
      covers: [
        'array.binary_search',
        'array.binary_search_leftmost',
        'array.binary_search_rightmost',
        'array.percentile_linear_interpolation',
        'array.percentile_nearest_rank',
        'array.percentrank',
        'array.standardize',
      ],
      source: `
indicator("array edge behavior")
values = array.from(1, 2, 2, 4)
standard = array.standardize(array.from(1, 2, 3))
empty = array.new_float()
plot(array.binary_search(values, 2), title="Binary Search")
plot(array.binary_search_leftmost(values, 3), title="Binary Left Missing")
plot(array.binary_search_rightmost(values, 3), title="Binary Right Missing")
plot(array.percentile_nearest_rank(values, 50), title="Nearest Rank")
plot(array.percentile_linear_interpolation(values, 50), title="Linear Percentile")
plot(array.percentrank(values, 1), title="Percent Rank")
plot(array.get(standard, 0), title="Standard First")
plot(na(array.avg(empty)) ? 1 : 0, title="Empty Avg")
`,
      expectedPlots: {
        'Binary Search': 1,
        'Binary Left Missing': 2,
        'Binary Right Missing': 3,
        'Nearest Rank': 2,
        'Linear Percentile': 2,
        'Percent Rank': 75,
        'Standard First': -1.224745,
        'Empty Avg': 1,
      },
    },
    {
      name: 'empty pop reports a runtime error',
      covers: ['array.pop'],
      source: `
indicator("array empty pop")
empty = array.new_float()
plot(array.pop(empty), title="Bad Pop")
`,
      expectedErrors: ['Cannot use pop() if array is empty.'],
    },
    {
      name: 'empty shift reports a runtime error',
      covers: ['array.shift'],
      source: `
indicator("array empty shift")
empty = array.new_float()
plot(array.shift(empty), title="Bad Shift")
`,
      expectedErrors: ['Cannot use shift() if array is empty.'],
    },
    {
      name: 'empty first reports the normal index runtime error',
      covers: ['array.first'],
      source: `
indicator("array empty first")
empty = array.new_float()
plot(array.first(empty), title="Bad First")
`,
      expectedErrors: ['Array index 0 is out of bounds. Array size is 0'],
    },
    {
      name: 'empty last reports the normal index runtime error',
      covers: ['array.last'],
      source: `
indicator("array empty last")
empty = array.new_float()
plot(array.last(empty), title="Bad Last")
`,
      expectedErrors: ['Array index -1 is out of bounds. Array size is 0'],
    },
    {
      name: 'negative constructor size reports a runtime error',
      covers: ['array.new', 'array.new_float'],
      source: `
indicator("array negative size")
values = array.new_float(-1)
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Cannot create an array with a negative size'],
    },
    {
      name: 'oversized constructor reports Pine maximum array size',
      covers: ['array.new', 'array.new_float'],
      source: `
indicator("array oversized")
values = array.new_float(100001)
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Array is too large. Maximum size is 100000'],
    },
    {
      name: 'append beyond the maximum array size reports a runtime error',
      covers: ['array.push'],
      source: `
indicator("array oversized append")
values = array.new_float(100000)
array.push(values, 1)
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Array is too large. Maximum size is 100000'],
    },
    {
      name: 'unshift beyond the maximum array size reports a runtime error',
      covers: ['array.unshift'],
      source: `
indicator("array oversized unshift")
values = array.new_float(100000)
array.unshift(values, 1)
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Array is too large. Maximum size is 100000'],
    },
    {
      name: 'insert beyond the maximum array size reports a runtime error',
      covers: ['array.insert'],
      source: `
indicator("array oversized insert")
values = array.new_float(100000)
array.insert(values, 0, 1)
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Array is too large. Maximum size is 100000'],
    },
    {
      name: 'concat beyond the maximum array size reports a runtime error',
      covers: ['array.concat'],
      source: `
indicator("array oversized concat")
values = array.new_float(100000)
array.concat(values, array.new_float(1))
plot(array.size(values), title="Bad")
`,
      expectedErrors: ['Array is too large. Maximum size is 100000'],
    },
    {
      name: 'out-of-range get reports a runtime error',
      covers: ['array.get'],
      source: `
indicator("array invalid get")
values = array.from(1)
plot(array.get(values, 1), title="Bad")
`,
      expectedErrors: ['Array index 1 is out of bounds. Array size is 1'],
    },
    {
      name: 'negative slice bounds report a runtime error',
      covers: ['array.slice'],
      source: `
indicator("array invalid slice")
values = array.from(1, 2)
slice = array.slice(values, -1, 1)
plot(array.size(slice), title="Bad")
`,
      expectedErrors: ['Slice is out of bounds of the parent array'],
    },
  ],
  matrix: [
    {
      name: 'constructors, shape, arithmetic, linear algebra, and predicates',
      covers: [
        'matrix.avg',
        'matrix.col',
        'matrix.columns',
        'matrix.det',
        'matrix.diff',
        'matrix.eigenvalues',
        'matrix.eigenvectors',
        'matrix.elements_count',
        'matrix.get',
        'matrix.inv',
        'matrix.is_antidiagonal',
        'matrix.is_antisymmetric',
        'matrix.is_binary',
        'matrix.is_diagonal',
        'matrix.is_identity',
        'matrix.is_square',
        'matrix.is_stochastic',
        'matrix.is_symmetric',
        'matrix.is_triangular',
        'matrix.is_zero',
        'matrix.kron',
        'matrix.max',
        'matrix.median',
        'matrix.min',
        'matrix.mode',
        'matrix.mult',
        'matrix.new',
        'matrix.pinv',
        'matrix.pow',
        'matrix.rank',
        'matrix.row',
        'matrix.rows',
        'matrix.set',
        'matrix.sum',
        'matrix.trace',
        'matrix.transpose',
      ],
      source: `
indicator("matrix behavior")
m = matrix.new_float(2, 2, 0)
m.set(0, 0, 1)
m.set(0, 1, 2)
m.set(1, 0, 3)
m.set(1, 1, 4)
n = matrix.new_float(2, 2, 1)
sum = matrix.sum(m, n)
diff = matrix.diff(m, 1)
prod = matrix.mult(m, n)
pow = matrix.pow(m, 2)
transposed = m.transpose()
row = m.row(1)
col = m.col(0)
identity = matrix.new_float(2, 2, 0)
identity.set(0, 0, 1)
identity.set(1, 1, 1)
anti = matrix.new_float(2, 2, 0)
anti.set(0, 1, 1)
anti.set(1, 0, 1)
antisym = matrix.new_float(2, 2, 0)
antisym.set(0, 1, 2)
antisym.set(1, 0, -2)
binary = matrix.new_int(2, 2, 1)
diag = matrix.new_float(2, 2, 0)
diag.set(0, 0, 2)
diag.set(1, 1, 3)
stoch = matrix.new_float(2, 2, 0.5)
zero = matrix.new_float(2, 2, 0)
inv = matrix.inv(m)
pinv = matrix.pinv(identity)
eigenvalues = matrix.eigenvalues(identity)
eigenvectors = matrix.eigenvectors(identity)
kron = matrix.kron(identity, n)
plot(m.rows(), title="Rows")
plot(m.columns(), title="Columns")
plot(m.elements_count(), title="Elements")
plot(matrix.get(sum, 1, 1), title="Sum")
plot(diff.get(0, 0), title="Diff")
plot(prod.get(0, 0), title="Product")
plot(pow.get(1, 1), title="Power")
plot(transposed.get(1, 0), title="Transpose")
plot(array.get(row, 0), title="Row")
plot(array.get(col, 1), title="Column")
plot(matrix.trace(m), title="Trace")
plot(matrix.det(m), title="Det")
plot(matrix.rank(m), title="Rank")
plot(matrix.avg(m), title="Avg")
plot(matrix.min(m), title="Min")
plot(matrix.max(m), title="Max")
plot(matrix.median(m), title="Median")
plot(matrix.mode(matrix.new_float(2, 2, 5)), title="Mode")
plot(matrix.is_square(m) ? 1 : 0, title="Square")
plot(matrix.is_identity(identity) ? 1 : 0, title="Identity")
plot(matrix.is_symmetric(m) ? 1 : 0, title="Symmetric")
plot(matrix.is_antidiagonal(anti) ? 1 : 0, title="Antidiagonal")
plot(matrix.is_antisymmetric(antisym) ? 1 : 0, title="Antisymmetric")
plot(matrix.is_binary(binary) ? 1 : 0, title="Binary")
plot(matrix.is_diagonal(diag) ? 1 : 0, title="Diagonal")
plot(matrix.is_stochastic(stoch) ? 1 : 0, title="Stochastic")
plot(matrix.is_triangular(diag) ? 1 : 0, title="Triangular")
plot(matrix.is_zero(zero) ? 1 : 0, title="Zero")
plot(matrix.get(inv, 0, 0), title="Inv")
plot(matrix.get(pinv, 0, 0), title="Pinv")
plot(array.size(eigenvalues), title="Eigenvalue Count")
plot(matrix.get(eigenvectors, 0, 0), title="Eigenvector Head")
plot(matrix.rows(kron), title="Kron Rows")
plot(matrix.columns(matrix.new(1, 2, 9)), title="New Generic")
plot(matrix.get(matrix.new_int(1, 1, 7), 0, 0), title="New Int")
plot(matrix.get(matrix.new_bool(1, 1, true), 0, 0) ? 1 : 0, title="New Bool")
plot(matrix.get(matrix.new_string(1, 1, "x"), 0, 0) == "x" ? 1 : 0, title="New String")
plot(matrix.get(matrix.new_color(1, 1, color.blue), 0, 0) == color.blue ? 1 : 0, title="New Color")
`,
      expectedPlots: {
        Rows: 2,
        Columns: 2,
        Elements: 4,
        Sum: 5,
        Diff: 0,
        Product: 3,
        Power: 22,
        Transpose: 2,
        Row: 3,
        Column: 3,
        Trace: 5,
        Det: -2,
        Rank: 2,
        Avg: 2.5,
        Min: 1,
        Max: 4,
        Median: 2.5,
        Mode: 5,
        Square: 1,
        Identity: 1,
        Symmetric: 0,
        Antidiagonal: 1,
        Antisymmetric: 1,
        Binary: 1,
        Diagonal: 1,
        Stochastic: 1,
        Triangular: 1,
        Zero: 1,
        Inv: -2,
        Pinv: 1,
        'Eigenvalue Count': 2,
        'Eigenvector Head': 1,
        'Kron Rows': 4,
        'New Generic': 2,
        'New Int': 7,
        'New Bool': 1,
        'New String': 1,
        'New Color': 1,
      },
    },
    {
      name: 'mutation helpers, copying, concatenation, sorting, and submatrix behavior',
      covers: [
        'matrix.add_col',
        'matrix.add_row',
        'matrix.concat',
        'matrix.copy',
        'matrix.fill',
        'matrix.remove_col',
        'matrix.remove_row',
        'matrix.reshape',
        'matrix.reverse',
        'matrix.sort',
        'matrix.submatrix',
        'matrix.swap_columns',
        'matrix.swap_rows',
      ],
      source: `
indicator("matrix mutation behavior")
m = matrix.new_int(2, 3, 0)
m.set(0, 0, 1)
m.set(0, 1, 2)
m.set(0, 2, 3)
m.set(1, 0, 4)
m.set(1, 1, 5)
m.set(1, 2, 6)
copy = matrix.copy(m)
copy.set(0, 0, 99)
slice = m.submatrix(0, 2, 1, 3)
matrix.fill(m, 8, 0, 1, 1, 3)
removedRow = matrix.remove_row(m, 1)
matrix.add_row(m, 1, array.from(7, 8, 9))
removedCol = matrix.remove_col(m, 0)
matrix.add_col(m, 0, array.from(10, 11))
matrix.swap_rows(m, 0, 1)
matrix.swap_columns(m, 0, 1)
matrix.reverse(m)
headAfterReverse = matrix.get(m, 0, 0)
matrix.sort(m, 0, order.ascending)
concatTarget = matrix.new_int(1, 2, 1)
matrix.concat(concatTarget, matrix.new_int(1, 2, 2))
reshaped = matrix.new_int(2, 2, 1)
matrix.reshape(reshaped, 1, 4)
plot(matrix.get(copy, 0, 0), title="Copy Head")
plot(headAfterReverse, title="Original Head")
plot(slice.rows(), title="Slice Rows")
plot(slice.columns(), title="Slice Columns")
plot(slice.get(1, 1), title="Slice Tail")
plot(array.get(removedRow, 0), title="Removed Row Head")
plot(array.get(removedCol, 1), title="Removed Col Tail")
plot(matrix.rows(concatTarget), title="Concat Rows")
plot(matrix.columns(reshaped), title="Reshape Columns")
plot(matrix.rows(m), title="Mutated Rows")
plot(matrix.columns(m), title="Mutated Columns")
`,
      expectedPlots: {
        'Copy Head': 99,
        'Original Head': 8,
        'Slice Rows': 2,
        'Slice Columns': 2,
        'Slice Tail': 6,
        'Removed Row Head': 4,
        'Removed Col Tail': 7,
        'Concat Rows': 2,
        'Reshape Columns': 4,
        'Mutated Rows': 2,
        'Mutated Columns': 3,
      },
    },
    {
      name: 'empty matrix aggregate and submatrix edge behavior',
      covers: ['matrix.avg', 'matrix.columns', 'matrix.rows', 'matrix.submatrix'],
      source: `
indicator("matrix edge behavior")
empty = matrix.new_float()
m = matrix.new_int(2, 3, 0)
m.set(0, 0, 1)
m.set(0, 1, 2)
m.set(0, 2, 3)
m.set(1, 0, 4)
m.set(1, 1, 5)
m.set(1, 2, 6)
slice = m.submatrix(0, 2, 1, 3)
plot(empty.rows(), title="Empty Rows")
plot(empty.columns(), title="Empty Columns")
plot(na(empty.avg()) ? 1 : 0, title="Empty Avg")
plot(slice.rows(), title="Slice Rows")
plot(slice.columns(), title="Slice Columns")
plot(slice.get(1, 1), title="Slice Tail")
`,
      expectedPlots: {
        'Empty Rows': 0,
        'Empty Columns': 0,
        'Empty Avg': 1,
        'Slice Rows': 2,
        'Slice Columns': 2,
        'Slice Tail': 6,
      },
    },
    {
      name: 'dimension mismatch reports a runtime error',
      covers: ['matrix.mult'],
      source: `
indicator("matrix mismatch")
left = matrix.new_float(2, 3, 1)
right = matrix.new_float(2, 2, 1)
bad = matrix.mult(left, right)
plot(bad.rows(), title="Bad")
`,
      expectedErrors: ['Matrix multiplication requires left columns to match right rows. Left is 2x3, right is 2x2'],
    },
    {
      name: 'reshape with a different element count reports a runtime error',
      covers: ['matrix.reshape'],
      source: `
indicator("matrix bad reshape")
m = matrix.new_float(2, 2, 1)
m.reshape(3, 2)
plot(m.rows(), title="Bad")
`,
      expectedErrors: ['Matrix reshape must preserve element count. Existing count is 4'],
    },
  ],
  map: [
    {
      name: 'missing keys, replacement returns, insertion order, copy, clear, and put_all',
      covers: [
        'map.clear',
        'map.contains',
        'map.copy',
        'map.get',
        'map.keys',
        'map.new',
        'map.put',
        'map.put_all',
        'map.remove',
        'map.size',
        'map.values',
      ],
      source: `
indicator("map behavior")
left = map.new<string, int>()
right = map.new<string, int>()
first = left.put("A", 1)
previous = left.put("A", 2)
left.put("B", 3)
right.put("B", 30)
right.put("C", 40)
copy = left.copy()
copy.put_all(right)
keys = copy.keys()
values = copy.values()
removed = copy.remove("B")
missing = copy.get("Missing")
clearMe = map.new<string, int>()
clearMe.put("X", 1)
clearMe.clear()
plot(na(first) ? 1 : 0, title="First Put")
plot(previous, title="Previous Put")
plot(left.get("A"), title="Left A")
plot(copy.get("A"), title="Copy A")
plot(copy.get("C"), title="Copy C")
plot(array.get(keys, 0) == "A" ? 1 : 0, title="Key Order A")
plot(array.get(keys, 1) == "B" ? 1 : 0, title="Key Order B")
plot(array.get(values, 1), title="Value Order")
plot(removed, title="Removed")
plot(na(missing) ? 1 : 0, title="Missing")
plot(copy.contains("B") ? 1 : 0, title="Contains Removed")
plot(copy.size(), title="Size")
plot(clearMe.size(), title="Cleared")
`,
      expectedPlots: {
        'First Put': 1,
        'Previous Put': 1,
        'Left A': 2,
        'Copy A': 2,
        'Copy C': 40,
        'Key Order A': 1,
        'Key Order B': 1,
        'Value Order': 30,
        Removed: 30,
        Missing: 1,
        'Contains Removed': 0,
        Size: 2,
        Cleared: 0,
      },
    },
    {
      name: 'invalid keys report a runtime error',
      covers: ['map.put'],
      source: `
indicator("map invalid key")
m = map.new()
m.put(na, 1)
plot(m.size(), title="Bad")
`,
      expectedErrors: ['Map keys must be finite value types'],
    },
  ],
  color: [
    {
      name: 'named constants, rgb channels, named transparency, and color.new transparency',
      covers: [
        'color.aqua',
        'color.b',
        'color.black',
        'color.blue',
        'color.fuchsia',
        'color.g',
        'color.gray',
        'color.green',
        'color.lime',
        'color.maroon',
        'color.navy',
        'color.new',
        'color.olive',
        'color.orange',
        'color.purple',
        'color.r',
        'color.red',
        'color.rgb',
        'color.silver',
        'color.t',
        'color.teal',
        'color.white',
        'color.yellow',
      ],
      source: `
indicator("color behavior")
base = color.rgb(10, 20, 30, 40)
named = color.rgb(red=1, green=2, blue=3, transp=25)
fresh = color.new(color.red, 75)
plot(color.r(base), title="R")
plot(color.g(base), title="G")
plot(color.b(base), title="B")
plot(color.t(base), title="T")
plot(color.r(named), title="Named R")
plot(color.t(named), title="Named T")
plot(color.r(fresh), title="New R")
plot(color.t(fresh), title="New T")
plot(color.r(color.aqua), title="Aqua R")
plot(color.r(color.black), title="Black R")
plot(color.r(color.blue), title="Blue R")
plot(color.r(color.fuchsia), title="Fuchsia R")
plot(color.r(color.gray), title="Gray R")
plot(color.r(color.green), title="Green R")
plot(color.r(color.lime), title="Lime R")
plot(color.r(color.maroon), title="Maroon R")
plot(color.r(color.navy), title="Navy R")
plot(color.r(color.olive), title="Olive R")
plot(color.r(color.orange), title="Orange R")
plot(color.r(color.purple), title="Purple R")
plot(color.r(color.silver), title="Silver R")
plot(color.r(color.teal), title="Teal R")
plot(color.r(color.white), title="White R")
plot(color.r(color.yellow), title="Yellow R")
`,
      expectedPlots: {
        R: 10,
        G: 20,
        B: 30,
        T: 40,
        'Named R': 1,
        'Named T': 25,
        'New R': 242,
        'New T': 75,
        'Aqua R': 0,
        'Black R': 54,
        'Blue R': 33,
        'Fuchsia R': 224,
        'Gray R': 120,
        'Green R': 76,
        'Lime R': 0,
        'Maroon R': 136,
        'Navy R': 49,
        'Olive R': 128,
        'Orange R': 255,
        'Purple R': 156,
        'Silver R': 178,
        'Teal R': 8,
        'White R': 255,
        'Yellow R': 253,
      },
    },
    {
      name: 'gradient clamps below and above the source range',
      covers: ['color.from_gradient'],
      source: `
indicator("color gradient")
below = color.from_gradient(-5, 0, 10, color.rgb(0, 0, 0, 0), color.rgb(100, 200, 50, 100))
middle = color.from_gradient(5, 0, 10, color.rgb(0, 0, 0, 0), color.rgb(100, 200, 50, 100))
above = color.from_gradient(15, 0, 10, color.rgb(0, 0, 0, 0), color.rgb(100, 200, 50, 100))
plot(color.r(below), title="Below R")
plot(color.g(middle), title="Middle G")
plot(color.b(middle), title="Middle B")
plot(color.t(middle), title="Middle T")
plot(color.r(above), title="Above R")
plot(color.t(above), title="Above T")
`,
      expectedPlots: {
        'Below R': 0,
        'Middle G': 100,
        'Middle B': 25,
        'Middle T': 50,
        'Above R': 100,
        'Above T': 100,
      },
    },
  ],
};

const namespaceCases: Record<(typeof behaviorNamespaces)[number], BehaviorCase[]> = Object.fromEntries(
  Object.entries(namespaceCaseInputs).map(([namespace, cases]) => [
    namespace,
    cases.map((entry) => (
      entry.expectedErrors
        ? {
          ...entry,
          expectedValueProvenance: 'tealscript-regression-pin',
          expectedValueProvenanceNote:
            'Pine v6 requires this runtime-error condition; the exact TealScript diagnostic string is a local regression pin, not a reference numeric value.',
        }
        : {
          ...entry,
          expectedValueProvenance: 'independently-derived',
          expectedValueProvenanceNote:
            'Expected values are independently derived from Pine v6 namespace semantics and documented edge-case behavior.',
        }
    )),
  ]),
) as Record<(typeof behaviorNamespaces)[number], BehaviorCase[]>;

function normalizeExpected(value: ExpectedValue): number | null {
  return typeof value === 'number' ? Math.round(value * 1_000_000) / 1_000_000 : value;
}

function behaviorCaseCoverage(): string[] {
  return [...new Set(Object.values(namespaceCases).flatMap((cases) => cases.flatMap((entry) => [...entry.covers])))].sort();
}

function expectedValueProvenanceCounts(): ExpectedValueProvenanceCounts {
  const counts = emptyExpectedValueProvenanceCounts();
  for (const entry of Object.values(namespaceCases).flat()) {
    assertExpectedValueProvenanceDeclared(entry);
    addExpectedValueProvenanceCount(
      counts,
      entry.expectedValueProvenance,
      countExpectedPlotValues(entry.expectedPlots) + countExpectedErrors(entry.expectedErrors),
    );
  }
  return counts;
}

function expectBehaviorCase(entry: BehaviorCase): void {
  const result = runCompatScript(entry.source, { bars: entry.bars ?? singleBar });
  if (entry.expectedErrors) {
    const messages = result.errors.map((error) => error.message);
    for (const expectedError of entry.expectedErrors) {
      if (!messages.includes(expectedError)) {
        throw new Error(`${entry.name}: expected error ${JSON.stringify(expectedError)}; got ${JSON.stringify(messages)}`);
      }
    }
    return;
  }

  expect(result.errors, entry.name).toEqual([]);
  for (const [title, expected] of Object.entries(entry.expectedPlots ?? {})) {
    const values = getPlot(result, title).values;
    const rounded = roundSeries(values as Array<number | null>);
    if (Array.isArray(expected)) {
      expect(rounded, `${entry.name}: ${title}`).toEqual(expected.map(normalizeExpected));
    } else {
      expect(rounded.at(-1), `${entry.name}: ${title}`).toEqual(normalizeExpected(expected));
    }
  }
}

describe('Pine v6 builtin behavior tables', () => {
  it('covers every official math/str/array/matrix/map/color manual-index name', () => {
    expect(manualBehaviorNames).toHaveLength(185);
    expect(behaviorCaseCoverage()).toEqual(manualBehaviorNames);
  });

  it('declares provenance for every literal expected value and diagnostic string', () => {
    expect(expectedValueProvenanceCounts()).toEqual({
      'independently-derived': 211,
      'published-worked-example': 0,
      'tealscript-regression-pin': 15,
    });
  });

  for (const [namespace, cases] of Object.entries(namespaceCases)) {
    describe(`${namespace}.*`, () => {
      it.each(cases)('$name', (entry) => {
        expectBehaviorCase(entry);
      });
    });
  }
});
