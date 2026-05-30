import { describe, it, expect } from 'vitest';
import { parse, validate, TealscriptParseError, formatParseError } from './parser';

describe('Tealscript Parser', () => {
  describe('parse', () => {
    describe('version directive', () => {
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
      });

      it('parses indicator with named parameters', () => {
        const ast = parse(`//@version=6
indicator("My Indicator", overlay=true, precision=2)`);

        const indicator = ast.body[0] as { type: string; overlay?: unknown; precision?: unknown };
        expect(indicator.type).toBe('IndicatorDeclaration');
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
