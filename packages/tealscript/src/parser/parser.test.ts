import { describe, it, expect } from 'vitest';
import { parse, validate, TealscriptParseError, formatParseError } from './parser';
import { checkAstStructureInvariants } from './astStructureInvariants';
import { isExpression } from './ast';
import type { Expression, FunctionDeclaration, Statement } from './ast';

describe('Tealscript Parser', () => {
  describe('parse', () => {
    describe('version directive', () => {
      it('returns typed AST nodes for non-program start rules', () => {
        const expression: Expression = parse('close + 1', { startRule: 'Expression' });
        const statement: Statement = parse('plot(close)', { startRule: 'Statement' });

        expect(expression.type).toBe('BinaryExpression');
        expect(statement.type).toBe('ExpressionStatement');
      });

      it('recognizes loop expression nodes in expression guards', () => {
        const forExpression = parse(`for i = 0 to 1
    i
`, { startRule: 'Expression' });
        const whileExpression = parse(`while false
    1
`, { startRule: 'Expression' });

        expect(forExpression.type).toBe('ForStatement');
        expect(whileExpression.type).toBe('WhileStatement');
        expect(isExpression(forExpression)).toBe(true);
        expect(isExpression(whileExpression)).toBe(true);
      });

      it('parses version 6 directive', () => {
        const ast = parse(`//@version=6
indicator("Test")`);

        expect(ast.type).toBe('Program');
        expect(ast.version).toBe(6);
      });

      it('parses version 5 directive', () => {
        const ast = parse(`//@version=5
indicator("Test")`);

        expect(ast.version).toBe(5);
      });

      it('normalizes doubled CRLF line endings before parsing', () => {
        const ast = parse('//@version=6\r\r\nindicator("CRLF")\r\r\nx = 1\r\r\nplot(x)');

        expect(ast.body.some(statement => statement.type === 'IndicatorDeclaration')).toBe(true);
      });
    });

    describe('indicator declaration', () => {
      it('parses indicator with title', () => {
        const ast = parse(`//@version=6
indicator("My Indicator")`);

        expect(ast.body.length).toBeGreaterThan(0);
        const indicator = ast.body[0];
        expect(indicator.type).toBe('IndicatorDeclaration');
        if (indicator.type === 'IndicatorDeclaration') {
          expect(indicator.declarationKind).toBe('indicator');
        }
      });

      it('parses indicator with named parameters', () => {
        const ast = parse(`//@version=6
indicator("My Indicator", overlay=true, precision=2)`);

        const indicator = ast.body[0] as { type: string; overlay?: unknown; precision?: unknown };
        expect(indicator.type).toBe('IndicatorDeclaration');
      });

      it('parses indicator named-prefix positional tails', () => {
        const ast = parse(`//@version=6
indicator(title="Mixed Indicator", "Mixed", true, format.price, 3)`);

        const indicator = ast.body[0];
        expect(indicator.type).toBe('IndicatorDeclaration');
        if (indicator.type === 'IndicatorDeclaration') {
          expect(indicator.title?.type).toBe('StringLiteral');
          expect(indicator.shorttitle?.type).toBe('StringLiteral');
          expect(indicator.overlay?.type).toBe('BooleanLiteral');
          expect(indicator.format?.type).toBe('MemberExpression');
          expect(indicator.precision?.type).toBe('NumericLiteral');
        }
      });

      it('parses legacy study declarations on the indicator path', () => {
        const ast = parse(`//@version=4
study("Legacy Indicator", shorttitle="LI", overlay=true, resolution="60", resolution_gaps=false)`);

        const indicator = ast.body[0];
        expect(indicator.type).toBe('IndicatorDeclaration');
        if (indicator.type === 'IndicatorDeclaration') {
          expect(indicator.declarationKind).toBe('indicator');
          expect(indicator.title?.type).toBe('StringLiteral');
          expect(indicator.shorttitle?.type).toBe('StringLiteral');
          expect(indicator.overlay?.type).toBe('BooleanLiteral');
          expect(indicator.timeframe?.type).toBe('StringLiteral');
          expect(indicator.timeframe_gaps?.type).toBe('BooleanLiteral');
          expect('resolution' in indicator).toBe(false);
          expect('resolution_gaps' in indicator).toBe(false);
        }
      });

      it('parses max_bars_back metadata', () => {
        const ast = parse(`//@version=6
indicator("My Indicator", max_bars_back=500)`);

        const indicator = ast.body[0];
        expect(indicator.type).toBe('IndicatorDeclaration');
        if (indicator.type === 'IndicatorDeclaration') {
          expect(indicator.max_bars_back?.type).toBe('NumericLiteral');
        }
      });

      it('parses drawing object count metadata', () => {
        const ast = parse(`//@version=6
indicator("Objects", max_labels_count=3, max_lines_count=4, max_boxes_count=5, max_polylines_count=6)`);

        const indicator = ast.body[0];
        expect(indicator.type).toBe('IndicatorDeclaration');
        if (indicator.type === 'IndicatorDeclaration') {
          expect(indicator.max_labels_count?.type).toBe('NumericLiteral');
          expect(indicator.max_lines_count?.type).toBe('NumericLiteral');
          expect(indicator.max_boxes_count?.type).toBe('NumericLiteral');
          expect(indicator.max_polylines_count?.type).toBe('NumericLiteral');
        }
      });

      it('parses strategy declarations for unsupported diagnostics', () => {
        const ast = parse(`//@version=6
strategy("My Strategy", overlay=true)`);

        const declaration = ast.body[0];
        expect(declaration.type).toBe('IndicatorDeclaration');
        if (declaration.type === 'IndicatorDeclaration') {
          expect(declaration.declarationKind).toBe('strategy');
        }
      });

      it('parses calc_on_every_history_tick as a strategy declaration option', () => {
        const ast = parse(`//@version=6
strategy("Historical ticks", calc_on_every_history_tick=true)`);

        const declaration = ast.body[0];
        expect(declaration.type).toBe('IndicatorDeclaration');
        if (declaration.type === 'IndicatorDeclaration') {
          expect(declaration.calc_on_every_history_tick?.type).toBe('BooleanLiteral');
        }
      });

      it('parses strategy named-prefix positional tails', () => {
        const ast = parse(`//@version=6
strategy(title="Mixed Strategy", "Mixed", true, format.price, 3, scale.right, 100, "60", true, false, true, 10, 20, 30, 40, 50, true, 25000, "EUR", strategy.fixed, 2, 3, strategy.commission.percent, 0.1, 1, 50, 60, true, false, true, true)`);

        const declaration = ast.body[0];
        expect(declaration.type).toBe('IndicatorDeclaration');
        if (declaration.type === 'IndicatorDeclaration') {
          expect(declaration.declarationKind).toBe('strategy');
          expect(declaration.shorttitle?.type).toBe('StringLiteral');
          expect(declaration.overlay?.type).toBe('BooleanLiteral');
          expect(declaration.initial_capital?.type).toBe('NumericLiteral');
          expect(declaration.currency?.type).toBe('StringLiteral');
          expect(declaration.default_qty_type?.type).toBe('MemberExpression');
          expect(declaration.process_orders_on_close?.type).toBe('BooleanLiteral');
          expect(declaration.use_bar_magnifier?.type).toBe('BooleanLiteral');
        }
      });

      it('parses reserved call parameter names in named arguments', () => {
        const ast = parse(`//@version=6
strategy("Keyword Args")
strategy.risk.max_drawdown(value=25, type=strategy.percent_of_equity, alert_message="drawdown")`);

        const statement = ast.body[1];
        expect(statement.type).toBe('ExpressionStatement');
        if (statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression') {
          expect(statement.expression.arguments.map((argument) => argument.name?.name)).toEqual([
            'value',
            'type',
            'alert_message',
          ]);
        }
      });
    });

    describe('module declarations', () => {
      it('parses import path metadata', () => {
        const ast = parse(`//@version=6
indicator("Imports")
import TestUser/RangeTools/12 as rt`);

        const declaration = ast.body[1];
        expect(declaration.type).toBe('ImportDeclaration');
        if (declaration.type === 'ImportDeclaration') {
          expect(declaration.path).toBe('TestUser/RangeTools/12');
          expect(declaration.owner).toBe('TestUser');
          expect(declaration.library).toBe('RangeTools');
          expect(declaration.version).toBe(12);
          expect(declaration.alias.name).toBe('rt');
        }
      });

      it('parses import without alias — uses library name as implicit alias', () => {
        const ast = parse(`//@version=6
indicator("Imports")
import djdrob/TrendChecker/1`);

        const declaration = ast.body[1];
        expect(declaration.type).toBe('ImportDeclaration');
        if (declaration.type === 'ImportDeclaration') {
          expect(declaration.library).toBe('TrendChecker');
          expect(declaration.alias.name).toBe('TrendChecker');
        }
      });

      it('parses import without alias — TradingView/ta/8 uses ta as alias', () => {
        const ast = parse(`//@version=6
indicator("Imports")
import TradingView/ta/8`);

        const declaration = ast.body[1];
        expect(declaration.type).toBe('ImportDeclaration');
        if (declaration.type === 'ImportDeclaration') {
          expect(declaration.alias.name).toBe('ta');
        }
      });
    });

    describe('variable declarations', () => {
      it('parses simple variable declaration', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 42`);

        const varDecl = ast.body.find(s => s.type === 'VariableDeclaration');
        expect(varDecl).toBeDefined();
      });

      it('parses var keyword', () => {
        const ast = parse(`//@version=6
indicator("Test")
var x = 0`);

        const varDecl = ast.body.find(s => s.type === 'VariableDeclaration') as {
          type: string;
          kind: string;
        };
        expect(varDecl.kind).toBe('var');
      });

      it('parses varip keyword', () => {
        const ast = parse(`//@version=6
indicator("Test")
varip x = 0`);

        const varDecl = ast.body.find(s => s.type === 'VariableDeclaration') as {
          type: string;
          kind: string;
        };
        expect(varDecl.kind).toBe('varip');
      });

      it('parses tuple discard placeholders with declaration modes', () => {
        const ast = parse(`//@version=6
indicator("Discard Tuple")
var [_, direction, _] = [1, 2, 3]`);

        const declaration = ast.body[1];
        expect(declaration.type).toBe('VariableDeclaration');
        if (declaration.type === 'VariableDeclaration') {
          expect(declaration.kind).toBe('var');
          expect(declaration.names.type).toBe('TupleDeclarator');
          if (declaration.names.type === 'TupleDeclarator') {
            expect(declaration.names.names.map((name) => name.name)).toEqual(['_', 'direction', '_']);
          }
        }
      });
    });

    describe('declaration blocks', () => {
      it('parses blank and comment-only lines inside type and enum blocks', () => {
        const ast = parse(`//@version=6
indicator("Block Spacing")
type Pivot
    // X coordinate.
    int x

    // Y coordinate.
    float y

enum Direction
    // Up trend.
    up = "Up"

    // Down trend.
    down = "Down"
`);

        const typeDeclaration = ast.body.find((statement) => statement.type === 'TypeDeclaration');
        const enumDeclaration = ast.body.find((statement) => statement.type === 'EnumDeclaration');

        expect(typeDeclaration?.type === 'TypeDeclaration' ? typeDeclaration.fields.map((field) => field.name.name) : []).toEqual(['x', 'y']);
        expect(enumDeclaration?.type === 'EnumDeclaration' ? enumDeclaration.fields.map((field) => field.name.name) : []).toEqual(['up', 'down']);
      });

      it('does not treat two-space call continuations after enums as enum fields', () => {
        const ast = parse(`//@version=6
indicator("Enum Continuation")
enum TablePosition
    left = "left"
    center = "center"
    right = "right"

table_position = input.enum(defval = TablePosition.left, title = "Table position",
  options = [TablePosition.left, TablePosition.center, TablePosition.right])
plot(close)
`);

        const enumDeclaration = ast.body.find((statement) => statement.type === 'EnumDeclaration');
        const tablePosition = ast.body.find(
          (statement) => statement.type === 'VariableDeclaration'
            && statement.names.type === 'VariableDeclarator'
            && statement.names.name.name === 'table_position',
        );

        expect(enumDeclaration?.type === 'EnumDeclaration' ? enumDeclaration.fields.map((field) => field.name.name) : []).toEqual(['left', 'center', 'right']);
        expect(tablePosition?.type).toBe('VariableDeclaration');
      });

      it('does not promote four-space enum fields when a later UDF uses two-space indentation', () => {
        const ast = parse(`//@version=6
indicator(
  title = 'Enum Titles',
  overlay = false)

enum State
    On = 'ON'
    Off = 'OFF'

fmtPct(value) =>
  na(value) ? 'n/a' : str.tostring(value, '#.##') + '%'

plot(State.On == State.Off ? 0 : 1)
`);

        const enumDeclaration = ast.body.find((statement) => statement.type === 'EnumDeclaration');
        expect(enumDeclaration?.type === 'EnumDeclaration' ? enumDeclaration.fields.map((field) => field.name.name) : []).toEqual(['On', 'Off']);
        expect(enumDeclaration?.type === 'EnumDeclaration' ? enumDeclaration.fields.map((field) => field.title?.value) : []).toEqual(['ON', 'OFF']);
      });

      it('does not promote type fields after leading-comma declaration continuations', () => {
        const ast = parse(`//@version=5
indicator("Order Blocks", overlay = true
  , max_lines_count = 500
  , max_labels_count = 500
  , max_boxes_count = 500)

type ob
    float top = na
    float btm = na
    int loc = bar_index
plot(close)
`);

        const typeDeclaration = ast.body.find((statement) => statement.type === 'TypeDeclaration');
        expect(typeDeclaration?.type === 'TypeDeclaration' ? typeDeclaration.fields.map((field) => field.name.name) : []).toEqual(['top', 'btm', 'loc']);
      });
    });

    describe('literals', () => {
      it('parses numeric literals', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 42
y = 3.14`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses string literals', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = "hello"`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses wrapped double-quoted string literals', () => {
        const ast = parse(`//@version=5
indicator("wrapped string")
txt = "first line
     second line"
plot(close)`);

        const decl = ast.body.find(s => s.type === 'VariableDeclaration');
        expect(decl?.type).toBe('VariableDeclaration');
        if (decl?.type === 'VariableDeclaration') {
          expect(decl.init.type).toBe('StringLiteral');
          if (decl.init.type === 'StringLiteral') {
            expect(decl.init.value).toBe('first line\n     second line');
          }
        }
      });

      it('parses wrapped single-quoted string literals', () => {
        const ast = parse(`//@version=6
indicator("wrapped string")
txt = 'first line
     second line'
plot(close)`);

        const decl = ast.body.find(s => s.type === 'VariableDeclaration');
        expect(decl?.type).toBe('VariableDeclaration');
        if (decl?.type === 'VariableDeclaration') {
          expect(decl.init.type).toBe('StringLiteral');
          if (decl.init.type === 'StringLiteral') {
            expect(decl.init.value).toBe('first line\n     second line');
          }
        }
      });

      it('parses boolean literals', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = true
y = false`);

        expect(ast.body.length).toBeGreaterThan(2);
      });

      it('parses color literals', () => {
        const ast = parse(`//@version=6
indicator("Test")
c = #FF0000`);

        expect(ast.body.length).toBeGreaterThan(1);
      });
    });

    describe('binary expressions', () => {
      it('parses arithmetic expressions', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 1 + 2 * 3`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses comparison expressions', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = a > b`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses logical expressions', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = a and b
y = c or d`);

        expect(ast.body.length).toBeGreaterThan(2);
      });
    });

    describe('function calls', () => {
      it('parses simple function call', () => {
        const ast = parse(`//@version=6
indicator("Test")
plot(close)`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses namespaced function call', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = ta.sma(close, 14)`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses function call with named arguments', () => {
        const ast = parse(`//@version=6
indicator("Test")
plot(close, color=color.red, linewidth=2)`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses na as a callable built-in when followed by arguments', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = na(close[1])`);

        const declaration = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'x');
        expect(declaration?.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('CallExpression');
      });

      it('parses trailing comma in positional argument list', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = ta.sma(close, 5,)`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses trailing comma in named argument list', () => {
        const ast = parse(`//@version=6
indicator("Test")
plot(close, color=color.blue,)`);

        expect(ast.body.length).toBeGreaterThan(1);
      });
    });

    describe('history access', () => {
      it('parses history access with bracket notation', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = close[1]`);

        expect(ast.body.length).toBeGreaterThan(1);
      });
    });

    describe('conditional expressions', () => {
      it('parses ternary expression', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = condition ? a : b`);

        expect(ast.body.length).toBeGreaterThan(1);
      });

      it('parses keyed switch expressions', () => {
        const ast = parse(`//@version=6
indicator("Test")
mode = "EMA"
ma = switch mode
    "EMA" => ta.ema(close, 14)
    "SMA" => ta.sma(close, 14)
    => close`);

        const declaration = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'ma');
        expect(declaration).toBeDefined();
        expect(declaration?.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('SwitchExpression');
      });

      it('parses condition-only switch expressions', () => {
        const ast = parse(`//@version=6
indicator("Test")
direction = switch
    close > open => 1
    close < open => -1
    => 0`);

        const declaration = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'direction');
        expect(declaration).toBeDefined();
        expect(declaration?.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('SwitchExpression');
      });

      it('parses switch arm arrows on continuation lines', () => {
        const ast = parse(`//@version=5
indicator("Test")
f(x) =>
    switch
        x > 0
            => 1
        => 0`);

        const declaration = ast.body.find((s) => s.type === 'FunctionDeclaration' && s.name.name === 'f');
        expect(declaration?.type).toBe('FunctionDeclaration');
        if (declaration?.type === 'FunctionDeclaration' && Array.isArray(declaration.body)) {
          const statement = declaration.body[0];
          expect(statement?.type).toBe('ExpressionStatement');
          if (statement?.type === 'ExpressionStatement') {
            expect(statement.expression.type).toBe('SwitchExpression');
            if (statement.expression.type === 'SwitchExpression') {
              expect(statement.expression.cases).toHaveLength(2);
              expect(statement.expression.cases[0]?.test?.type).toBe('BinaryExpression');
              const consequent = statement.expression.cases[0]?.consequent;
              expect(Array.isArray(consequent) ? consequent[0]?.type : consequent?.type).toBe('NumericLiteral');
              expect(statement.expression.cases[1]?.test).toBeNull();
            }
          }
        }
      });

      it('parses switch expression block arms', () => {
        const ast = parse(`//@version=6
indicator("Test")
mode = "EMA"
ma = switch mode
    "EMA" =>
        value = ta.ema(close, 14)
        value
    =>
        close`);

        const declaration = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'ma');
        expect(declaration?.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('SwitchExpression');
        if (declaration?.type === 'VariableDeclaration' && declaration.init.type === 'SwitchExpression') {
          expect(Array.isArray(declaration.init.cases[0].consequent)).toBe(true);
          expect(Array.isArray(declaration.init.cases[1].consequent)).toBe(true);
        }
      });

      it('parses if expression variable initializers', () => {
        const ast = parse(`//@version=6
indicator("Test")
value = if close > open
    close
else
    open
float typedValue = if close > open
    close
else
    open`);

        const value = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'value');
        const typedValue = ast.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'typedValue');

        expect(value?.type === 'VariableDeclaration' ? value.init.type : null).toBe('IfStatement');
        expect(typedValue?.type === 'VariableDeclaration' ? typedValue.init.type : null).toBe('IfStatement');
      });

      it('parses if expression variable initializers inside functions', () => {
        const ast = parse(`//@version=6
indicator("Test")
choose(bool enabled) =>
    value = if enabled
        close
    else
        open
    value
plot(choose(close > open))`);

        const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
        const declaration = fn?.type === 'FunctionDeclaration' && Array.isArray(fn.body)
          ? fn.body.find((s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'value')
          : undefined;

        expect(declaration?.type === 'VariableDeclaration' ? declaration.init.type : null).toBe('IfStatement');
      });
    });

    describe('if statements', () => {
      it('parses simple if statement', () => {
        const ast = parse(`//@version=6
indicator("Test")
if condition
    x = 1`);

        const ifStmt = ast.body.find(s => s.type === 'IfStatement');
        expect(ifStmt).toBeDefined();
      });

      it('parses if-else statement', () => {
        const ast = parse(`//@version=6
indicator("Test")
if condition
    x = 1
else
    x = 2`);

        const ifStmt = ast.body.find(s => s.type === 'IfStatement');
        expect(ifStmt).toBeDefined();
      });
    });

    describe('for loops', () => {
      it('parses for loop', () => {
        const ast = parse(`//@version=6
indicator("Test")
for i = 0 to 10
    x = i`);

        const forStmt = ast.body.find(s => s.type === 'ForStatement');
        expect(forStmt).toBeDefined();
      });

      it('parses for loop with step', () => {
        const ast = parse(`//@version=6
indicator("Test")
for i = 0 to 10 by 2
    x = i`);

        const forStmt = ast.body.find(s => s.type === 'ForStatement') as {
          type: string;
          step?: unknown;
        };
        expect(forStmt).toBeDefined();
        expect(forStmt.step).toBeDefined();
      });

      it('parses collection loops with index and value counters', () => {
        const ast = parse(`//@version=6
indicator("Test")
values = array.from(1, 2, 3)
for [index, value] in values
    plot(index + value)`);

        const loop = ast.body.find(s => s.type === 'ForStatement');
        expect(loop?.type).toBe('ForStatement');
        if (loop?.type === 'ForStatement' && loop.kind === 'collection') {
          expect(loop.indexCounter?.name).toBe('index');
          expect(loop.counter.name).toBe('value');
        }
      });

      it('parses unbracketed collection loops with index and value counters', () => {
        const ast = parse(`//@version=5
indicator("Test")
values = array.from(1, 2, 3)
for index, value in values
    plot(index + value)`);

        const loop = ast.body.find(s => s.type === 'ForStatement');
        expect(loop?.type).toBe('ForStatement');
        if (loop?.type === 'ForStatement' && loop.kind === 'collection') {
          expect(loop.indexCounter?.name).toBe('index');
          expect(loop.counter.name).toBe('value');
        }
      });
    });

    describe('while loops', () => {
      it('parses while loop', () => {
        const ast = parse(`//@version=6
indicator("Test")
while condition
    x = x + 1`);

        const whileStmt = ast.body.find(s => s.type === 'WhileStatement');
        expect(whileStmt).toBeDefined();
      });
    });

    describe('assignment statements', () => {
      it('parses reassignment', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 0
x := 1`);

        const assignment = ast.body.find(s => s.type === 'AssignmentStatement');
        expect(assignment).toBeDefined();
      });

      it('parses compound assignment', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 0
x += 1`);

        const assignment = ast.body.find(s => s.type === 'AssignmentStatement') as {
          type: string;
          operator: string;
        };
        expect(assignment).toBeDefined();
        expect(assignment.operator).toBe('+=');
      });

      it('parses every Pine compound assignment operator', () => {
        const ast = parse(`//@version=6
indicator("Compound assignment operators")
x = 10
x += 1
x -= 2
x *= 3
x /= 4
x %= 5`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement') as Array<{ operator: string }>;
        expect(assignments.map((assignment) => assignment.operator)).toEqual(['+=', '-=', '*=', '/=', '%=']);
      });

      it('parses deeply nested compound assignment statements', () => {
        const ast = parse(`//@version=6
indicator("Deep compound assignment")
f() =>
    score = 0.0
    if true
        if true
            if true
                if true
                    if true
                        if true
                            if true
                                if true
                                    if true
                                        if true
                                            score += 1.0
    score
plot(f())`);

        const fn = ast.body.find(s => s.type === 'FunctionDeclaration') as FunctionDeclaration;
        expect(Array.isArray(fn.body)).toBe(true);
        const nestedIf = Array.isArray(fn.body) ? fn.body.find(s => s.type === 'IfStatement') : undefined;
        expect(nestedIf).toBeDefined();
      });

      it('binds parenthesized nested else-if conditions to the inner if', () => {
        const ast = parse(`//@version=5
indicator("Nested conditions")
if (outer)
    if (inner)
        value := 1
    else if (alternate)
        value := 2
plot(value)`);

        const outer = ast.body.find(s => s.type === 'IfStatement') as {
          type: string;
          consequent: Array<{ type: string; alternate: unknown }>;
          alternate: { type: string } | null;
        };
        expect(outer).toBeDefined();
        expect(outer.consequent[0]?.type).toBe('IfStatement');
        expect(outer.alternate).toBeNull();
        expect(outer.consequent[0]?.alternate).toMatchObject({ type: 'IfStatement' });
      });

      it('binds mixed bare-if parenthesized else-if conditions to the inner if', () => {
        const ast = parse(`//@version=5
indicator("Nested mixed conditions")
if outer
    if inner
        value := 1
    else if (alternate)
        value := 2
plot(value)`);

        const outer = ast.body.find(s => s.type === 'IfStatement') as {
          type: string;
          consequent: Array<{ type: string; alternate: unknown }>;
          alternate: { type: string } | null;
        };
        expect(outer).toBeDefined();
        expect(outer.consequent[0]?.type).toBe('IfStatement');
        expect(outer.alternate).toBeNull();
        expect(outer.consequent[0]?.alternate).toMatchObject({ type: 'IfStatement' });
      });

      it('parses index assignment targets', () => {
        const ast = parse(`//@version=6
indicator("Test")
values = array.from(1, 2)
values[0] := 3`);

        const assignment = ast.body.find(s => s.type === 'AssignmentStatement') as {
          type: string;
          left: { type: string };
        };
        expect(assignment).toBeDefined();
        expect(assignment.left.type).toBe('IndexExpression');
      });

      it('parses comma-separated reassignments into individual AssignmentStatement nodes', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 0
y = 0
x := 1, y := 2`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement');
        expect(assignments.length).toBe(2);
        const [a, b] = assignments as Array<{ type: string; left: { type: string; name: string }; right: { value: number } }>;
        expect(a.left.name).toBe('x');
        expect(b.left.name).toBe('y');
      });

      it('parses three comma-separated reassignments', () => {
        const ast = parse(`//@version=6
indicator("Test")
max = float(na), min = float(na), pivoth = bool(na)
max := float(na), min := float(na), pivoth := bool(na)`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement');
        expect(assignments.length).toBe(3);
      });

      it('parses comma-separated compound assignments', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 1
y = 1
x += 1, y -= 1`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement') as Array<{ operator: string }>;
        expect(assignments.length).toBe(2);
        expect(assignments[0].operator).toBe('+=');
        expect(assignments[1].operator).toBe('-=');
      });

      it('does not treat commas inside RHS function calls as assignment separators', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 0
x := math.max(1, 2)`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement');
        expect(assignments.length).toBe(1);
      });

      it('single reassignment still works without comma', () => {
        const ast = parse(`//@version=6
indicator("Test")
x = 0
x := 42`);

        const assignments = ast.body.filter(s => s.type === 'AssignmentStatement');
        expect(assignments.length).toBe(1);
      });

      it('parses root := with block if as RHS', () => {
        const ast = parse(`//@version=6
indicator("Test")
finalPrice = 0.0
finalPrice := if close > open
    high
else
    low
plot(finalPrice)`);

        const assignment = ast.body.find((s) => s.type === 'AssignmentStatement') as {
          type: string;
          operator: string;
          right: { type: string };
        } | undefined;
        expect(assignment).toBeDefined();
        expect(assignment?.operator).toBe(':=');
        expect(assignment?.right.type).toBe('IfStatement');
      });

      it('parses root tuple := with block if as RHS', () => {
        const ast = parse(`//@version=6
indicator("Test")
hi = 0.0
lo = 0.0
[hi, lo] := if close > open
    [high, low]
else
    [close, open]
plot(hi - lo)`);

        const assignment = ast.body.find((s) => s.type === 'TupleAssignment') as {
          type: string;
          names: Array<{ name: string }>;
          right: { type: string };
        } | undefined;
        expect(assignment).toBeDefined();
        expect(assignment?.names.map((name) => name.name)).toEqual(['hi', 'lo']);
        expect(assignment?.right.type).toBe('IfStatement');
      });

      it('parses line-broken tuple declarations inside a function body', () => {
        const ast = parse(`//@version=6
indicator("Test")
calc() =>
    [hmaxt, lmint, hmax, lmin]
     = detect(open, close, high, low)
    hmax - lmin
plot(calc())`);

        const fn = ast.body.find((s) => s.type === 'FunctionDeclaration') as FunctionDeclaration | undefined;
        expect(fn).toBeDefined();
        expect(Array.isArray(fn?.body)).toBe(true);
        if (Array.isArray(fn?.body)) {
          expect(fn.body[0]?.type).toBe('VariableDeclaration');
          expect(fn.body.at(-1)?.type).toBe('ExpressionStatement');
        }
      });

      it('parses := with block if as RHS in a UDF body', () => {
        const ast = parse(`//@version=6
indicator("Test")
getPrice(useHigh) =>
    finalPrice = 0.0
    finalPrice := if useHigh
        high
    else
        low
    finalPrice
plot(getPrice(true))`);

        const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
        expect(fn).toBeDefined();
        if (fn?.type === 'FunctionDeclaration') {
          const body = Array.isArray(fn.body) ? fn.body : [fn.body];
          const assign = body.find((s) => s.type === 'AssignmentStatement') as {
            type: string;
            operator: string;
            right: { type: string };
          } | undefined;
          expect(assign).toBeDefined();
          expect(assign?.operator).toBe(':=');
          expect(assign?.right.type).toBe('IfStatement');
        }
      });

      it('parses := with block if/else-if/else as RHS in a UDF body', () => {
        const ast = parse(`//@version=6
indicator("Test")
getPrice(usePercentage, useAtr) =>
    finalPrice = 0.0
    finalPrice := if usePercentage
        close * 1.01
    else if useAtr
        close + 1.0
    else
        close
    finalPrice
plot(getPrice(false, false))`);

        const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
        expect(fn).toBeDefined();
        if (fn?.type === 'FunctionDeclaration') {
          const body = Array.isArray(fn.body) ? fn.body : [fn.body];
          const assign = body.find((s) => s.type === 'AssignmentStatement') as {
            type: string;
            right: { type: string; alternate: unknown };
          } | undefined;
          expect(assign?.right.type).toBe('IfStatement');
          expect(assign?.right.alternate).toBeDefined();
        }
      });

      it('parses := with block if at a deeply nested level inside a UDF body', () => {
        const ast = parse(`//@version=6
indicator("Test")
f(a, b, c, d) =>
    if a
        if b
            if c
                x = 0.0
                x := if d
                    high
                else
                    low
                x
plot(f(true, true, true, false))`);

        expect(ast.type).toBe('Program');
        const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
        expect(fn).toBeDefined();
      });
    });
  });

  describe('validate', () => {
    it('returns null for valid script', () => {
      const result = validate(`//@version=6
indicator("Test")
plot(close)`);

      expect(result).toBeNull();
    });

    it('returns error message for invalid script', () => {
      const result = validate(`//@version=6
indicator("Test"
plot(close)`);

      expect(result).not.toBeNull();
      expect(result).toContain('Line');
    });
  });

  describe('tab normalization', () => {
    it('parses if/else block with tab-indented if body and space-indented else body', () => {
      // Tab in if branch, 4 spaces in else branch — should parse without error
      const ast = parse('indicator("T")\nif close > open\n\tx = 1\nelse\n    x = 0\nplot(x)');
      expect(ast.type).toBe('Program');
      expect(ast.body.length).toBeGreaterThan(0);
    });

    it('parses if block with all-tab indentation', () => {
      const ast = parse('indicator("T")\nif close > open\n\tx = 1\nplot(x)');
      expect(ast.type).toBe('Program');
    });

    it('parses for loop with tab-indented body', () => {
      const ast = parse('indicator("T")\nfor i = 0 to 3\n\tx = i\nplot(x)');
      expect(ast.type).toBe('Program');
    });

    it('parses while loop with tab-indented body', () => {
      const ast = parse('indicator("T")\nwhile false\n\tx = 1\nplot(x)');
      expect(ast.type).toBe('Program');
    });

    it('parses UDF body with tab indentation', () => {
      const ast = parse('indicator("T")\nf(v) =>\n\tv * 2\nplot(f(close))');
      expect(ast.type).toBe('Program');
    });

    it('normalizes multiple leading tabs to correct indent depth', () => {
      // Double-tab = 8 spaces = 2 indent levels (nested block)
      const ast = parse('indicator("T")\nf(v) =>\n\tif v > 0\n\t\tv\n\telse\n\t\t0\nplot(f(close))');
      expect(ast.type).toBe('Program');
    });

    it('does not alter tabs inside string literals', () => {
      const ast = parse('indicator("T")\ns = "hello\tworld"\nplot(close)');
      expect(ast.type).toBe('Program');
      // The string node should still contain the tab character
      const strDecl = ast.body.find((n) => n.type === 'VariableDeclaration');
      expect(strDecl).toBeDefined();
    });
  });

  describe('single-line arrow function body', () => {
    it('parses var declaration as single-line arrow body', () => {
      const ast = parse(`//@version=6
indicator("Test")
_print(_text) => var _label = label.new(bar_index, close, _text)`);

      const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (fn?.type === 'FunctionDeclaration') {
        expect(Array.isArray(fn.body)).toBe(true);
        if (Array.isArray(fn.body)) {
          expect(fn.body[0]?.type).toBe('VariableDeclaration');
          if (fn.body[0]?.type === 'VariableDeclaration') {
            expect(fn.body[0].kind).toBe('var');
          }
        }
      }
    });

    it('parses expression as single-line arrow body (regression)', () => {
      const ast = parse(`//@version=6
indicator("Test")
f(x) => x * 2`);

      const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (fn?.type === 'FunctionDeclaration' && !Array.isArray(fn.body)) {
        expect(fn.body.type).toBe('BinaryExpression');
      }
    });
  });

  describe('reserved-word expression statements', () => {
    it('parses switch as last expression in multiline UDF body', () => {
      const ast = parse(`//@version=6
indicator("Test")
ma(source, length, _type) =>
    switch _type
        'SMA' => ta.sma(source, length)
        'EMA' => ta.ema(source, length)
plot(ma(close, 14, 'SMA'))`);

      const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (fn?.type === 'FunctionDeclaration') {
        const body = Array.isArray(fn.body) ? fn.body : [fn.body];
        const last = body[body.length - 1];
        expect(last?.type).toBe('ExpressionStatement');
        if (last?.type === 'ExpressionStatement') {
          expect(last.expression.type).toBe('SwitchExpression');
        }
      }
    });

    it('parses not na(ph) as the last expression in a UDF body', () => {
      const ast = parse(`//@version=6
indicator("Test")
isSwingHigh(src, len) =>
    ph = ta.pivothigh(src, len, len)
    not na(ph)
plot(isSwingHigh(close, 5) ? 1 : 0)`);

      const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (fn?.type === 'FunctionDeclaration') {
        const body = Array.isArray(fn.body) ? fn.body : [fn.body];
        const last = body[body.length - 1];
        expect(last?.type).toBe('ExpressionStatement');
        if (last?.type === 'ExpressionStatement') {
          expect(last.expression.type).toBe('UnaryExpression');
          if (last.expression.type === 'UnaryExpression') {
            expect(last.expression.operator).toBe('not');
          }
        }
      }
    });

    it('parses na as standalone expression in else block', () => {
      const ast = parse(`//@version=6
indicator("Test")
x = if close > open
    close
else
    na`);

      const decl = ast.body.find(
        (s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'x',
      );
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration' && decl.init.type === 'IfStatement') {
        const alt = decl.init.alternate;
        expect(Array.isArray(alt)).toBe(true);
        if (Array.isArray(alt)) {
          expect(alt[0]?.type).toBe('ExpressionStatement');
          if (alt[0]?.type === 'ExpressionStatement') {
            expect(alt[0].expression.type).toBe('NaExpression');
          }
        }
      }
    });

    it('parses true as standalone expression in if block', () => {
      const ast = parse(`//@version=6
indicator("Test")
x = if close > open
    true
else
    false`);

      const decl = ast.body.find(
        (s) => s.type === 'VariableDeclaration' && s.names.type === 'VariableDeclarator' && s.names.name.name === 'x',
      );
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration' && decl.init.type === 'IfStatement') {
        const consequent = decl.init.consequent;
        expect(Array.isArray(consequent)).toBe(true);
        if (Array.isArray(consequent)) {
          expect(consequent[0]?.type).toBe('ExpressionStatement');
          if (consequent[0]?.type === 'ExpressionStatement') {
            expect(consequent[0].expression.type).toBe('BooleanLiteral');
            if (consequent[0].expression.type === 'BooleanLiteral') {
              expect(consequent[0].expression.value).toBe(true);
            }
          }
        }
        const alt = decl.init.alternate;
        expect(Array.isArray(alt)).toBe(true);
        if (Array.isArray(alt)) {
          expect(alt[0]?.type).toBe('ExpressionStatement');
          if (alt[0]?.type === 'ExpressionStatement') {
            expect(alt[0].expression.type).toBe('BooleanLiteral');
            if (alt[0].expression.type === 'BooleanLiteral') {
              expect(alt[0].expression.value).toBe(false);
            }
          }
        }
      }
    });

    it('parses switch inside if block body', () => {
      const ast = parse(`//@version=6
indicator("Test")
mode = "EMA"
if close > open
    switch mode
        'EMA' => ta.ema(close, 14)
        => close`);

      const ifStmt = ast.body.find((s) => s.type === 'IfStatement');
      expect(ifStmt).toBeDefined();
      if (ifStmt?.type === 'IfStatement') {
        const body = Array.isArray(ifStmt.consequent) ? ifStmt.consequent : [ifStmt.consequent];
        const stmt = body[0];
        expect(stmt?.type).toBe('ExpressionStatement');
        if (stmt?.type === 'ExpressionStatement') {
          expect(stmt.expression.type).toBe('SwitchExpression');
        }
      }
    });

    it('parses switch inside for loop body', () => {
      const ast = parse(`//@version=6
indicator("Test")
mode = "EMA"
for i = 0 to 3
    switch mode
        'EMA' => ta.ema(close, 14)
        => close`);

      const forStmt = ast.body.find((s) => s.type === 'ForStatement');
      expect(forStmt).toBeDefined();
      if (forStmt?.type === 'ForStatement') {
        const body = Array.isArray(forStmt.body) ? forStmt.body : [forStmt.body];
        const stmt = body[0];
        expect(stmt?.type).toBe('ExpressionStatement');
        if (stmt?.type === 'ExpressionStatement') {
          expect(stmt.expression.type).toBe('SwitchExpression');
        }
      }
    });

    it('parses loop control as one-line switch arm consequents', () => {
      const ast = parse(`//@version=5
indicator("Loop switch control")
for i = 0 to 3
    switch i
        0 => continue
        => break`);

      const forStmt = ast.body.find((s) => s.type === 'ForStatement');
      expect(forStmt?.type).toBe('ForStatement');
      if (forStmt?.type === 'ForStatement') {
        const stmt = forStmt.body[0];
        expect(stmt?.type).toBe('ExpressionStatement');
        if (stmt?.type === 'ExpressionStatement') {
          expect(stmt.expression.type).toBe('SwitchExpression');
          if (stmt.expression.type === 'SwitchExpression') {
            expect(stmt.expression.cases.map((switchCase) => {
              const consequent = Array.isArray(switchCase.consequent)
                ? switchCase.consequent[0]
                : switchCase.consequent;
              return consequent?.type;
            })).toEqual(['ContinueStatement', 'BreakStatement']);
          }
        }
      }
    });

    it('allows method as a UDF parameter name', () => {
      const ast = parse(`//@version=6
indicator("Test")
calcMA(src, len, method) =>
    method == "SMA" ? ta.sma(src, len) : ta.ema(src, len)
plot(calcMA(close, 14, "SMA"))`);

      const fn = ast.body.find((s) => s.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (fn?.type === 'FunctionDeclaration') {
        expect(fn.params.map((p) => p.name)).toContain('method');
      }
    });

    it('allows method as a local variable name', () => {
      const ast = parse(`//@version=6
indicator("Test")
method = "SMA"
plot(close)`);

      const decl = ast.body.find((s) => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration') {
        expect(decl.names.type).toBe('VariableDeclarator');
        if (decl.names.type === 'VariableDeclarator') {
          expect(decl.names.name.name).toBe('method');
        }
      }
    });

    it('still rejects switch/na/true/false as variable names', () => {
      // These are allowed as expression statements but must not be valid identifiers.
      expect(() => parse(`//@version=6\nindicator("T")\nswitch = 1`)).toThrow(TealscriptParseError);
      expect(() => parse(`//@version=6\nindicator("T")\nna = 1`)).toThrow(TealscriptParseError);
      expect(() => parse(`//@version=6\nindicator("T")\ntrue = 1`)).toThrow(TealscriptParseError);
      expect(() => parse(`//@version=6\nindicator("T")\nfalse = 1`)).toThrow(TealscriptParseError);
      expect(() => parse(`//@version=6\nindicator("T")\nvar na = 1`)).toThrow(TealscriptParseError);
    });
  });

  describe('postfix bracket continuation', () => {
    it('keeps a one-element tuple return separate from the preceding assignment', () => {
      const ast = parse(`//@version=6
indicator("Test")
one() =>
    value := close
    [value]`);

      const functionDeclaration = ast.body.find(s => s.type === 'FunctionDeclaration');
      expect(functionDeclaration?.type).toBe('FunctionDeclaration');
      if (functionDeclaration?.type === 'FunctionDeclaration' && Array.isArray(functionDeclaration.body)) {
        expect(functionDeclaration.body.at(-1)?.type).toBe('ExpressionStatement');
      }
    });

    it('parses two consecutive single-element tuple declarations as separate statements', () => {
      const ast = parse(`//@version=6
indicator("Test")
[x] = someFunc1()
[y] = someFunc2()`);

      const declarations = ast.body.filter(s => s.type === 'VariableDeclaration');
      expect(declarations).toHaveLength(2);
      const first = declarations[0];
      const second = declarations[1];
      if (first.type === 'VariableDeclaration' && second.type === 'VariableDeclaration') {
        expect(first.names.type).toBe('TupleDeclarator');
        expect(second.names.type).toBe('TupleDeclarator');
        if (first.names.type === 'TupleDeclarator') {
          expect(first.names.names.map(n => n.name)).toEqual(['x']);
        }
        if (second.names.type === 'TupleDeclarator') {
          expect(second.names.names.map(n => n.name)).toEqual(['y']);
        }
      }
    });

    it('parses two consecutive multi-element tuple declarations as separate statements', () => {
      const ast = parse(`//@version=6
indicator("Test")
[a, b] = someFunc1()
[c, d] = someFunc2()`);

      const declarations = ast.body.filter(s => s.type === 'VariableDeclaration');
      expect(declarations).toHaveLength(2);
    });

    it('parses consecutive request.security tuple declarations', () => {
      const ast = parse(`//@version=6
indicator("Test")
[OCTF_Close] = request.security(syminfo.tickerid, "60", close)
[OCTF_Open] = request.security(syminfo.tickerid, "60", open)`);

      const declarations = ast.body.filter(s => s.type === 'VariableDeclaration');
      expect(declarations).toHaveLength(2);
      if (declarations[0].type === 'VariableDeclaration') {
        expect(declarations[0].names.type).toBe('TupleDeclarator');
        if (declarations[0].names.type === 'TupleDeclarator') {
          expect(declarations[0].names.names.map(n => n.name)).toEqual(['OCTF_Close']);
        }
      }
    });

    it('parses same-line index access without regression', () => {
      const ast = parse(`//@version=6
indicator("Test")
x = arr[0]`);

      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration') {
        expect(decl.init.type).toBe('IndexExpression');
      }
    });

    it('parses same-line history access without regression', () => {
      const ast = parse(`//@version=6
indicator("Test")
x = close[1]`);

      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration') {
        expect(decl.init.type).toBe('IndexExpression');
      }
    });

    it('parses cross-line dot member access without regression', () => {
      const ast = parse(`//@version=6
indicator("Test")
x = syminfo
    .tickerid`);

      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
      if (decl?.type === 'VariableDeclaration') {
        expect(decl.init.type).toBe('MemberExpression');
      }
    });
  });

  describe('NBSP normalization', () => {
    it('parses a script that contains non-breaking spaces (U+00A0) as regular spaces', () => {
      // Simulates Pine copied from TradingView where spaces are U+00A0.
      const NBSP = '\u00a0';
      const source = `//@version=6\nindicator(${NBSP}"Test"${NBSP})\nx${NBSP}=${NBSP}1`;
      const ast = parse(source);
      expect(ast.type).toBe('Program');
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
    });

    it('does not let quotes in comments stop later NBSP normalization', () => {
      const NBSP = '\u00a0';
      const source = `//@version=6\n// chart's data\nindicator(${NBSP}"Test"${NBSP})\nx${NBSP}=${NBSP}1`;
      const ast = parse(source);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
    });

    it('preserves NBSP inside string literals without converting it to a regular space', () => {
      // The NBSP between hello and world is inside a string and must not be normalized.
      const NBSP = '\u00a0';
      const source = `//@version=6\nindicator("Test")\nx = "hello${NBSP}world"`;
      const ast = parse(source);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
      if (decl?.type === 'VariableDeclaration') {
        expect(decl.init.type).toBe('StringLiteral');
        if (decl.init.type === 'StringLiteral') {
          expect(decl.init.value).toBe(`hello${NBSP}world`);
        }
      }
    });
  });

  describe('comma-separated expression statements', () => {
    it('parses two comma-separated function calls as two ExpressionStatements', () => {
      const ast = parse(`//@version=6
indicator("Test")
f(x), g(y)`);

      const exprs = ast.body.filter(s => s.type === 'ExpressionStatement');
      expect(exprs).toHaveLength(2);
    });

    it('parses comma-separated reassignments as two AssignmentStatements', () => {
      const ast = parse(`//@version=6
indicator("Test")
a := 1, b := 2`);

      const assignments = ast.body.filter(s => s.type === 'AssignmentStatement');
      expect(assignments).toHaveLength(2);
    });

    it('parses comma-separated expressions inside an indented block', () => {
      const ast = parse(`//@version=6
indicator("Test")
if true
    f(x), g(y)`);

      const ifStmt = ast.body.find(s => s.type === 'IfStatement');
      expect(ifStmt?.type).toBe('IfStatement');
      if (ifStmt?.type === 'IfStatement') {
        expect(ifStmt.consequent).toHaveLength(2);
        expect(ifStmt.consequent[0].type).toBe('ExpressionStatement');
        expect(ifStmt.consequent[1].type).toBe('ExpressionStatement');
      }
    });
  });

  describe('indent normalization (2-space and 3-space)', () => {
    it('parses a UDF with 2-space indentation', () => {
      const ast = parse(`//@version=6
indicator("Test")
myFunc(x) =>
  x + 1
plot(myFunc(close))`);

      const fn = ast.body.find(s => s.type === 'FunctionDeclaration');
      expect(fn?.type).toBe('FunctionDeclaration');
    });

    it('parses a UDF with 3-space indentation', () => {
      const ast = parse(`//@version=6
indicator("Test")
myFunc(x) =>
   x + 1
plot(myFunc(close))`);

      const fn = ast.body.find(s => s.type === 'FunctionDeclaration');
      expect(fn?.type).toBe('FunctionDeclaration');
    });

    it('parses a UDF with nested 2-space indentation (consistent throughout)', () => {
      // All indented lines use 2-space steps — normalization promotes them to 4-space.
      const ast = parse(`//@version=6
indicator("Test")
myFunc(x) =>
  if x > 0
    if x > 10
      x + 2
    else
      x + 1
  else
    x - 1
plot(myFunc(close))`);

      const fn = ast.body.find(s => s.type === 'FunctionDeclaration');
      expect(fn?.type).toBe('FunctionDeclaration');
      if (fn?.type === 'FunctionDeclaration' && Array.isArray(fn.body)) {
        expect(fn.body[0].type).toBe('IfStatement');
      }
    });

    it('does not alter scripts already using 4-space indentation', () => {
      const src = `//@version=6
indicator("Test")
myFunc(x) =>
    x + 1
plot(myFunc(close))`;
      const ast = parse(src);
      const fn = ast.body.find(s => s.type === 'FunctionDeclaration');
      expect(fn?.type).toBe('FunctionDeclaration');
    });
  });

  describe('InitializerSpace continuation with minimal indent', () => {
    it('parses multiline string concatenation with 1-space indent continuation', () => {
      const ast = parse(`//@version=6
indicator("Test")
txt_scr =
 'Formula:\\n\\n'+
 'Line 1.\\n'+
 'Line 2.'
plot(close)`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
    });

    it('parses multiline string concatenation with 2-space indent continuation', () => {
      const ast = parse(`//@version=6
indicator("Test")
txt =
  'Part A' +
  'Part B'
plot(close)`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
    });

    it('parses multiline string continuation with 4-space indent (standard)', () => {
      const ast = parse(`//@version=6
indicator("Test")
txt =
    'Part A' +
    'Part B'
plot(close)`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
    });

    it('parses operator continuations inside a wrapped function call', () => {
      const ast = parse(`//@version=6
indicator("Test")
log.info(str.format('first'
         + ' second'
         + ' third'))`);
      expect(ast.body.at(-1)?.type).toBe('ExpressionStatement');
    });
  });

  describe('regex escape sequences in string literals', () => {
    it('parses "\\\\d+" and the string value contains \\d+', () => {
      const ast = parse(`//@version=6
indicator("Test")
v = "\\d+"`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
      if (decl?.type === 'VariableDeclaration' && decl.init.type === 'StringLiteral') {
        expect(decl.init.value).toBe('\\d+');
      }
    });

    it('parses "\\\\w+\\\\s*" correctly', () => {
      const ast = parse(`//@version=6
indicator("Test")
v = "\\w+\\s*"`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
      if (decl?.type === 'VariableDeclaration' && decl.init.type === 'StringLiteral') {
        expect(decl.init.value).toBe('\\w+\\s*');
      }
    });

    it('parses str.match(s, "\\\\d+") in a full script', () => {
      const ast = parse(`//@version=6
indicator("Test")
s = str.tostring(close)
v = str.match(s, "\\d+")`);
      expect(ast.type).toBe('Program');
      const decls = ast.body.filter(s => s.type === 'VariableDeclaration');
      expect(decls).toHaveLength(2);
    });

    it('still processes known escape sequences correctly', () => {
      const ast = parse(`//@version=6
indicator("Test")
v = "\\n\\t\\\\\\\""`);
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl?.type).toBe('VariableDeclaration');
      if (decl?.type === 'VariableDeclaration' && decl.init.type === 'StringLiteral') {
        expect(decl.init.value).toBe('\n\t\\"');
      }
    });
  });

  describe('error handling', () => {
    it('throws TealscriptParseError for syntax errors', () => {
      expect(() => {
        parse(`//@version=6
indicator("Test"
missing paren`);
      }).toThrow(TealscriptParseError);
    });

    it('includes location in parse error', () => {
      try {
        parse(`//@version=6
indicator("Test"
missing paren`);
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.location).toBeDefined();
        expect(parseError.location.start.line).toBeGreaterThan(0);
      }
    });

    it('formats error nicely', () => {
      const source = `//@version=6
indicator("Test"
missing paren`;

      try {
        parse(source);
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const formatted = formatParseError(error as TealscriptParseError, source);
        expect(formatted).toContain('Parse error');
        expect(formatted).toContain('line');
      }
    });

    it('reports JS-style inline callback syntax at the function keyword', () => {
      const source = `//@version=5
indicator("Callback")
array.sort(indices, function(a, b) sortComparator(a, b))`;

      try {
        parse(source);
        expect.fail('Expected parser to reject JS-style callback syntax');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('JavaScript-style inline callback');
        expect(parseError.message).toContain('Pine function with => syntax');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(21);
        expect(parseError.found).toBe('function');
      }
    });

    it('reports JS-style logical operators with Pine word-operator guidance', () => {
      const cases = [
        { operator: '||', replacement: 'or' },
        { operator: '&&', replacement: 'and' },
      ] as const;

      for (const { operator, replacement } of cases) {
        const source = `//@version=6
indicator("Logical")
x = close > open ${operator} high > low`;

        try {
          parse(source);
          expect.fail(`Expected parser to reject ${operator}`);
        } catch (error) {
          expect(error).toBeInstanceOf(TealscriptParseError);
          const parseError = error as TealscriptParseError;
          expect(parseError.message).toContain(`\`${replacement}\``);
          expect(parseError.message).toContain(`\`${operator}\` is not valid Pine syntax`);
          expect(parseError.location.start.line).toBe(3);
          expect(parseError.location.start.column).toBe(18);
          expect(parseError.found).toBe(operator);
        }
      }
    });

    it('reports semicolons as invalid Pine statement separators', () => {
      const source = `//@version=6
indicator("Semicolon");
plot(close)`;

      try {
        parse(source);
        expect.fail('Expected parser to reject semicolon separators');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('semicolons are not valid statement separators');
        expect(parseError.location.start.line).toBe(2);
        expect(parseError.location.start.column).toBe(23);
        expect(parseError.found).toBe(';');
      }
    });

    it('reports JavaScript-style braces as invalid Pine block syntax', () => {
      const source = `//@version=6
indicator("Braces")
if close > open {
    plot(close)
}`;

      try {
        parse(source);
        expect.fail('Expected parser to reject JavaScript-style braces');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('uses indentation to delimit blocks');
        expect(parseError.message).toContain('braces are not valid Pine syntax');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(17);
        expect(parseError.found).toBe('{');
      }
    });

    it('reports return statements as invalid Pine syntax', () => {
      const source = `//@version=5
indicator("Return")
f() =>
    return close
plot(f())`;

      try {
        parse(source);
        expect.fail('Expected parser to reject return statements');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('has no `return` statement');
        expect(parseError.message).toContain('last expression');
        expect(parseError.location.start.line).toBe(4);
        expect(parseError.location.start.column).toBe(5);
        expect(parseError.found).toBe('return');
      }
    });

    it('reports then keywords as invalid Pine if syntax', () => {
      const source = `//@version=5
indicator("Then")
if close > open then
    x = 1`;

      try {
        parse(source);
        expect.fail('Expected parser to reject if/then syntax');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('do not use `then`');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(17);
        expect(parseError.found).toBe('then');
      }
    });

    it('reports JavaScript let declarations as invalid Pine syntax', () => {
      const source = `//@version=6
indicator("Let")
let x = close`;

      try {
        parse(source);
        expect.fail('Expected parser to reject JavaScript let declarations');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('does not use JavaScript `let` declarations');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(1);
        expect(parseError.found).toBe('let');
      }
    });

    it('reports JavaScript function declarations with Pine function syntax guidance', () => {
      const source = `//@version=6
indicator("Function")
function f(x) {
    return x
}`;

      try {
        parse(source);
        expect.fail('Expected parser to reject JavaScript function declarations');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('functions are declared as `name(args) =>`');
        expect(parseError.message).toContain('JavaScript-style `function name(...)`');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(1);
        expect(parseError.found).toBe('function');
      }
    });

    it('reports JavaScript strict equality operators with Pine comparison guidance', () => {
      const cases = [
        { operator: '===', replacement: '==' },
        { operator: '!==', replacement: '!=' },
      ] as const;

      for (const { operator, replacement } of cases) {
        const source = `//@version=6
indicator("Strict")
x = close ${operator} open`;

        try {
          parse(source);
          expect.fail(`Expected parser to reject ${operator}`);
        } catch (error) {
          expect(error).toBeInstanceOf(TealscriptParseError);
          const parseError = error as TealscriptParseError;
          expect(parseError.message).toContain(`uses \`${replacement}\` for comparison`);
          expect(parseError.message).toContain(`\`${operator}\` is not valid Pine syntax`);
          expect(parseError.location.start.line).toBe(3);
          expect(parseError.location.start.column).toBe(11);
          expect(parseError.found).toBe(operator);
        }
      }
    });

    it('reports JavaScript bang negation with Pine not-operator guidance', () => {
      const source = `//@version=6
indicator("Bang")
x = !barstate.islast`;

      try {
        parse(source);
        expect.fail('Expected parser to reject JavaScript bang negation');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('uses the word operator `not`');
        expect(parseError.message).toContain('JavaScript-style `!`');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(5);
        expect(parseError.found).toBe('!');
      }
    });

    it('reports missing commas before wrapped named arguments', () => {
      const source = `//@version=6
indicator("Wrapped")
plot(
    close
    color=color.red
)`;

      try {
        parse(source);
        expect.fail('Expected parser to reject missing wrapped argument comma');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('Missing comma before wrapped argument `color=`');
        expect(parseError.message).toContain('wrapped argument lists still need commas');
        expect(parseError.location.start.line).toBe(5);
        expect(parseError.location.start.column).toBe(5);
        expect(parseError.found).toBe('c');
      }
    });

    it('does not report foreign syntax inside comments or strings', () => {
      const ast = parse(`//@version=6
indicator("Commented words")
// return close && then
text = "let x = close; (x) => x"
plot(close)`);

      expect(ast.body.at(-1)?.type).toBe('ExpressionStatement');
    });

    it('names rejected full-width spaces distinctly from tolerated NBSP', () => {
      const FULL_WIDTH_SPACE = '\u3000';
      const source = `//@version=6
indicator("Full width")
if${FULL_WIDTH_SPACE}true
    x = 1`;

      try {
        parse(source);
        expect.fail('Expected parser to reject full-width layout space');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('full-width space');
        expect(parseError.message).toContain('U+3000 IDEOGRAPHIC SPACE');
        expect(parseError.message).toContain('Non-breaking spaces (U+00A0) are tolerated');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(3);
        expect(parseError.found).toBe(FULL_WIDTH_SPACE);
      }
    });

    it('names other rejected invisible spacing characters', () => {
      const ZERO_WIDTH_SPACE = '\u200b';
      const source = `//@version=6
indicator("Invisible")
if${ZERO_WIDTH_SPACE} true
    x = 1`;

      try {
        parse(source);
        expect.fail('Expected parser to reject zero-width space');
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        const parseError = error as TealscriptParseError;
        expect(parseError.message).toContain('zero-width space');
        expect(parseError.message).toContain('U+200B ZERO WIDTH SPACE');
        expect(parseError.message).toContain('Non-breaking spaces (U+00A0) are tolerated');
        expect(parseError.location.start.line).toBe(3);
        expect(parseError.location.start.column).toBe(3);
        expect(parseError.found).toBe(ZERO_WIDTH_SPACE);
      }
    });
  });

  describe('operator statement boundaries', () => {
    it('keeps function loop-expression bodies inside their enclosing method', () => {
      const ast = parse(`//@version=5
indicator("method loop expressions")
type Point
    float x
method make(Point point, int count) =>
    Point made = for i = 0 to count
        Point.new(point.x + i)
    made
method collect(Point point, array<int> values) =>
    Point made = for value in values
        Point.new(point.x + value)
    made
method next(Point point) => point`);

      const methods = ast.body.filter((statement) => statement.type === 'FunctionDeclaration');
      expect(methods).toHaveLength(3);
      expect(methods.every((method) => method.type === 'FunctionDeclaration')).toBe(true);
    });

    it('does not parse comparison chains as generic type arguments', () => {
      const ast = parse(`//@version=6
indicator("comparison arguments")
value = check(a < 30 and b < a, c > 70)`);

      expect(ast.body[1]?.type).toBe('VariableDeclaration');
    });

    it('allows blank lines before a wrapped assignment expression', () => {
      const ast = parse(`//@version=6
indicator("wrapped assignment")
value =
${' '.repeat(4)}
${' '.repeat(8)}math.round(
            math.min(10, 3))`);

      expect(ast.body[1]?.type).toBe('VariableDeclaration');
    });

    it('parses a negative conditional branch before an else clause', () => {
      const ast = parse(`//@version=6
indicator("negative branch")
value = if close > close[1]
    close
else if close < close[1]
    -close
else
    close[1]`);

      expect(ast.body).toHaveLength(2);
      expect(ast.body[1]?.type).toBe('VariableDeclaration');
    });

    it('parses signed switch-arm literals', () => {
      const ast = parse(`//@version=6
indicator("signed switch")
signalColor = switch signal
    +8 => color.green
    -8 => color.red
    => na`);

      expect(ast.body).toHaveLength(2);
      expect(ast.body[1]?.type).toBe('VariableDeclaration');
    });

    it('keeps irregular switch arm bodies inside their cases', () => {
      const ast = parse(`//@version=5
indicator("Switch 3-Case 7-Body Indent", overlay=false)
val = 1
result = switch val
   1 =>
       50.0
   2 =>
       60.0
   =>
       0.0
plot(result, "Result")`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'VariableDeclaration',
        'VariableDeclaration',
        'ExpressionStatement',
      ]);
      const result = ast.body[2];
      expect(result.type).toBe('VariableDeclaration');
      if (result.type === 'VariableDeclaration') {
        expect(result.init.type).toBe('SwitchExpression');
        if (result.init.type === 'SwitchExpression') {
          expect(result.init.cases).toHaveLength(3);
          expect(result.init.cases.map((switchCase) => (
            Array.isArray(switchCase.consequent) ? switchCase.consequent[0]?.type : switchCase.consequent.type
          ))).toEqual(['ExpressionStatement', 'ExpressionStatement', 'ExpressionStatement']);
        }
      }
    });

    it('parses parenthesized switch discriminants in function bodies', () => {
      const ast = parse(`//@version=5
indicator("Parenthesized Switch")
getTablePosition(posIn) =>
    posOut = position.bottom_right
    switch (posIn)
        "Top Right" => posOut := position.top_right
        "Top Left" => posOut := position.top_left
        => posOut := position.bottom_right
    posOut`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'FunctionDeclaration',
      ]);
      const fn = ast.body[1];
      expect(fn.type).toBe('FunctionDeclaration');
      if (fn.type === 'FunctionDeclaration') {
        expect(Array.isArray(fn.body)).toBe(true);
        const body = Array.isArray(fn.body) ? fn.body : [];
        const switchStatement = body[1];
        expect(switchStatement?.type).toBe('ExpressionStatement');
        if (switchStatement?.type === 'ExpressionStatement') {
          expect(switchStatement.expression.type).toBe('SwitchExpression');
          if (switchStatement.expression.type === 'SwitchExpression') {
            expect(switchStatement.expression.discriminant?.type).toBe('Identifier');
            expect(switchStatement.expression.cases).toHaveLength(3);
            expect(switchStatement.expression.cases.map((switchCase) => (
              Array.isArray(switchCase.consequent) ? switchCase.consequent[0]?.type : switchCase.consequent.type
            ))).toEqual(['AssignmentStatement', 'AssignmentStatement', 'AssignmentStatement']);
          }
        }
      }
    });

    it('does not leak statements after irregular switch arms out of enclosing loops', () => {
      const ast = parse(`//@version=5
indicator("Loop switch boundary", overlay=false)
for i = 0 to 1
    qImp = switch i
       0 =>
           10.0
       =>
           20.0
    after = qImp + 1
    plot(after)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'ForStatement',
      ]);
      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        expect(loop.body.map((statement) => statement.type)).toEqual([
          'VariableDeclaration',
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
      }
    });

    it('keeps following loop statements out of irregular if bodies', () => {
      const ast = parse(`//@version=5
indicator("Loop if boundary", overlay=false)
for i = 0 to 1
    if i == 0
       qImp = i
    after = i + 1
    plot(after)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'ForStatement',
      ]);
      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        expect(loop.body.map((statement) => statement.type)).toEqual([
          'IfStatement',
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
        const branch = loop.body[0];
        expect(branch.type).toBe('IfStatement');
        if (branch.type === 'IfStatement') {
          expect(branch.consequent.map((statement) => statement.type)).toEqual([
            'VariableDeclaration',
          ]);
        }
      }
    });

    it('keeps following loop statements out of irregular nested for bodies', () => {
      const ast = parse(`//@version=5
indicator("Nested for boundary", overlay=false)
for i = 0 to 1
    for j = 0 to 1
       qImp = j
    after = i + 1
    plot(after)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'ForStatement',
      ]);
      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        expect(loop.body.map((statement) => statement.type)).toEqual([
          'ForStatement',
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
        const nestedLoop = loop.body[0];
        expect(nestedLoop.type).toBe('ForStatement');
        if (nestedLoop.type === 'ForStatement') {
          expect(nestedLoop.body.map((statement) => statement.type)).toEqual([
            'VariableDeclaration',
          ]);
        }
      }
    });

    it('keeps following loop statements out of irregular while bodies', () => {
      const ast = parse(`//@version=5
indicator("While boundary", overlay=false)
for i = 0 to 1
    while i < 1
       qImp = i
    after = i + 1
    plot(after)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'ForStatement',
      ]);
      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        expect(loop.body.map((statement) => statement.type)).toEqual([
          'WhileStatement',
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
        const nestedLoop = loop.body[0];
        expect(nestedLoop.type).toBe('WhileStatement');
        if (nestedLoop.type === 'WhileStatement') {
          expect(nestedLoop.body.map((statement) => statement.type)).toEqual([
            'VariableDeclaration',
          ]);
        }
      }
    });

    it('keeps following loop statements out of irregular else bodies', () => {
      const ast = parse(`//@version=5
indicator("Else boundary", overlay=false)
for i = 0 to 1
    if i == 0
       qImp = i
    else
       qImp = i + 1
    after = i + 1
    plot(after)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'ForStatement',
      ]);
      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        expect(loop.body.map((statement) => statement.type)).toEqual([
          'IfStatement',
          'VariableDeclaration',
          'ExpressionStatement',
        ]);
        const branch = loop.body[0];
        expect(branch.type).toBe('IfStatement');
        if (branch.type === 'IfStatement') {
          expect(branch.consequent.map((statement) => statement.type)).toEqual([
            'VariableDeclaration',
          ]);
          expect(Array.isArray(branch.alternate)).toBe(true);
          if (Array.isArray(branch.alternate)) {
            expect(branch.alternate.map((statement) => statement.type)).toEqual([
              'VariableDeclaration',
            ]);
          }
        }
      }
    });

    it('binds for-expression branches inside tuple declaration initializers', () => {
      const ast = parse(`//@version=5
indicator("For expression declaration binding", overlay=false)
method locate(int this, bool isBullish) =>
    float refValue = 0.0
    int refIndex = 0
    [value, index] = if isBullish
        for i = 1 to 3
            refValue := i
            refIndex := i
        [refValue, refIndex]
    else
        for i = 1 to 3
            refValue := -i
            refIndex := i
        [refValue, refIndex]
    true`);

      const method = ast.body[1];
      expect(method.type).toBe('FunctionDeclaration');
      if (method.type === 'FunctionDeclaration') {
        expect(Array.isArray(method.body)).toBe(true);
        if (Array.isArray(method.body)) {
          const declaration = method.body[2];
          expect(declaration.type).toBe('VariableDeclaration');
          if (declaration.type === 'VariableDeclaration') {
            expect(declaration.names.type).toBe('TupleDeclarator');
            expect(declaration.init.type).toBe('IfStatement');
            if (declaration.init.type === 'IfStatement') {
              expect(declaration.init.consequent.map((statement) => statement.type)).toEqual([
                'ForStatement',
                'ExpressionStatement',
              ]);
              expect(Array.isArray(declaration.init.alternate)).toBe(true);
              if (Array.isArray(declaration.init.alternate)) {
                expect(declaration.init.alternate.map((statement) => statement.type)).toEqual([
                  'ForStatement',
                  'ExpressionStatement',
                ]);
              }
              const branchLoop = declaration.init.consequent[0];
              expect(branchLoop.type).toBe('ForStatement');
              if (branchLoop.type === 'ForStatement') {
                expect(branchLoop.body.map((statement) => statement.type)).toEqual([
                  'AssignmentStatement',
                  'AssignmentStatement',
                ]);
              }
            }
          }
          expect(method.body[3]?.type).toBe('ExpressionStatement');
        }
      }
    });

    it('does not attach a block-level unary minus to the previous initializer', () => {
      const ast = parse(`//@version=6
indicator("boundary")
f(series float x) =>
        float e = ta.ema(x, 3)
        -e
plot(f(close))`);
      const fn = ast.body.find((statement) => statement.type === 'FunctionDeclaration') as FunctionDeclaration;
      expect(Array.isArray(fn.body)).toBe(true);
      if (Array.isArray(fn.body)) {
        expect(fn.body).toHaveLength(2);
        expect(fn.body[0]?.type).toBe('VariableDeclaration');
        expect(fn.body[1]?.type).toBe('ExpressionStatement');
      }
    });

    it('parses same-line var declarations as separate declarations', () => {
      const ast = parse(`//@version=6
indicator("same line vars")
f(series float source) =>
    var float first = na var float second = na
    first := source
    second := first
    second
plot(f(close))`);
      const fn = ast.body.find((statement) => statement.type === 'FunctionDeclaration') as FunctionDeclaration;
      expect(fn.body).toHaveLength(5);
      if (Array.isArray(fn.body)) {
        expect(fn.body[0]?.type).toBe('VariableDeclaration');
        expect(fn.body[1]?.type).toBe('VariableDeclaration');
      }
    });

    it('parses nested function blocks beyond the legacy fixed-depth ladder', () => {
      const lines = ['//@version=6', 'indicator("deep")', 'f() =>'];
      for (let depth = 0; depth < 12; depth += 1) {
        lines.push(`${' '.repeat((depth + 1) * 4)}if true`);
      }
      lines.push(`${' '.repeat(13 * 4)}// comment before the deepest body`);
      lines.push(`${' '.repeat(13 * 4)}x = 1`);
      lines.push(`${' '.repeat(12 * 4)}else`);
      lines.push(`${' '.repeat(13 * 4)}x = 2`);
      lines.push('x');

      expect(() => parse(lines.join('\n'))).not.toThrow();
    });

    it('keeps the first code line as the recursive block baseline after comments', () => {
      const source = `//@version=6
indicator("deep comments")
f() =>
${' '.repeat(4)}if true
${' '.repeat(8)}// keep this comment inside the block
${' '.repeat(8)}x = 1
x`;

      expect(() => parse(source)).not.toThrow();
    });

    it('parses mixed expression and assignment comma chains', () => {
      const ast = parse(`//@version=6
indicator("mixed chain")
int[] values = array.from(1, 2)
array.shift(values), size = array.size(values)
plot(size)`);

      expect(ast.body.map((statement) => statement.type)).toEqual([
        'IndicatorDeclaration',
        'VariableDeclaration',
        'ExpressionStatement',
        'VariableDeclaration',
        'ExpressionStatement'
      ]);
    });

    it('parses assignment followed by a comma-chained side effect', () => {
      const statement = parse('value := 1, math.abs(value)', { startRule: 'Statement' });

      expect(statement.type).toBe('MultiStatement');
    });

    it('parses comma-chained loop control after assignment', () => {
      const ast = parse(`//@version=5
indicator("loop control chain")
for pool in liquidityPools
    if pool.swept
        swept := true, break`);

      const loop = ast.body[1];
      expect(loop.type).toBe('ForStatement');
      if (loop.type === 'ForStatement') {
        const branch = loop.body[0];
        expect(branch.type).toBe('IfStatement');
        if (branch.type === 'IfStatement') {
          expect(branch.consequent.map((statement) => statement.type)).toEqual([
            'AssignmentStatement',
            'BreakStatement',
          ]);
        }
      }
    });

    it('keeps function return expressions after comma-chained loop control in the function body', () => {
      const ast = parse(`//@version=6
indicator("loop control chain boundary")
check_liquidity_sweep() =>
    swept = false
    if array.size(liquidityPools) > 0
        for pool in liquidityPools
            if pool.swept
                swept := true, break
    swept
plot(check_liquidity_sweep() ? 1 : 0)
`);

      const fn = ast.body.find((statement) => statement.type === 'FunctionDeclaration');
      expect(fn?.type).toBe('FunctionDeclaration');
      if (fn?.type === 'FunctionDeclaration') {
        expect(Array.isArray(fn.body)).toBe(true);
        expect(Array.isArray(fn.body) ? fn.body.map((statement) => statement.type) : []).toEqual([
          'VariableDeclaration',
          'IfStatement',
          'ExpressionStatement',
        ]);
      }
    });

    it('parses a comma-chained assignment followed by a wrapped for block', () => {
      const ast = parse(`//@version=5
indicator("wrapped comma-chain for")
method collect(values copy, matrix<values> symbolMat) =>
    copy = values.new(dataArr = array.new_float(), symbolArr = array.new_string()),

    for i = 0 to symbolMat.columns() - 1
        array.push(copy.dataArr, symbolMat.get(0, i).symbolData)
    copy`);

      const method = ast.body.find(statement => statement.type === 'FunctionDeclaration');
      expect(method?.type).toBe('FunctionDeclaration');
      if (method?.type === 'FunctionDeclaration') {
        expect(Array.isArray(method.body)).toBe(true);
        expect(Array.isArray(method.body) ? method.body.map(statement => statement.type) : []).toEqual([
          'VariableDeclaration',
          'ForStatement',
          'ExpressionStatement',
        ]);
      }
    });

    it('parses typed numeric for-loop counters', () => {
      const statement = parse(`for int i = 1 to 3
    i`, { startRule: 'Statement' });

      expect(statement.type).toBe('ForStatement');
      if (statement.type === 'ForStatement') {
        expect(statement.kind).toBe('numeric');
        expect(statement.counter.name).toBe('i');
      }
    });

    it('parses comma-chained assignments in switch consequents', () => {
      expect(() => parse(`//@version=6
indicator("switch chain")
int a = 0
int b = 0
switch true
    true => a += 1, b += 1`)).not.toThrow();
    });

    it('parses a switch nested after control-flow blocks', () => {
      expect(() => parse(`//@version=5
indicator("nested switch")
f() =>
        switch
            true =>
                if true
                    for i = 0 to 2
                        x = i
                if true
                    for j = 0 to 2
                        y = j
                        if true
                            switch firstPos
                                "r" =>
                                    for d = 0 to bars
                                        if pos == 1 and close[d] > p
                                            breaks += 1
                                            pos := 0
                                "s" =>
                                    for d = 0 to bars
                                        if pos == 1 and close[d] < p
                                            breaks += 1
                                            pos := 0`)).not.toThrow();
    });

    it('keeps negative sibling switch arms out of nested switch cases', () => {
      const source = `//@version=6
indicator("nested switch case boundary")
f() =>
    if ready
        for i = 0 to 1
            switch dir
                1 =>
                    switch mode
                        1 => a()
                        2 => b()
                -1 =>
                    switch mode
                        1 => c()
                        2 => d()
    done
`;
      const ast = parse(source);
      const findSwitchStartingOnLine = (root: unknown, line: number): Extract<Expression, { type: 'SwitchExpression' }> | undefined => {
        if (!root || typeof root !== 'object') return undefined;
        const loc = 'loc' in root ? root.loc : undefined;
        const start = loc && typeof loc === 'object' && 'start' in loc ? loc.start : undefined;
        if (
          'type' in root
          && root.type === 'SwitchExpression'
          && start
          && typeof start === 'object'
          && 'line' in start
          && start.line === line
        ) {
          return root as Extract<Expression, { type: 'SwitchExpression' }>;
        }
        for (const value of Object.values(root)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              const found = findSwitchStartingOnLine(item, line);
              if (found) return found;
            }
          } else {
            const found = findSwitchStartingOnLine(value, line);
            if (found) return found;
          }
        }
        return undefined;
      };

      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');
      const outerSwitch = findSwitchStartingOnLine(fn, 6);

      expect(outerSwitch?.cases).toHaveLength(2);
      expect(outerSwitch?.cases[0]?.test?.type).toBe('NumericLiteral');
      expect(outerSwitch?.cases[1]?.test?.type).toBe('UnaryExpression');
      expect(findSwitchStartingOnLine(outerSwitch?.cases[0], 8)?.cases).toHaveLength(2);
      expect(findSwitchStartingOnLine(outerSwitch?.cases[1], 12)?.cases).toHaveLength(2);
      expect(checkAstStructureInvariants(ast, source)).toEqual([]);
    });

    it('keeps function returns outside loop-valued reassignment bodies', () => {
      const source = `//@version=6
indicator("loop expression assignment boundary")
f() =>
    made = 0
    made := for i = 0 to 1
        i
    made := while made < 2
        made + 1
    made
`;
      const ast = parse(source);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');

      expect(fn?.body).toHaveLength(4);
      if (!fn || !Array.isArray(fn.body)) return;
      const forAssignment = fn.body[1];
      const whileAssignment = fn.body[2];
      expect(forAssignment?.type).toBe('AssignmentStatement');
      expect(whileAssignment?.type).toBe('AssignmentStatement');
      if (forAssignment?.type === 'AssignmentStatement' && forAssignment.right.type === 'ForStatement') {
        expect(forAssignment.right.body).toHaveLength(1);
      }
      if (whileAssignment?.type === 'AssignmentStatement' && whileAssignment.right.type === 'WhileStatement') {
        expect(whileAssignment.right.body).toHaveLength(1);
      }
      expect(checkAstStructureInvariants(ast, source)).toEqual([]);
    });
  });

  describe('AST structure invariants', () => {
    it('accepts known-good boundary, tuple, switch, and precedence shapes', () => {
      const source = `//@version=6
indicator("AST invariants")
score = 1 + 2 * 3
[basis, upper] = if close > open
    [close, high]
else
    [open, low]
mode = switch close > open
    true => 1
    => 0
check() =>
    found = false
    for value in values
        if value > 0
            found := true, break
    found
plot(score + mode + (check() ? 1 : 0))
`;

      const ast = parse(source);

      expect(checkAstStructureInvariants(ast, source)).toEqual([]);
    });

    it('reports a function-body statement that escaped its indentation block', () => {
      const source = `//@version=6
indicator("AST escaped block")
check() =>
    found = false
    if close > open
        found := true, break
    found
plot(check() ? 1 : 0)
`;
      const ast = parse(source);
      const fn = ast.body.find((statement): statement is FunctionDeclaration => statement.type === 'FunctionDeclaration');
      expect(fn).toBeDefined();
      if (!fn || !Array.isArray(fn.body)) return;
      const escaped = fn.body.pop();
      expect(escaped?.type).toBe('ExpressionStatement');
      ast.body.splice(ast.body.indexOf(fn) + 1, 0, escaped as Statement);

      expect(checkAstStructureInvariants(ast, source).map((issue) => issue.code)).toContain('indented-statement-missing-from-block');
    });

    it('reports tuple initializer if expressions that lose their else', () => {
      const source = `//@version=6
indicator("AST tuple else")
[basis, upper] = if close > open
    [close, high]
else
    [open, low]
plot(basis)
`;
      const ast = parse(source);
      const declaration = ast.body.find((statement) => statement.type === 'VariableDeclaration');
      expect(declaration?.type).toBe('VariableDeclaration');
      if (declaration?.type !== 'VariableDeclaration' || declaration.init.type !== 'IfStatement') return;
      declaration.init.alternate = undefined;

      expect(checkAstStructureInvariants(ast, source).map((issue) => issue.code)).toContain('tuple-if-lost-same-indent-else');
    });

    it('reports binary expressions whose root operator disagrees with source precedence', () => {
      const source = `//@version=6
indicator("AST precedence")
value = 1 + 2 * 3
plot(value)
`;
      const ast = parse(source);
      const declaration = ast.body.find((statement) => statement.type === 'VariableDeclaration');
      expect(declaration?.type).toBe('VariableDeclaration');
      if (declaration?.type !== 'VariableDeclaration' || declaration.init.type !== 'BinaryExpression') return;
      declaration.init.operator = '*';

      expect(checkAstStructureInvariants(ast, source).map((issue) => issue.code)).toContain('operator-precedence-root-mismatch');
    });

    it('accepts the Pine v6 documented binary precedence ladder', () => {
      const source = `//@version=6
indicator("AST precedence ladder")
value = a or b and c == d > e + f * g
leftToRight = a - b - c + d
plot(value ? leftToRight : na)
`;
      const ast = parse(source);

      expect(checkAstStructureInvariants(ast, source)).toEqual([]);
    });

    it('parses relational comparisons above equality per Pine v6 precedence', () => {
      const source = `//@version=6
indicator("AST relational precedence")
value = a == b > c
plot(value ? 1 : 0)
`;
      const ast = parse(source);
      const declaration = ast.body.find((statement) => statement.type === 'VariableDeclaration');
      expect(declaration?.type).toBe('VariableDeclaration');
      if (declaration?.type !== 'VariableDeclaration' || declaration.init.type !== 'BinaryExpression') return;

      expect(declaration.init.operator).toBe('==');
      expect(declaration.init.right.type).toBe('BinaryExpression');
      if (declaration.init.right.type === 'BinaryExpression') {
        expect(declaration.init.right.operator).toBe('>');
      }
      expect(checkAstStructureInvariants(ast, source)).toEqual([]);
    });
  });

  describe('lambda expressions', () => {
    it('parses a single-param lambda', () => {
      const ast = parse('(v) => v > 0', { startRule: 'Expression' });
      expect(ast.type).toBe('LambdaExpression');
      if (ast.type === 'LambdaExpression') {
        expect(ast.params).toHaveLength(1);
        expect(ast.params[0].name).toBe('v');
        expect(ast.body.type).toBe('BinaryExpression');
      }
    });

    it('parses a two-param lambda with ternary body', () => {
      const ast = parse('(a, b) => a < b ? -1 : 1', { startRule: 'Expression' });
      expect(ast.type).toBe('LambdaExpression');
      if (ast.type === 'LambdaExpression') {
        expect(ast.params).toHaveLength(2);
        expect(ast.params[0].name).toBe('a');
        expect(ast.params[1].name).toBe('b');
        expect(ast.body.type).toBe('ConditionalExpression');
      }
    });

    it('parses a lambda as a call argument', () => {
      const ast = parse('array.every(arr, (v) => v > 0)', { startRule: 'Expression' });
      expect(ast.type).toBe('CallExpression');
      if (ast.type === 'CallExpression') {
        expect(ast.arguments).toHaveLength(2);
        expect(ast.arguments[1].value.type).toBe('LambdaExpression');
      }
    });

    it('does not misparse parenthesized expressions as lambdas', () => {
      const ast = parse('(close + open) * 2', { startRule: 'Expression' });
      expect(ast.type).toBe('BinaryExpression');
    });

    it('does not misparse single-identifier parens as lambda', () => {
      // (v) with no => should parse as identifier v
      const ast = parse('(v)', { startRule: 'Expression' });
      expect(ast.type).toBe('Identifier');
    });

    it('parses deeply nested redundant parentheses without exhausting the parser stack', () => {
      const source = `${'('.repeat(600)}close${')'.repeat(600)}`;
      const ast = parse(source, { startRule: 'Expression' });

      expect(ast.type).toBe('Identifier');
      if (ast.type === 'Identifier') expect(ast.name).toBe('close');
    });
  });
});
