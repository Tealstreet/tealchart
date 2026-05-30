/**
 * PineScript v6 Grammar (MVP Subset)
 *
 * A PEG grammar for parsing a subset of TradingView's PineScript language.
 * Designed to handle the most common indicator patterns.
 */

{
  // Helper to create location info
  function loc() {
    return location();
  }

  // Helper to build binary expression left-to-right
  function buildBinaryExpr(head, tail) {
    return tail.reduce((left, [, op, , right]) => ({
      type: 'BinaryExpression',
      operator: op,
      left,
      right,
      loc: loc()
    }), head);
  }
}

// ============================================================================
// Program
// ============================================================================

Program
  = _ version:VersionAnnotation? _ statements:StatementList _ {
      return {
        type: 'Program',
        version: version || 6,
        body: statements,
        loc: loc()
      };
    }

VersionAnnotation
  = "//@version=" n:Integer _ LineTerminator {
      return n.value;
    }

StatementList
  = statements:(Statement _)* {
      return statements.map(s => s[0]).filter(s => s !== null);
    }

// ============================================================================
// Statements
// ============================================================================

Statement
  = IndicatorDeclaration
  / FunctionDeclaration
  / VariableDeclaration
  / AssignmentStatement
  / IfStatement
  / ForStatement
  / WhileStatement
  / BreakStatement
  / ContinueStatement
  / ExpressionStatement
  / EmptyStatement

EmptyStatement
  = LineTerminator { return null; }
  / Comment { return null; }

// indicator("title", ...)
IndicatorDeclaration
  = "indicator" _ "(" _ args:ArgumentList _ ")" _ LineTerminator? {
      const result = {
        type: 'IndicatorDeclaration',
        loc: loc()
      };

      // Process arguments
      for (const arg of args) {
        if (arg.name) {
          result[arg.name.name] = arg.value;
        } else if (!result.title) {
          result.title = arg.value;
        }
      }

      return result;
    }

// User-defined function: f(x, y) => x + y
FunctionDeclaration
  = name:Identifier _ "(" _ params:ParameterList? _ ")" _ "=>" _ LineTerminator body:IndentedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        loc: loc()
      };
    }
  / name:Identifier _ "(" _ params:ParameterList? _ ")" _ "=>" _ body:Expression _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        loc: loc()
      };
    }

ParameterList
  = head:Identifier tail:(_ "," _ Identifier)* {
      return [head, ...tail.map(t => t[3])];
    }

// Variable declaration: var float x = 0.0 or just x = 0.0
VariableDeclaration
  = kind:VarKind? _ type:TypeAnnotation? _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        loc: loc()
      };
    }

VarKind
  = "varip" !IdentifierPart { return 'varip'; }
  / "var" !IdentifierPart { return 'var'; }

DeclarationPattern
  = TuplePattern
  / SinglePattern

SinglePattern
  = name:Identifier {
      return {
        type: 'VariableDeclarator',
        name,
        loc: loc()
      };
    }

TuplePattern
  = "[" _ head:Identifier tail:(_ "," _ Identifier)* _ "]" {
      return {
        type: 'TupleDeclarator',
        names: [head, ...tail.map(t => t[3])],
        loc: loc()
      };
    }

TypeAnnotation
  = "array" !IdentifierPart _ "<" _ elementType:TypeName _ ">" {
      return {
        type: 'TypeAnnotation',
        baseType: 'array',
        isArray: true,
        elementType,
        loc: loc()
      };
    }
  / baseType:TypeName {
      return {
        type: 'TypeAnnotation',
        baseType,
        loc: loc()
      };
    }

TypeName
  = "series" !IdentifierPart { return 'series'; }
  / "simple" !IdentifierPart { return 'simple'; }
  / "const" !IdentifierPart { return 'const'; }
  / "input" !IdentifierPart { return 'input'; }
  / "float" !IdentifierPart { return 'float'; }
  / "int" !IdentifierPart { return 'int'; }
  / "bool" !IdentifierPart { return 'bool'; }
  / "string" !IdentifierPart { return 'string'; }
  / "color" !IdentifierPart { return 'color'; }

// Assignment: x := value
// Left side can be an identifier, member access, or index access
AssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator _ right:Expression _ LineTerminator? {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

// Valid assignment targets
AssignmentTarget
  = head:Identifier tail:(
      _ "." _ prop:IdentifierName { return { type: 'member', prop }; }
    / _ "[" _ index:Expression _ "]" { return { type: 'index', index }; }
  )* {
      return tail.reduce((obj, op) => {
        if (op.type === 'member') {
          return {
            type: 'MemberExpression',
            object: obj,
            property: { type: 'Identifier', name: op.prop, loc: loc() },
            loc: loc()
          };
        } else if (op.type === 'index') {
          return {
            type: 'IndexExpression',
            object: obj,
            index: op.index,
            loc: loc()
          };
        }
        return obj;
      }, head);
    }

AssignmentOperator
  = ":="
  / "+="
  / "-="
  / "*="
  / "/="
  / "%="

// Expression statement (function calls, etc.)
ExpressionStatement
  = !ReservedWord expr:Expression _ LineTerminator? {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

// If statement
IfStatement
  = "if" _ test:Expression _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / "if" _ test:Expression _ LineTerminator? _ consequent:SingleLineBody {
      return {
        type: 'IfStatement',
        test,
        consequent: [consequent],
        alternate: null,
        loc: loc()
      };
    }

ElseClause
  = _ "else" _ "if" _ test:Expression _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / _ "else" _ LineTerminator? block:IndentedBlock {
      return block;
    }

// For loop
ForStatement
  = "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:IndentedBlock {
      return {
        type: 'ForStatement',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

// While loop
WhileStatement
  = "while" _ test:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

BreakStatement
  = "break" _ LineTerminator? {
      return { type: 'BreakStatement', loc: loc() };
    }

ContinueStatement
  = "continue" _ LineTerminator? {
      return { type: 'ContinueStatement', loc: loc() };
    }

// Indented block (simplified: just look for indented lines)
IndentedBlock
  = statements:IndentedStatement+ {
      return statements.filter(s => s !== null);
    }

IndentedStatement
  = Indent stmt:Statement {
      return stmt;
    }

SingleLineBody
  = stmt:(VariableDeclaration / AssignmentStatement / ExpressionStatement / BreakStatement / ContinueStatement) {
      return stmt;
    }

Indent
  = "    " // 4 spaces
  / "\t"   // or tab

// ============================================================================
// Expressions (with precedence)
// ============================================================================

Expression
  = ConditionalExpression

// Ternary: condition ? true : false
ConditionalExpression
  = test:OrExpression _ "?" _ consequent:Expression _ ":" _ alternate:Expression {
      return {
        type: 'ConditionalExpression',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / OrExpression

// Logical OR
OrExpression
  = head:AndExpression tail:(_ OrOperator _ AndExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Logical AND
AndExpression
  = head:ComparisonExpression tail:(_ AndOperator _ ComparisonExpression)* {
      return buildBinaryExpr(head, tail);
    }

OrOperator
  = "or" !IdentifierPart { return "or"; }

AndOperator
  = "and" !IdentifierPart { return "and"; }

// Comparison: ==, !=, <, >, <=, >=
ComparisonExpression
  = head:AdditiveExpression tail:(_ ComparisonOperator _ AdditiveExpression)* {
      return buildBinaryExpr(head, tail);
    }

ComparisonOperator
  = "==" / "!=" / "<=" / ">=" / "<" / ">"

// Addition/Subtraction
AdditiveExpression
  = head:MultiplicativeExpression tail:(_ ("+" / "-") _ MultiplicativeExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Multiplication/Division/Modulo
MultiplicativeExpression
  = head:UnaryExpression tail:(_ ("*" / "/" / "%") _ UnaryExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Unary: -x, +x, not x
UnaryExpression
  = op:("-" / "+" / NotOperator) _ arg:UnaryExpression {
      return {
        type: 'UnaryExpression',
        operator: op,
        argument: arg,
        prefix: true,
        loc: loc()
      };
    }
  / PostfixExpression

NotOperator
  = "not" !IdentifierPart { return "not"; }

// Postfix: calls, member access, index access
PostfixExpression
  = head:PrimaryExpression tail:(
      _ "(" _ args:ArgumentList? _ ")" { return { type: 'call', args: args || [] }; }
    / _ "." _ prop:IdentifierName { return { type: 'member', prop }; }
    / _ "[" _ index:Expression _ "]" { return { type: 'index', index }; }
  )* {
      return tail.reduce((obj, op) => {
        if (op.type === 'call') {
          return {
            type: 'CallExpression',
            callee: obj,
            arguments: op.args,
            loc: loc()
          };
        } else if (op.type === 'member') {
          return {
            type: 'MemberExpression',
            object: obj,
            property: { type: 'Identifier', name: op.prop, loc: loc() },
            loc: loc()
          };
        } else if (op.type === 'index') {
          return {
            type: 'IndexExpression',
            object: obj,
            index: op.index,
            loc: loc()
          };
        }
        return obj;
      }, head);
    }

// Primary expressions
PrimaryExpression
  = "(" _ expr:Expression _ ")" { return expr; }
  / ArrayLiteral
  / NaLiteral
  / BooleanLiteral
  / ColorLiteral
  / StringLiteral
  / NumberLiteral
  / Identifier

// Array literal
ArrayLiteral
  = "[" _ head:Expression? tail:(_ "," _ Expression)* _ "]" {
      const elements = head ? [head, ...tail.map(t => t[3])] : [];
      return {
        type: 'ArrayExpression',
        elements,
        loc: loc()
      };
    }

// ============================================================================
// Literals
// ============================================================================

NaLiteral
  = "na" !IdentifierPart {
      return { type: 'NaExpression', loc: loc() };
    }

BooleanLiteral
  = "true" !IdentifierPart {
      return { type: 'BooleanLiteral', value: true, loc: loc() };
    }
  / "false" !IdentifierPart {
      return { type: 'BooleanLiteral', value: false, loc: loc() };
    }

ColorLiteral
  = "#" hex:$[0-9a-fA-F]+ {
      return {
        type: 'ColorLiteral',
        value: '#' + hex,
        loc: loc()
      };
    }

StringLiteral
  = '"' chars:DoubleStringChar* '"' {
      return {
        type: 'StringLiteral',
        value: chars.join(''),
        raw: '"' + chars.join('') + '"',
        loc: loc()
      };
    }
  / "'" chars:SingleStringChar* "'" {
      return {
        type: 'StringLiteral',
        value: chars.join(''),
        raw: "'" + chars.join('') + "'",
        loc: loc()
      };
    }

DoubleStringChar
  = !('"' / "\\" / LineTerminatorChar) . { return text(); }
  / "\\" seq:EscapeSequence { return seq; }

SingleStringChar
  = !("'" / "\\" / LineTerminatorChar) . { return text(); }
  / "\\" seq:EscapeSequence { return seq; }

EscapeSequence
  = "n" { return '\n'; }
  / "r" { return '\r'; }
  / "t" { return '\t'; }
  / "\\" { return '\\'; }
  / '"' { return '"'; }
  / "'" { return "'"; }

NumberLiteral
  = Float
  / Integer

Float
  = value:$([0-9]+ "." [0-9]* / "." [0-9]+) exp:$([eE] [+-]? [0-9]+)? {
      const raw = value + (exp || '');
      return {
        type: 'NumericLiteral',
        value: parseFloat(raw),
        raw,
        loc: loc()
      };
    }

Integer
  = value:$[0-9]+ {
      return {
        type: 'NumericLiteral',
        value: parseInt(value, 10),
        raw: value,
        loc: loc()
      };
    }

// ============================================================================
// Identifiers
// ============================================================================

Identifier
  = !ReservedWord name:IdentifierName {
      return {
        type: 'Identifier',
        name,
        loc: loc()
      };
    }

IdentifierName
  = $([a-zA-Z_] [a-zA-Z0-9_]*)

IdentifierPart
  = [a-zA-Z0-9_]

// Reserved words - keywords that cannot be used as identifiers
// Note: Type names (int, float, bool, etc.) are NOT reserved since they're
// valid namespace prefixes like color.red, input.int(), math.abs, etc.
ReservedWord
  = ("if" / "else" / "for" / "while" / "break" / "continue" / "var" / "varip"
    / "true" / "false" / "na" / "and" / "or" / "not" / "to" / "by"
    / "indicator" / "strategy" / "library" / "import" / "export"
    ) !IdentifierPart

// ============================================================================
// Function Arguments
// ============================================================================

ArgumentList
  = head:Argument tail:(_ "," _ Argument)* {
      return [head, ...tail.map(t => t[3])];
    }

Argument
  = name:Identifier _ "=" _ value:Expression {
      return {
        type: 'CallArgument',
        name,
        value,
        loc: loc()
      };
    }
  / value:Expression {
      return {
        type: 'CallArgument',
        name: null,
        value,
        loc: loc()
      };
    }

// ============================================================================
// Comments and Whitespace
// ============================================================================

Comment
  = SingleLineComment
  / MultiLineComment

SingleLineComment
  = "//" (!LineTerminatorChar .)* LineTerminator?

MultiLineComment
  = "/*" (!"*/" .)* "*/"

// Whitespace (no newlines - those are significant)
_
  = (WhiteSpace / MultiLineComment)*

WhiteSpace
  = [ \t]

LineTerminator
  = SingleLineComment? LineTerminatorChar+

LineTerminatorChar
  = [\n\r]
