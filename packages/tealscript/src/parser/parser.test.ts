import { describe, it, expect } from 'vitest';
import { parse, validate, TealscriptParseError, formatParseError } from './parser';
import { isExpression } from './ast';
import type { Expression, Statement } from './ast';

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
      const source = '//@version=6\nindicator( "Test" )\nx = 1';
      const ast = parse(source);
      expect(ast.type).toBe('Program');
      const decl = ast.body.find(s => s.type === 'VariableDeclaration');
      expect(decl).toBeDefined();
    });

    it('preserves NBSP inside string literals without converting it to a regular space', () => {
      // The NBSP between hello and world is inside a string and must not be normalized.
      const NBSP = ' ';
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
  });
});
