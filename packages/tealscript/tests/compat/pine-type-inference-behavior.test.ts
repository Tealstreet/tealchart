import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Each case cites an entry selector, not an implementation-derived expectation.
// Ledger: type-qualifier-system-v1; narrow member tests do not certify a namespace.
function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Type inference")\n' + body));
}

const valueTypes = [
  { type: 'int', values: ['7', 'input.int(7)', 'syminfo.mincontract > 0 ? 7 : 9', 'bar_index'] },
  { type: 'float', values: ['2.5', 'input.float(2.5)', 'syminfo.mintick', 'close'] },
  { type: 'bool', values: ['true', 'input.bool(true)', 'syminfo.type == "stock"', 'close > open'] },
  { type: 'color', values: ['color.red', 'input.color(color.red)', 'syminfo.type == "stock" ? color.red : color.blue', 'close > open ? color.red : color.blue'] },
  { type: 'string', values: ['"x"', 'input.string("x")', 'syminfo.ticker', 'str.tostring(close)'] },
] as const;

const referenceTypes = [
  { type: 'line', annotation: 'line', init: 'na', reference: 'type/line remarks' },
  { type: 'linefill', annotation: 'linefill', init: 'na', reference: 'type/linefill remarks' },
  { type: 'box', annotation: 'box', init: 'na', reference: 'type/box remarks' },
  { type: 'label', annotation: 'label', init: 'na', reference: 'type/label remarks' },
  { type: 'table', annotation: 'table', init: 'na', reference: 'type/table remarks' },
  { type: 'array', annotation: 'array<float>', init: 'na', reference: 'type/array remarks' },
  { type: 'matrix', annotation: 'matrix<float>', init: 'na', reference: 'type/matrix remarks' },
  { type: 'map', annotation: 'map<string, float>', init: 'na', reference: 'type/map remarks' },
] as const;

const sourceTypes = [
  { expression: 'input.source(close)', type: 'float', qualifier: 'series', reference: 'function/input.source returnedTypes' },
  { expression: 'input.source(2.5)', type: 'float', qualifier: 'series', reference: 'function/input.source returnedTypes and defval allowedTypeIDs' },
  { expression: 'input.source(input.float(2.5))', type: 'float', qualifier: 'series', reference: 'function/input.source returnedTypes and defval allowedTypeIDs' },
  { expression: 'input.source(syminfo.mintick)', type: 'float', qualifier: 'series', reference: 'function/input.source returnedTypes and defval allowedTypeIDs' },
  { expression: 'chart.left_visible_bar_time', type: 'int', qualifier: 'input', reference: 'variable/chart.left_visible_bar_time type' },
  { expression: 'chart.right_visible_bar_time', type: 'int', qualifier: 'input', reference: 'variable/chart.right_visible_bar_time type' },
  { expression: 'syminfo.ticker', type: 'string', qualifier: 'simple', reference: 'variable/syminfo.ticker type' },
  { expression: 'timeframe.period', type: 'string', qualifier: 'simple', reference: 'variable/timeframe.period type' },
  { expression: 'syminfo.mintick', type: 'float', qualifier: 'simple', reference: 'variable/syminfo.mintick type' },
  { expression: 'open', type: 'float', qualifier: 'series', reference: 'variable/open type' },
  { expression: 'high', type: 'float', qualifier: 'series', reference: 'variable/high type' },
  { expression: 'low', type: 'float', qualifier: 'series', reference: 'variable/low type' },
  { expression: 'close', type: 'float', qualifier: 'series', reference: 'variable/close type' },
  { expression: 'volume', type: 'float', qualifier: 'series', reference: 'variable/volume type' },
  { expression: 'time', type: 'int', qualifier: 'series', reference: 'variable/time type' },
  { expression: 'bar_index', type: 'int', qualifier: 'series', reference: 'variable/bar_index type' },
  { expression: 'barstate.isfirst', type: 'bool', qualifier: 'series', reference: 'variable/barstate.isfirst type' },
] as const;

function expectShadowedSizeValue(body: string) {
  const bars = Array.from({ length: 3 }, (_, index) => ({ time: 1700000000000 + index * 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const result = executeScript(parse('//@version=6\nindicator("Shadowed size")\n' + body), bars);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([[3, 3, 3]]);
}

describe('documented value and reference types', () => {
  it.each([
    ['UDF parameter', 'f(Font size) => size.normal\nfloat value = f(Font.new())'],
  ])('resolves a %s named size before builtin size constants', (_name, body) => {
    const result = check('type Font\n    float normal = 3.0\n' + body + '\nplot(value)');
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('float');
    expectShadowedSizeValue('type Font\n    float normal = 3.0\n' + body + '\nplot(value)');
  });

  // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing
  it.each([
    ['global object', 'size = Font.new()\nfloat value = size.normal'],
    ['UDF local', 'f() =>\n    size = Font.new()\n    float answer = size.normal\n    answer\nfloat value = f()'],
  ])('refuses a %s named size that obscures a builtin namespace', (_name, body) => {
    const result = check('type Font\n    float normal = 3.0\n' + body + '\nplot(value)');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['namespace-obscuring']);
    expect(result.diagnostics[0].message).toBe("User-defined type variable 'size' cannot obscure the built-in namespace with that name.");
  });

  it('restores builtin size constants outside a shadowing parameter scope', () => {
    const result = check('type Font\n    float normal = 3.0\nf(Font size) => size.normal\nfloat answer = f(Font.new())\nconst string value = size.normal\nplot(answer)');
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'string', qualifier: 'const' });
    expectShadowedSizeValue('type Font\n    float normal = 3.0\nf(Font size) => size.normal\nfloat answer = f(Font.new())\nconst string value = size.normal\nplot(answer)');
  });

  it.each(['tiny', 'small', 'normal', 'large', 'huge', 'auto'])('size.%s infers const string', (size) => {
    const result = check(`value = size.${size}`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'string', qualifier: 'const' });
  });

  it('widens an inferred label size when assigned an explicitly typed input string', () => {
    const result = checkProgram(parse([
      '//@version=5',
      'indicator("Numbers Renko size")',
      'string selectedSize = input.string(size.large)',
      'fontSize = size.normal',
      'if close > open',
      '    fontSize := selectedSize',
      '    label.new(bar_index, close, size=fontSize)',
      'plot(close)',
    ].join('\n')));
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps explicit const size declarations from accepting input strings', () => {
    const result = check('const string fontSize = size.normal\nfontSize := input.string(size.large)');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('rejects numeric reassignment to an inferred string size', () => {
    const result = check('fontSize = size.normal\nfontSize := 3');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  // Reference: type/int,float,bool,color,string plus type/simple,series hierarchy.
  // Natural RED: scalar annotations discard inferred qualifiers for each type;
  // all five failed before expected-red registration. Open defect
  // TYPE-SCALAR-ANNOTATION-QUALIFIER-LOSS. INVERSE proof: isolated copy inferred
  // the qualifier from the initializer when the scalar annotation omitted it.
  // All five passed as ordinary tests; copy discarded. Four distinct qualifiers reject classifying values as
  // invariably const/series and reject confusing int, float, bool, color, string.
  for (const entry of valueTypes) {
    it(`[TYPE-SCALAR-ANNOTATION-QUALIFIER-LOSS] ${entry.type} supports all four qualifiers`, () => {
      const qualifiers = ['const', 'input', 'simple', 'series'];
      const result = check(entry.values.map((value, index) => `${entry.type} value${index} = ${value}`).join('\n'));
      expect(result.diagnostics).toEqual([]);
      for (const [index, qualifier] of qualifiers.entries()) {
        expect(result.symbols.find((symbol) => symbol.name === `value${index}`)?.type).toEqual({ kind: entry.type, qualifier });
      }
    });
  }

  // RED: replaced default series qualifier with const in typeFromName and
  // typeFromAnnotation; every reference case failed, then passed restored.
  for (const entry of referenceTypes) {
    it(`${entry.type} references remain series [${entry.reference}]`, () => {
      const result = check(`${entry.annotation} value = ${entry.init}`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind: entry.type, qualifier: 'series' });
    });
  }
});

describe('documented source types and qualifiers', () => {
  // RED: changed the corresponding input/simple/series qualifier in member,
  // global inference (inferIdentifierType) to const; all passing cases failed and passed
  // restored. Weak-defval input.source cases naturally fail on the engine:
  // open defect TYPE-INPUT-SOURCE-RETURN-QUALIFIER incorrectly copies defval rank.
  // INVERSE proof: isolated copy returned series float unconditionally for
  // input.source and typed barstate.isfirst as series bool in member inference.
  // All four expected-red assertions passed as ordinary tests; copy discarded.
  for (const entry of sourceTypes) {
    it(`${entry.expression} [${entry.reference}]`, () => {
      const result = check(`value = ${entry.expression}`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: entry.type, qualifier: entry.qualifier });
    });
  }
});
