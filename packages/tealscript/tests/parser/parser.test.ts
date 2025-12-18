/**
 * TealScript Parser Tests
 */

import { describe, expect, it } from 'vitest';

import { parse, validate, TealScriptParseError, formatParseError } from '../../src/parser';
import type { Program, IndicatorDeclaration, VariableDeclaration, CallExpression } from '../../src/parser';

describe('TealScript Parser', () => {
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
      const ast = parse('indicator("Test", overlay=true, precision=2)\n');
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
    });

    describe('Ternary expressions', () => {
      it('parses ternary', () => {
        const ast = parse('x = a > b ? 1 : 0\n');
        const decl = ast.body[0] as VariableDeclaration;
        expect(decl.init).toEqual(expect.objectContaining({
          type: 'ConditionalExpression',
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

      it('parses method call', () => {
        const ast = parse('x = ta.sma(close, 14)\n');
        const decl = ast.body[0] as VariableDeclaration;
        const call = decl.init as CallExpression;
        expect(call.type).toBe('CallExpression');
        expect(call.callee).toEqual(expect.objectContaining({
          type: 'MemberExpression',
        }));
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
      expect(ast.body[0].type).toBe('ForStatement');
    });

    it('parses for loop with step', () => {
      const code = `for i = 0 to 10 by 2
    sum := sum + i
`;
      const ast = parse(code);
      const forStmt = ast.body[0];
      expect(forStmt.type).toBe('ForStatement');
      if (forStmt.type === 'ForStatement') {
        expect(forStmt.step).not.toBeNull();
      }
    });

    it('parses while loop', () => {
      const code = `while x > 0
    x := x - 1
`;
      const ast = parse(code);
      expect(ast.body[0].type).toBe('WhileStatement');
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
    it('throws TealScriptParseError on syntax error', () => {
      expect(() => parse('x = \n')).toThrow(TealScriptParseError);
    });

    it('provides location in error', () => {
      try {
        parse('x = \n');
      } catch (error) {
        expect(error).toBeInstanceOf(TealScriptParseError);
        if (error instanceof TealScriptParseError) {
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
        if (error instanceof TealScriptParseError) {
          const formatted = formatParseError(error, source);
          expect(formatted).toContain('Parse error at line 1');
          expect(formatted).toContain('x = ');
        }
      }
    });
  });
});
