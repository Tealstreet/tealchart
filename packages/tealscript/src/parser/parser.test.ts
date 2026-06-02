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
