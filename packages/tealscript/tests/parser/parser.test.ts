/**
 * Tealscript Parser Tests
 */

import { describe, expect, it } from 'vitest';

import { parse, validate, TealscriptParseError, TealscriptParseLimitError, formatParseError } from '../../src/parser';
import type {
  Program,
  FunctionDeclaration,
  EnumDeclaration,
  ImportDeclaration,
  IndicatorDeclaration,
  LibraryDeclaration,
  TypeDeclaration,
  VariableDeclaration,
  CallExpression,
} from '../../src/parser';

describe('Tealscript Parser', () => {
  describe('Version annotation', () => {
    it('parses version annotation', () => {
      const ast = parse('//@version=6\n');
      expect(ast.type).toBe('Program');
      expect(ast.version).toBe(6);
    });

    it('defaults to version 6 when no annotation', () => {
      const ast = parse('x = 1\n');
      expect(ast.version).toBe(6);
    });
  });

  describe('Indicator declaration', () => {
    it('parses basic indicator', () => {
      const ast = parse('indicator("My Indicator")\n');
      expect(ast.body).toHaveLength(1);
      const indicator = ast.body[0] as IndicatorDeclaration;
      expect(indicator.type).toBe('IndicatorDeclaration');
      expect(indicator.title).toEqual(expect.objectContaining({
        type: 'StringLiteral',
        value: 'My Indicator',
      }));
    });

    it('parses indicator with named arguments', () => {
      const ast = parse('indicator("Test", overlay=true, precision=2, dynamic_requests=false, behind_chart=false)\n');
      const indicator = ast.body[0] as IndicatorDeclaration;
      expect(indicator.type).toBe('IndicatorDeclaration');
      expect(indicator.overlay).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: true,
      }));
      expect(indicator.precision).toEqual(expect.objectContaining({
        type: 'NumericLiteral',
        value: 2,
      }));
      expect(indicator.dynamic_requests).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: false,
      }));
      expect(indicator.behind_chart).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: false,
      }));
    });

    it('parses strategy risk-free-rate declaration arguments', () => {
      const ast = parse('strategy("Risk", risk_free_rate=1.75)\n');
      const strategy = ast.body[0] as IndicatorDeclaration;

      expect(strategy.declarationKind).toBe('strategy');
      expect(strategy.risk_free_rate).toEqual(expect.objectContaining({
        type: 'NumericLiteral',
        value: 1.75,
      }));
    });

    it('parses multiline indicator declarations', () => {
      const ast = parse(`indicator(
    "Wrapped Indicator",
    overlay=true,
    precision=2
)
`);
      const indicator = ast.body[0] as IndicatorDeclaration;
      expect(indicator.type).toBe('IndicatorDeclaration');
      expect(indicator.title).toEqual(expect.objectContaining({
        type: 'StringLiteral',
        value: 'Wrapped Indicator',
      }));
      expect(indicator.overlay).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: true,
      }));
    });
  });

  describe('Library and import declarations', () => {
    it('parses library declarations', () => {
      const ast = parse('library("AllTimeHighLow", true, false)\n');
      const declaration = ast.body[0] as LibraryDeclaration;
      expect(declaration.type).toBe('LibraryDeclaration');
      expect(declaration.title).toEqual(expect.objectContaining({
        type: 'StringLiteral',
        value: 'AllTimeHighLow',
      }));
      expect(declaration.overlay).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: true,
      }));
      expect(declaration.dynamic_requests).toEqual(expect.objectContaining({
        type: 'BooleanLiteral',
        value: false,
      }));
    });

    it('parses import declarations with aliases', () => {
      const ast = parse('import TradingView/PivotLabels/1 as dpl\n');
      const declaration = ast.body[0] as ImportDeclaration;
      expect(declaration.type).toBe('ImportDeclaration');
      expect(declaration.path).toBe('TradingView/PivotLabels/1');
      expect(declaration.alias.name).toBe('dpl');
    });

    it('parses exported library constants', () => {
      const ast = parse('export const int length = 14\n');
      const declaration = ast.body[0] as VariableDeclaration;
      expect(declaration.type).toBe('VariableDeclaration');
      expect(declaration.exported).toBe(true);
      expect(declaration.names.type).toBe('VariableDeclarator');
      expect(declaration.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'int',
        qualifier: 'const',
      }));
    });

    it('parses exported library enums', () => {
      const ast = parse(`export enum State
    long = "Long"
    short = "Short"
    neutral
`);
      const declaration = ast.body[0] as EnumDeclaration;
      expect(declaration.type).toBe('EnumDeclaration');
      expect(declaration.exported).toBe(true);
      expect(declaration.name.name).toBe('State');
      expect(declaration.fields.map((field) => field.name.name)).toEqual(['long', 'short', 'neutral']);
      expect(declaration.fields[0]?.title).toEqual(expect.objectContaining({
        type: 'StringLiteral',
        value: 'Long',
      }));
      expect(declaration.fields[1]?.title).toEqual(expect.objectContaining({
        type: 'StringLiteral',
        value: 'Short',
      }));
      expect(declaration.fields[2]?.title).toBeNull();
    });
  });

  describe('Variable declarations', () => {
    it('parses simple assignment', () => {
      const ast = parse('x = 42\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.type).toBe('VariableDeclaration');
      expect(decl.kind).toBe('none');
      expect(decl.names.type).toBe('VariableDeclarator');
    });

    it('parses var declaration', () => {
      const ast = parse('var x = 0\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.kind).toBe('var');
    });

    it('parses varip declaration', () => {
      const ast = parse('varip x = 0\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.kind).toBe('varip');
    });

    it('parses typed declaration', () => {
      const ast = parse('float x = 0.0\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'float',
      }));
    });

    it('parses var with type', () => {
      const ast = parse('var float x = 0.0\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.kind).toBe('var');
      expect(decl.typeAnnotation?.baseType).toBe('float');
    });

    it('parses identifiers that begin with declaration keywords', () => {
      const ast = parse(`
variantColor = color.red
varipValue = 1
floatValue = 2
intValue = 3
boolValue = true
stringValue = "ok"
colorValue = color.blue
seriesValue = close
simpleValue = open
constValue = high
inputValue = low
arrayValue = [1, 2]
`);

      expect(ast.body).toHaveLength(12);
      const names = ast.body.map((statement) => {
        const declaration = statement as VariableDeclaration;
        if (declaration.names.type !== 'VariableDeclarator') {
          throw new Error('Expected single variable declaration');
        }
        return declaration.names.name.name;
      });
      expect(names).toEqual([
        'variantColor',
        'varipValue',
        'floatValue',
        'intValue',
        'boolValue',
        'stringValue',
        'colorValue',
        'seriesValue',
        'simpleValue',
        'constValue',
        'inputValue',
        'arrayValue',
      ]);
    });

    it('parses array type annotations', () => {
      const ast = parse('array<float> values = []\n');
      const decl = ast.body[0] as VariableDeclaration;

      expect(decl.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'array',
        isArray: true,
        elementType: 'float',
      }));
    });

    it('parses map type annotations', () => {
      const ast = parse('map<string, float> values = na\n');
      const decl = ast.body[0] as VariableDeclaration;

      expect(decl.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'map',
        keyType: 'string',
        valueType: 'float',
      }));
    });

    it('parses nested collection type reference syntax in annotations', () => {
      const ast = parse(`array<array<float>> rows = na
map<string, array<float>> lookup = na
matrix<map<string, float>> grid = na
`);
      const rows = ast.body[0] as VariableDeclaration;
      const lookup = ast.body[1] as VariableDeclaration;
      const grid = ast.body[2] as VariableDeclaration;

      expect(rows.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'array',
        elementType: 'array<float>',
      }));
      expect(lookup.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'map',
        keyType: 'string',
        valueType: 'array<float>',
      }));
      expect(grid.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'matrix',
        elementType: 'map<string, float>',
      }));
    });

    it('parses wrapped collection type reference syntax in annotations', () => {
      const ast = parse(`array<
    map<string, float>
> rows = na
map<
    string,
    array<float>
> lookup = na
`);
      const rows = ast.body[0] as VariableDeclaration;
      const lookup = ast.body[1] as VariableDeclaration;

      expect(rows.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'array',
        elementType: 'map<string, float>',
      }));
      expect(lookup.typeAnnotation).toEqual(expect.objectContaining({
        baseType: 'map',
        keyType: 'string',
        valueType: 'array<float>',
      }));
    });

    it('parses user-defined type annotations', () => {
      const ast = parse('pivotPoint found = na\n');
      const decl = ast.body[0] as VariableDeclaration;

      expect(decl.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'udt',
        name: 'pivotPoint',
      }));
    });

    it('parses dotted imported type annotations', () => {
      const ast = parse(`import TestUser/Signal/1 as sig
sig.State signal = sig.State.long
array<sig.State> states = na
map<string, sig.State> stateBySymbol = na
`);
      const signal = ast.body[1] as VariableDeclaration;
      const states = ast.body[2] as VariableDeclaration;
      const stateBySymbol = ast.body[3] as VariableDeclaration;

      expect(signal.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'udt',
        name: 'sig.State',
      }));
      expect(states.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'array',
        elementType: 'sig.State',
      }));
      expect(stateBySymbol.typeAnnotation).toEqual(expect.objectContaining({
        type: 'TypeAnnotation',
        baseType: 'map',
        keyType: 'string',
        valueType: 'sig.State',
      }));
    });

    it('parses tuple destructuring', () => {
      const ast = parse('[a, b, c] = someFunc()\n');
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.names.type).toBe('TupleDeclarator');
      if (decl.names.type === 'TupleDeclarator') {
        expect(decl.names.names).toHaveLength(3);
        expect(decl.names.names[0].name).toBe('a');
        expect(decl.names.names[1].name).toBe('b');
        expect(decl.names.names[2].name).toBe('c');
      }
    });

    it('parses tuple discard placeholders with declaration modes', () => {
      const ast = parse('var [_, direction, _] = ta.supertrend(2.0, 3)\n');
      const decl = ast.body[0] as VariableDeclaration;

      expect(decl.kind).toBe('var');
      expect(decl.names.type).toBe('TupleDeclarator');
      if (decl.names.type === 'TupleDeclarator') {
        expect(decl.names.names.map((name) => name.name)).toEqual(['_', 'direction', '_']);
      }
    });

    it('parses multiline tuple destructuring', () => {
      const ast = parse(`[
    a,
    b,
    c
] = someFunc()
`);
      const decl = ast.body[0] as VariableDeclaration;
      expect(decl.names.type).toBe('TupleDeclarator');
      if (decl.names.type === 'TupleDeclarator') {
        expect(decl.names.names).toHaveLength(3);
      }
    });
  });

  describe('Type declarations', () => {
    it('parses user-defined type fields and defaults', () => {
      const ast = parse(`type pivotPoint
    int x
    float y
    string xloc = xloc.bar_time
    pivotPoint nextPivot = na
`);

      expect(ast.body).toHaveLength(1);
      const decl = ast.body[0] as TypeDeclaration;
      expect(decl.type).toBe('TypeDeclaration');
      expect(decl.name.name).toBe('pivotPoint');
      expect(decl.fields).toHaveLength(4);
      expect(decl.fields[0]).toEqual(expect.objectContaining({
        type: 'TypeFieldDeclaration',
        name: expect.objectContaining({ name: 'x' }),
        typeAnnotation: expect.objectContaining({ baseType: 'int' }),
      }));
      expect(decl.fields[2]).toEqual(expect.objectContaining({
        name: expect.objectContaining({ name: 'xloc' }),
        defaultValue: expect.objectContaining({ type: 'MemberExpression' }),
      }));
      expect(decl.fields[3]).toEqual(expect.objectContaining({
        name: expect.objectContaining({ name: 'nextPivot' }),
        typeAnnotation: expect.objectContaining({ baseType: 'udt', name: 'pivotPoint' }),
      }));
    });

    it('parses exported user-defined types and varip fields', () => {
      const ast = parse(`export type tickState
    varip int updateNo = 0
    lastPrice = close
`);

      const decl = ast.body[0] as TypeDeclaration;
      expect(decl.exported).toBe(true);
      expect(decl.name.name).toBe('tickState');
      expect(decl.fields[0]).toEqual(expect.objectContaining({
        varip: true,
        typeAnnotation: expect.objectContaining({ baseType: 'int' }),
        defaultValue: expect.objectContaining({ value: 0 }),
      }));
      expect(decl.fields[1]).toEqual(expect.objectContaining({
        name: expect.objectContaining({ name: 'lastPrice' }),
        typeAnnotation: null,
        defaultValue: expect.objectContaining({ name: 'close' }),
      }));
    });

    it('parses user-defined type field defaults on continuation lines', () => {
      const ast = parse(`type WrappedDefaults
    float level =
        close + open
    varip int updates =
        0
    lastPrice =
        close
`);
      const declaration = ast.body[0] as TypeDeclaration;

      expect(declaration.type).toBe('TypeDeclaration');
      expect(declaration.fields.map((field) => ({
        name: field.name.name,
        varip: field.varip,
        defaultValue: field.defaultValue?.type,
      }))).toEqual([
        { name: 'level', varip: false, defaultValue: 'BinaryExpression' },
        { name: 'updates', varip: true, defaultValue: 'NumericLiteral' },
        { name: 'lastPrice', varip: false, defaultValue: 'Identifier' },
      ]);
    });
  });

  describe('Function declarations', () => {
    it('parses single-line user-defined functions without parameters', () => {
      const ast = parse('answer() => 42\n');
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.name.name).toBe('answer');
      expect(fn.params).toEqual([]);
      expect(fn.body).toEqual(expect.objectContaining({
        type: 'NumericLiteral',
        value: 42,
      }));
    });

    it('parses single-line user-defined functions with parameters', () => {
      const ast = parse('spread(source, length) => source - ta.sma(source, length)\n');
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.name.name).toBe('spread');
      expect(fn.params.map((param) => param.name)).toEqual(['source', 'length']);
      expect(fn.body).toEqual(expect.objectContaining({
        type: 'BinaryExpression',
        operator: '-',
      }));
    });

    it('parses user-defined function default parameters', () => {
      const ast = parse('spread(source=close, length=3) => source - ta.sma(source, length)\n');
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.params.map((param) => param.name)).toEqual(['source', 'length']);
      expect(fn.params[0].defaultValue).toEqual(expect.objectContaining({
        type: 'Identifier',
        name: 'close',
      }));
      expect(fn.params[1].defaultValue).toEqual(expect.objectContaining({
        type: 'NumericLiteral',
        value: 3,
      }));
    });

    it('parses exported functions with typed and qualified parameters', () => {
      const ast = parse('export makeTickerid(simple string prefix, string ticker) => prefix + ":" + ticker\n');
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.exported).toBe(true);
      expect(fn.params[0]).toEqual(expect.objectContaining({
        name: 'prefix',
        typeAnnotation: expect.objectContaining({
          baseType: 'string',
          qualifier: 'simple',
        }),
      }));
      expect(fn.params[1]).toEqual(expect.objectContaining({
        name: 'ticker',
        typeAnnotation: expect.objectContaining({ baseType: 'string' }),
      }));
    });

    it('parses multiline user-defined functions', () => {
      const ast = parse(`spread(source, length) =>
    basis = ta.sma(source, length)
    source - basis
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.params.map((param) => param.name)).toEqual(['source', 'length']);
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual(['VariableDeclaration', 'ExpressionStatement']);
      }
    });

    it('parses user-defined methods with typed receivers', () => {
      const ast = parse('method scale(float this, float factor = 2) => this * factor\n');
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(fn.isMethod).toBe(true);
      expect(fn.name.name).toBe('scale');
      expect(fn.params[0]).toEqual(expect.objectContaining({
        name: 'this',
        typeAnnotation: expect.objectContaining({ baseType: 'float' }),
      }));
      expect(fn.params[1]).toEqual(expect.objectContaining({
        name: 'factor',
        typeAnnotation: expect.objectContaining({ baseType: 'float' }),
        defaultValue: expect.objectContaining({ type: 'NumericLiteral' }),
      }));
    });

    it('parses loops inside multiline user-defined functions', () => {
      const ast = parse(`lastValue(limit) =>
    for i = 0 to limit
        i
    while limit > 0
        limit
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual(['ForStatement', 'WhileStatement']);
      }
    });

    it('parses multiline functions with multiple expression statements', () => {
      const ast = parse(`rangeSize(highValue, lowValue) =>
    range = highValue - lowValue
    math.abs(range)
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual(['VariableDeclaration', 'ExpressionStatement']);
      }
    });

    it('parses if/else branches inside multiline functions', () => {
      const ast = parse(`classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        const branch = fn.body[0];
        expect(branch.type).toBe('IfStatement');
        const alternate = branch.type === 'IfStatement' ? branch.alternate : null;
        expect(Array.isArray(alternate) ? null : alternate?.type).toBe('IfStatement');
      }
    });

    it('parses nested if/else branches inside multiline functions', () => {
      const ast = parse(`classify(value, enabled) =>
    if enabled
        if value > 0
            1
        else
            2
    else
        0
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        const outer = fn.body[0];
        expect(outer.type).toBe('IfStatement');
        const inner = outer.type === 'IfStatement' ? outer.consequent[0] : null;
        expect(inner?.type).toBe('IfStatement');
        const alternate = inner?.type === 'IfStatement' ? inner.alternate : null;
        expect(Array.isArray(alternate)).toBe(true);
      }
    });

    it('parses third-level nested if branches inside multiline functions', () => {
      const ast = parse(`classify(value, enabled, strict) =>
    if enabled
        if strict
            if value > 0
                1
            else
                2
        else
            0
    else
        3
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        const outer = fn.body[0];
        const middle = outer.type === 'IfStatement' ? outer.consequent[0] : null;
        const inner = middle?.type === 'IfStatement' ? middle.consequent[0] : null;
        expect(inner?.type).toBe('IfStatement');
      }
    });

    it('parses fourth-level nested if branches inside multiline functions', () => {
      const ast = parse(`classify(value, enabled, strict, confirmed) =>
    if enabled
        if strict
            if confirmed
                if value > 0
                    1
                else
                    2
            else
                3
        else
            4
    else
        5
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        const outer = fn.body[0];
        const second = outer.type === 'IfStatement' ? outer.consequent[0] : null;
        const third = second?.type === 'IfStatement' ? second.consequent[0] : null;
        const fourth = third?.type === 'IfStatement' ? third.consequent[0] : null;
        expect(fourth?.type).toBe('IfStatement');
        expect(fourth?.type === 'IfStatement' ? Array.isArray(fourth.alternate) : false).toBe(true);
      }
    });
  });

  describe('Layout gap fixtures', () => {
    it('parses nested block dedents separated by blank and comment-only lines', () => {
      const ast = parse(`indicator("Nested Layout")
score(value) =>
    result = 0
    if value > 0
        // Keep the inner block separated from the nested branch.
        if value > 10
            result := 2
        else
            result := 1

    result
plot(score(close))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'FunctionDeclaration',
        'ExpressionStatement',
      ]);
      expect(fn).toBeDefined();
      expect(Array.isArray(fn?.body)).toBe(true);
      if (fn && Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual([
          'VariableDeclaration',
          'IfStatement',
          'ExpressionStatement',
        ]);
      }
    });

    it('parses top-level nested block dedents with reassignment statements', () => {
      const ast = parse(`indicator("Top Level Nested Layout")
value = 0
if close > open
    if high > high[1]
        value := 1
    else
        value := 2
plot(value)
`);
      const outer = ast.body.find((statement) => statement.type === 'IfStatement');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'VariableDeclaration',
        'IfStatement',
        'ExpressionStatement',
      ]);
      expect(outer?.type === 'IfStatement' ? outer.consequent.map((statement) => statement.type) : []).toEqual(['IfStatement']);
      const inner = outer?.type === 'IfStatement' ? outer.consequent[0] : null;
      expect(inner?.type === 'IfStatement' ? inner.consequent.map((statement) => statement.type) : []).toEqual(['AssignmentStatement']);
      expect(inner?.type === 'IfStatement' && Array.isArray(inner.alternate)
        ? inner.alternate.map((statement) => statement.type)
        : []).toEqual(['AssignmentStatement']);
    });

    it('parses fifth-level nested user-defined function branches', () => {
      const ast = parse(`indicator("Fifth Level Nested Layout")
classify(value) =>
    if value > 0
        if value > 1
            if value > 2
                if value > 3
                    if value > 4
                        5
                    else
                        4
                else
                    3
            else
                2
        else
            1
    else
        0
plot(classify(close))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(fn).toBeDefined();
      expect(Array.isArray(fn?.body)).toBe(true);
      let current = Array.isArray(fn?.body) ? fn.body[0] : null;
      for (let depth = 0; depth < 5; depth += 1) {
        expect(current?.type).toBe('IfStatement');
        current = current?.type === 'IfStatement' ? current.consequent[0] : null;
      }
      expect(current?.type).toBe('ExpressionStatement');
    });

    it('parses sixth-level nested user-defined function branches', () => {
      const ast = parse(`indicator("Sixth Level Nested Layout")
classify(value) =>
    if value > 0
        if value > 1
            if value > 2
                if value > 3
                    if value > 4
                        if value > 5
                            6
                        else
                            5
                    else
                        4
                else
                    3
            else
                2
        else
            1
    else
        0
plot(classify(close))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(fn).toBeDefined();
      expect(Array.isArray(fn?.body)).toBe(true);
      let current = Array.isArray(fn?.body) ? fn.body[0] : null;
      for (let depth = 0; depth < 6; depth += 1) {
        expect(current?.type).toBe('IfStatement');
        current = current?.type === 'IfStatement' ? current.consequent[0] : null;
      }
      expect(current?.type).toBe('ExpressionStatement');
    });

    it('parses seventh-level nested user-defined function branches', () => {
      const ast = parse(`indicator("Seventh Level Nested Layout")
classify(value) =>
    if value > 0
        if value > 1
            if value > 2
                if value > 3
                    if value > 4
                        if value > 5
                            if value > 6
                                7
                            else
                                6
                        else
                            5
                    else
                        4
                else
                    3
            else
                2
        else
            1
    else
        0
plot(classify(close))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(fn).toBeDefined();
      expect(Array.isArray(fn?.body)).toBe(true);
      let current = Array.isArray(fn?.body) ? fn.body[0] : null;
      for (let depth = 0; depth < 7; depth += 1) {
        expect(current?.type).toBe('IfStatement');
        current = current?.type === 'IfStatement' ? current.consequent[0] : null;
      }
      expect(current?.type).toBe('ExpressionStatement');
    });

    it('parses wrapped calls and member chains inside indented bodies', () => {
      const ast = parse(`wrapped(source) =>
    value = array.get(
        array.from(
            source,
            source[1],
            math.max(
                source,
                open
            )
        ),
        0
    )
    value
`);
      const fn = ast.body[0] as FunctionDeclaration;

      expect(fn.type).toBe('FunctionDeclaration');
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        const declaration = fn.body[0];
        expect(declaration.type).toBe('VariableDeclaration');
        expect(declaration.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('CallExpression');
      }
    });

    it('parses exported library declarations with shared type and method block layout', () => {
      const ast = parse(`library("LayoutLib", true)
export type Pivot
    int x

    // Price field.
    float y

export method shifted(Pivot this, float amount) =>
    copy = Pivot.new(
        this.x,
        this.y
    )
    if amount > 0
        copy.y := copy.y + amount
    copy
`);
      const typeDeclaration = ast.body.find((statement): statement is TypeDeclaration => statement.type === 'TypeDeclaration');
      const method = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'LibraryDeclaration',
        'TypeDeclaration',
        'FunctionDeclaration',
      ]);
      expect(typeDeclaration?.exported).toBe(true);
      expect(typeDeclaration?.fields.map((field) => field.name.name)).toEqual(['x', 'y']);
      expect(method).toEqual(expect.objectContaining({
        type: 'FunctionDeclaration',
        isMethod: true,
        exported: true,
      }));
      expect(Array.isArray(method?.body)).toBe(true);
    });

    it('parses wrapped user-defined function and exported method signatures', () => {
      const ast = parse(`library("WrappedSignatures", true)
type Pivot
    float level

calc(
    float source,
    int length
) =>
    ta.sma(source, length)

export method shifted(
    Pivot this,
    float amount
) =>
    this.level += amount
    this
`);
      const declarations = ast.body.filter((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'LibraryDeclaration',
        'TypeDeclaration',
        'FunctionDeclaration',
        'FunctionDeclaration',
      ]);
      expect(declarations.map((declaration) => ({
        name: declaration.name.name,
        exported: declaration.exported,
        isMethod: declaration.isMethod === true,
        parameterNames: declaration.params.map((param) => param.name),
      }))).toEqual([
        {
          name: 'calc',
          exported: false,
          isMethod: false,
          parameterNames: ['source', 'length'],
        },
        {
          name: 'shifted',
          exported: true,
          isMethod: true,
          parameterNames: ['this', 'amount'],
        },
      ]);
    });

    it('parses wrapped assignment expressions and member-chain continuations', () => {
      const ast = parse(`indicator("Wrapped Expressions")
method smooth(float this, int length) => ta.sma(this, length)

value = close +
    open +
    high
smoothed = close
    .smooth(
        2
    )
plot(value)
plot(smoothed)
`);
      const declarations = ast.body.filter((statement): statement is VariableDeclaration => statement.type === 'VariableDeclaration');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'FunctionDeclaration',
        'VariableDeclaration',
        'VariableDeclaration',
        'ExpressionStatement',
        'ExpressionStatement',
      ]);
      expect(declarations.map((declaration) => (
        declaration.names.type === 'VariableDeclarator'
          ? { name: declaration.names.name.name, init: declaration.init.type }
          : null
      ))).toEqual([
        { name: 'value', init: 'BinaryExpression' },
        { name: 'smoothed', init: 'CallExpression' },
      ]);
    });

    it('parses declaration and assignment initializers on continuation lines', () => {
      const ast = parse(`indicator("Continuation Initializers")
value =
    close + open
float smoothed =
    ta.sma(value, 3)
[upper, lower] =
    [high, low]
value :=
    value + high
smoothed +=
    1
plot(value + smoothed + upper + lower)
`);
      const declarations = ast.body.filter((statement): statement is VariableDeclaration => statement.type === 'VariableDeclaration');
      const assignments = ast.body.filter((statement) => statement.type === 'AssignmentStatement');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'VariableDeclaration',
        'VariableDeclaration',
        'VariableDeclaration',
        'AssignmentStatement',
        'AssignmentStatement',
        'ExpressionStatement',
      ]);
      expect(declarations.map((declaration) => declaration.init.type)).toEqual([
        'BinaryExpression',
        'CallExpression',
        'ArrayExpression',
      ]);
      expect(assignments.map((assignment) => (
        assignment.type === 'AssignmentStatement'
          ? { operator: assignment.operator, right: assignment.right.type }
          : null
      ))).toEqual([
        { operator: ':=', right: 'BinaryExpression' },
        { operator: '+=', right: 'NumericLiteral' },
      ]);
    });

    it('parses continuation-line initializers inside user-defined function bodies', () => {
      const ast = parse(`indicator("Function Continuation Initializers")
score(source) =>
    value =
        source + open
    float basis =
        ta.sma(value, 3)
    value :=
        value + basis
    value
plot(score(close))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(Array.isArray(fn?.body)).toBe(true);
      if (fn && Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual([
          'VariableDeclaration',
          'VariableDeclaration',
          'AssignmentStatement',
          'ExpressionStatement',
        ]);
        expect(fn.body[0]?.type === 'VariableDeclaration' ? fn.body[0].init.type : null).toBe('BinaryExpression');
        expect(fn.body[1]?.type === 'VariableDeclaration' ? fn.body[1].init.type : null).toBe('CallExpression');
        expect(fn.body[2]?.type === 'AssignmentStatement' ? fn.body[2].right.type : null).toBe('BinaryExpression');
      }
    });

    it('parses wrapped request and ternary expressions inside nested blocks', () => {
      const ast = parse(`indicator("Wrapped Public Layout")
fast = ta.sma(close, 3)
score() =>
    basis = request.security(
        syminfo.tickerid,
        "60",
        close > open ?
            ta.sma(close, 2) :
            ta.ema(close, 2),
        lookahead=barmerge.lookahead_off
    )
    if basis > fast
        labelText = str.format(
            "basis {0}",
            basis
        )
        labelText
    else
        "flat"
plot(str.length(score()))
`);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'VariableDeclaration',
        'FunctionDeclaration',
        'ExpressionStatement',
      ]);
      expect(fn).toBeDefined();
      expect(Array.isArray(fn?.body)).toBe(true);
      if (fn && Array.isArray(fn.body)) {
        expect(fn.body.map((statement) => statement.type)).toEqual([
          'VariableDeclaration',
          'IfStatement',
        ]);
        const basis = fn.body[0];
        expect(basis.type === 'VariableDeclaration' ? basis.init.type : null).toBe('CallExpression');
        const branch = fn.body[1];
        expect(branch.type === 'IfStatement' ? branch.consequent.map((statement) => statement.type) : []).toEqual([
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
        expect(branch.type === 'IfStatement' && Array.isArray(branch.alternate)
          ? branch.alternate.map((statement) => statement.type)
          : []).toEqual(['ExpressionStatement']);
      }
    });
  });

  describe('Expressions', () => {
    describe('Literals', () => {
      it('parses integers', () => {
        const ast = parse('x = 42\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'NumericLiteral',
          value: 42,
        }));
      });

      it('parses floats', () => {
        const ast = parse('x = 3.14\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'NumericLiteral',
          value: 3.14,
        }));
      });

      it('parses scientific notation', () => {
        const ast = parse('x = 1.5e10\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'NumericLiteral',
          value: 1.5e10,
        }));
      });

      it('parses double-quoted strings', () => {
        const ast = parse('x = "hello"\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'StringLiteral',
          value: 'hello',
        }));
      });

      it('parses single-quoted strings', () => {
        const ast = parse("x = 'hello'\n");
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'StringLiteral',
          value: 'hello',
        }));
      });

      it('parses escape sequences in strings', () => {
        const ast = parse('x = "line1\\nline2"\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'StringLiteral',
          value: 'line1\nline2',
        }));
      });

      it('parses boolean true', () => {
        const ast = parse('x = true\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BooleanLiteral',
          value: true,
        }));
      });

      it('parses boolean false', () => {
        const ast = parse('x = false\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BooleanLiteral',
          value: false,
        }));
      });

      it('parses na', () => {
        const ast = parse('x = na\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'NaExpression',
        }));
      });

      it('parses hex colors', () => {
        const ast = parse('x = #FF0000\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ColorLiteral',
          value: '#FF0000',
        }));
      });
    });

    describe('Binary expressions', () => {
      it('parses addition', () => {
        const ast = parse('x = a + b\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: '+',
        }));
      });

      it('parses comparison', () => {
        const ast = parse('x = a > b\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: '>',
        }));
      });

      it('parses logical and', () => {
        const ast = parse('x = a and b\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: 'and',
        }));
      });

      it('parses logical or', () => {
        const ast = parse('x = a or b\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: 'or',
        }));
      });

      it('respects operator precedence', () => {
        const ast = parse('x = a + b * c\n');
        const decl = ast.body[0] as VariableDeclaration;
        // Should be a + (b * c)
        expect(decl.init.type).toBe('BinaryExpression');
        if (decl.init.type === 'BinaryExpression') {
          expect(decl.init.operator).toBe('+');
          expect(decl.init.right).toEqual(expect.objectContaining({
            type: 'BinaryExpression',
            operator: '*',
          }));
        }
      });

      it('does not split logical keyword prefixes inside identifiers', () => {
        const ast = parse('orderFlow = 1\nandroid = orderFlow + 1\n');
        const declarations = ast.body.filter((statement): statement is VariableDeclaration => statement.type === 'VariableDeclaration');

        expect(declarations.map((declaration) => declaration.names.type === 'VariableDeclarator' ? declaration.names.name.name : null)).toEqual([
          'orderFlow',
          'android',
        ]);
      });
    });

    describe('Unary expressions', () => {
      it('parses negation', () => {
        const ast = parse('x = -a\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'UnaryExpression',
          operator: '-',
          prefix: true,
        }));
      });

      it('parses not', () => {
        const ast = parse('x = not a\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'UnaryExpression',
          operator: 'not',
          prefix: true,
        }));
      });

      it('does not split not prefix inside identifiers', () => {
        const ast = parse('notes = 1\nvalue = notes + 1\n');
        const declarations = ast.body.filter((statement): statement is VariableDeclaration => statement.type === 'VariableDeclaration');

        expect(declarations.map((declaration) => declaration.names.type === 'VariableDeclarator' ? declaration.names.name.name : null)).toEqual([
          'notes',
          'value',
        ]);
      });
    });

    describe('Ternary expressions', () => {
      it('parses ternary', () => {
        const ast = parse('x = a > b ? 1 : 0\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ConditionalExpression',
        }));
      });

      it('parses operator line continuations', () => {
        const ast = parse(`x = close >
    open ?
    close -
        open :
    not
        false
`);
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ConditionalExpression',
        }));
      });

      it('parses leading operator line continuations', () => {
        const ast = parse(`x = close
    > open
    ? close
        + open
    : not
        false
y = close
    - open
`);
        const decl = ast.body[0] as VariableDeclaration;
        const subtraction = ast.body[1] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ConditionalExpression',
        }));
        expect(subtraction.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: '-',
        }));
      });

      it('parses leading negative numeric line continuations', () => {
        const ast = parse(`x = 10
    - 3
y = close
    - 1.5
`);
        const integerSubtraction = ast.body[0] as VariableDeclaration;
        const decimalSubtraction = ast.body[1] as VariableDeclaration;

        expect(ast.body).toHaveLength(2);
        expect(integerSubtraction.names.type === 'VariableDeclarator' ? integerSubtraction.names.name.name : null).toBe('x');
        expect(decimalSubtraction.names.type === 'VariableDeclarator' ? decimalSubtraction.names.name.name : null).toBe('y');
        expect(integerSubtraction.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: '-',
        }));
        expect(decimalSubtraction.init).toEqual(expect.objectContaining({
          type: 'BinaryExpression',
          operator: '-',
        }));
      });
    });

    describe('Call expressions', () => {
      it('parses simple function call', () => {
        const ast = parse('x = foo()\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.type).toBe('CallExpression');
        expect(call.arguments).toHaveLength(0);
      });

      it('parses function call with args', () => {
        const ast = parse('x = foo(1, 2, 3)\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.type).toBe('CallExpression');
        expect(call.arguments).toHaveLength(3);
      });

      it('parses function call with named args', () => {
        const ast = parse('x = foo(a=1, b=2)\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.arguments[0]).toEqual(expect.objectContaining({
          type: 'CallArgument',
          name: expect.objectContaining({ name: 'a' }),
        }));
      });

      it('parses multiline function calls', () => {
        const ast = parse(`x = foo(
    1,
    b=2,
    c=3
)
`);
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.type).toBe('CallExpression');
        expect(call.arguments).toHaveLength(3);
        expect(call.arguments[1]).toEqual(expect.objectContaining({
          name: expect.objectContaining({ name: 'b' }),
        }));
      });

      it('parses method call', () => {
        const ast = parse('x = ta.sma(close, 14)\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.type).toBe('CallExpression');
        expect(call.callee).toEqual(expect.objectContaining({
          type: 'MemberExpression',
        }));
      });

      it('parses generic Pine call type arguments', () => {
        const ast = parse('x = map.new<string, float>()\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;

        expect(call.type).toBe('CallExpression');
        expect(call.callee).toEqual(expect.objectContaining({
          type: 'MemberExpression',
        }));
        expect(call.typeArguments).toEqual(['string', 'float']);
        expect(call.arguments).toHaveLength(0);
      });

      it('parses single generic Pine call type arguments', () => {
        const ast = parse('x = array.new<float>()\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;

        expect(call.type).toBe('CallExpression');
        expect(call.typeArguments).toEqual(['float']);
        expect(call.arguments).toHaveLength(0);
      });

      it('parses nested generic Pine call type arguments', () => {
        const ast = parse(`rows = array.new<array<float>>()
lookup = map.new<string, array<float>>()
`);
        const rows = ast.body[0] as VariableDeclaration;
        const lookup = ast.body[1] as VariableDeclaration;
        const rowsCall = rows.init as CallExpression;
        const lookupCall = lookup.init as CallExpression;

        expect(rowsCall.typeArguments).toEqual(['array<float>']);
        expect(lookupCall.typeArguments).toEqual(['string', 'array<float>']);
      });

      it('parses wrapped generic Pine call type arguments', () => {
        const ast = parse(`rows = array.new<
    map<string, float>
>()
lookup = map.new<
    string,
    array<float>
>()
`);
        const rows = ast.body[0] as VariableDeclaration;
        const lookup = ast.body[1] as VariableDeclaration;
        const rowsCall = rows.init as CallExpression;
        const lookupCall = lookup.init as CallExpression;

        expect(rowsCall.typeArguments).toEqual(['map<string, float>']);
        expect(lookupCall.typeArguments).toEqual(['string', 'array<float>']);
      });
    });

    describe('Member access', () => {
      it('parses member access', () => {
        const ast = parse('x = color.red\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'MemberExpression',
        }));
      });

      it('parses chained member access', () => {
        const ast = parse('x = a.b.c\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('MemberExpression');
      });
    });

    describe('Index access', () => {
      it('parses history access', () => {
        const ast = parse('x = close[1]\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'IndexExpression',
        }));
      });

      it('parses computed index', () => {
        const ast = parse('x = arr[i + 1]\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('IndexExpression');
      });

      it('parses multiline index access', () => {
        const ast = parse(`x = arr[
    i + 1
]
`);
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('IndexExpression');
      });
    });

    describe('Array literals', () => {
      it('parses empty array', () => {
        const ast = parse('x = []\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ArrayExpression',
          elements: [],
        }));
      });

      it('parses array with elements', () => {
        const ast = parse('x = [1, 2, 3]\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('ArrayExpression');
        if (decl.init.type === 'ArrayExpression') {
          expect(decl.init.elements).toHaveLength(3);
        }
      });

      it('parses multiline array literals', () => {
        const ast = parse(`x = [
    1,
    2,
    3
]
`);
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('ArrayExpression');
        if (decl.init.type === 'ArrayExpression') {
          expect(decl.init.elements).toHaveLength(3);
        }
      });
    });

    describe('Parenthesized expressions', () => {
      it('parses multiline parenthesized expressions', () => {
        const ast = parse(`x = (
    close - open
)
`);
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init.type).toBe('BinaryExpression');
      });
    });
  });

  describe('Assignment statements', () => {
    it('parses := assignment', () => {
      const ast = parse('x = 1\nx := 2\n');
      expect(ast.body[1].type).toBe('AssignmentStatement');
    });

    it('parses += assignment', () => {
      const ast = parse('x = 1\nx += 2\n');
      expect(ast.body[1]).toEqual(expect.objectContaining({
        type: 'AssignmentStatement',
        operator: '+=',
      }));
    });

    it('parses member assignment', () => {
      const ast = parse('obj.prop := 1\n');
      expect(ast.body[0]).toEqual(expect.objectContaining({
        type: 'AssignmentStatement',
        left: expect.objectContaining({ type: 'MemberExpression' }),
      }));
    });

    it('parses index assignment', () => {
      const ast = parse('arr[0] := 1\n');
      expect(ast.body[0]).toEqual(expect.objectContaining({
        type: 'AssignmentStatement',
        left: expect.objectContaining({ type: 'IndexExpression' }),
      }));
    });
  });

  describe('Control flow', () => {
    it('parses if statement with indented block', () => {
      const code = `if x > 0
    y = 1
`;
      const ast = parse(code);
      expect(ast.body[0].type).toBe('IfStatement');
    });

    it('parses for loop', () => {
      const code = `for i = 0 to 10
    sum := sum + i
`;
      const ast = parse(code);
      const forStmt = ast.body[0];
      expect(forStmt.type).toBe('ForStatement');
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.kind).toBe('numeric');
      }
    });

    it('parses for loop with step', () => {
      const code = `for i = 0 to 10 by 2
    sum := sum + i
`;
      const ast = parse(code);
      const forStmt = ast.body[0];
      expect(forStmt.type).toBe('ForStatement');
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.kind).toBe('numeric');
        if (forStmt.kind === 'numeric') {
          expect(forStmt.step).not.toBeNull();
        }
      }
    });

    it('parses numeric for loop expressions', () => {
      const ast = parse(`value = for i = 0 to 3
    i
`);
      const declaration = ast.body[0] as VariableDeclaration;

      expect(declaration.type).toBe('VariableDeclaration');
      expect(declaration.init).toEqual(expect.objectContaining({
        type: 'ForStatement',
        kind: 'numeric',
      }));
    });

    it('parses collection for loop', () => {
      const code = `for value in array.from(1, 2, 3)
    sum := sum + value
`;
      const ast = parse(code);
      const forStmt = ast.body[0];

      expect(forStmt.type).toBe('ForStatement');
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.kind).toBe('collection');
        if (forStmt.kind === 'collection') {
          expect(forStmt.iterable.type).toBe('CallExpression');
        }
      }
    });

    it('parses collection for loop expressions', () => {
      const ast = parse(`value = for [index, item] in array.from(10, 20)
    index + item
`);
      const declaration = ast.body[0] as VariableDeclaration;

      expect(declaration.type).toBe('VariableDeclaration');
      expect(declaration.init).toEqual(expect.objectContaining({
        type: 'ForStatement',
        kind: 'collection',
      }));
    });

    it('parses while loop', () => {
      const code = `while x > 0
    x := x - 1
`;
      const ast = parse(code);
      expect(ast.body[0].type).toBe('WhileStatement');
    });

    it('parses while loop expressions', () => {
      const ast = parse(`value = while x > 0
    x := x - 1
    x
`);
      const declaration = ast.body[0] as VariableDeclaration;

      expect(declaration.type).toBe('VariableDeclaration');
      expect(declaration.init).toEqual(expect.objectContaining({
        type: 'WhileStatement',
      }));
    });

    it('parses break', () => {
      const code = `for i = 0 to 10
    break
`;
      const ast = parse(code);
      const forStmt = ast.body[0];
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.body[0].type).toBe('BreakStatement');
      }
    });

    it('parses continue', () => {
      const code = `for i = 0 to 10
    continue
`;
      const ast = parse(code);
      const forStmt = ast.body[0];
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.body[0].type).toBe('ContinueStatement');
      }
    });
  });

  describe('Comments', () => {
    it('ignores single-line comments', () => {
      const ast = parse('// this is a comment\nx = 1\n');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('VariableDeclaration');
    });

    it('ignores multi-line comments', () => {
      const ast = parse('/* comment */x = 1\n');
      expect(ast.body).toHaveLength(1);
    });

    it('ignores inline comments', () => {
      const ast = parse('x = 1 // comment\n');
      expect(ast.body).toHaveLength(1);
    });
  });

  describe('Complete scripts', () => {
    it('parses basic SMA indicator', () => {
      const code = `//@version=6
indicator("Simple SMA")
plot(ta.sma(close, 14))
`;
      const ast = parse(code);
      expect(ast.version).toBe(6);
      expect(ast.body).toHaveLength(2);
    });

    it('parses EMA with input', () => {
      const code = `//@version=6
indicator("EMA with Input", overlay=true)
length = input.int(20, "Length")
plot(ta.ema(close, length), color=color.blue)
`;
      const ast = parse(code);
      expect(ast.body).toHaveLength(3);
    });

    it('parses RSI with levels', () => {
      const code = `//@version=6
indicator("RSI")
length = input.int(14, "Length")
rsi = ta.rsi(close, length)
plot(rsi, "RSI", color=color.purple)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)
`;
      const ast = parse(code);
      expect(ast.body).toHaveLength(6);
    });
  });

  describe('Error handling', () => {
    it('throws TealscriptParseError on syntax error', () => {
      expect(() => parse('x = \n')).toThrow(TealscriptParseError);
    });

    it('rejects source that exceeds the configured parser source-size limit', () => {
      expect(() => parse('x = 1\n', { maxSourceLength: 5 })).toThrow(TealscriptParseLimitError);
      expect(() => parse('x = 1\n', { maxSourceLength: 5 })).toThrow('Script source is too large: maximum length is 5');
    });

    it('rejects ASTs that exceed the configured parser depth limit', () => {
      expect(() => parse('x = 1\n', { maxAstDepth: 2 })).toThrow(TealscriptParseLimitError);
      expect(() => parse('x = 1\n', { maxAstDepth: 2 })).toThrow('Script AST is too deep: maximum depth is 2');
    });

    it('provides location in error', () => {
      try {
        parse('x = \n');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        if (error instanceof TealscriptParseError) {
          expect(error.location.start.line).toBe(1);
        }
      }
    });
  });

  describe('validate function', () => {
    it('returns null for valid code', () => {
      expect(validate('x = 1\n')).toBeNull();
    });

    it('returns error message for invalid code', () => {
      const result = validate('x = \n');
      expect(result).not.toBeNull();
      expect(result).toContain('Line 1');
    });
  });

  describe('formatParseError', () => {
    it('formats error with context', () => {
      const source = 'x = \n';
      try {
        parse(source);
      } catch (error) {
        if (error instanceof TealscriptParseError) {
          const formatted = formatParseError(error, source);
          expect(formatted).toContain('Parse error at line 1');
          expect(formatted).toContain('x = ');
        }
      }
    });
  });
});
