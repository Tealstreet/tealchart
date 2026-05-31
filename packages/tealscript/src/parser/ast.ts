/**
 * Tealscript AST Type Definitions
 *
 * Represents the Abstract Syntax Tree for Tealscript v6 (MVP subset).
 * Designed to be produced by the Peggy parser and consumed by the runtime.
 */

// ============================================================================
// Base Types
// ============================================================================

export interface SourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

export interface BaseNode {
  type: string;
  loc?: SourceLocation;
}

// ============================================================================
// Program (Root Node)
// ============================================================================

export interface Program extends BaseNode {
  type: 'Program';
  version: number; // e.g., 6 from //@version=6
  body: Statement[];
}

// ============================================================================
// Statements
// ============================================================================

export type Statement =
  | IndicatorDeclaration
  | FunctionDeclaration
  | VariableDeclaration
  | AssignmentStatement
  | ExpressionStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | BreakStatement
  | ContinueStatement;

/**
 * indicator("name", ...)
 */
export interface IndicatorDeclaration extends BaseNode {
  type: 'IndicatorDeclaration';
  declarationKind: 'indicator' | 'strategy';
  title: Expression;
  shorttitle?: Expression;
  overlay?: Expression;
  format?: Expression;
  precision?: Expression;
  scale?: Expression;
  max_bars_back?: Expression;
  max_labels_count?: Expression;
  max_lines_count?: Expression;
  max_boxes_count?: Expression;
  max_polylines_count?: Expression;
  timeframe?: Expression;
  timeframe_gaps?: Expression;
  dynamic_requests?: Expression;
}

/**
 * User-defined function declaration.
 *
 * myFunc(x, y) => x + y
 */
export interface FunctionDeclaration extends BaseNode {
  type: 'FunctionDeclaration';
  name: Identifier;
  params: FunctionParameter[];
  body: Expression | Statement[];
}

export interface FunctionParameter extends Identifier {
  defaultValue?: Expression;
}

/**
 * Variable declaration with optional type annotation
 *
 * var float myVar = 0.0
 * length = input.int(14)
 * [a, b, c] = someFunc()
 */
export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  kind: 'var' | 'varip' | 'none'; // 'var' persists, 'varip' persists intrabar, 'none' is regular
  names: VariableDeclarator | TupleDeclarator;
  typeAnnotation?: TypeAnnotation;
  init: Expression;
}

export interface VariableDeclarator extends BaseNode {
  type: 'VariableDeclarator';
  name: Identifier;
}

export interface TupleDeclarator extends BaseNode {
  type: 'TupleDeclarator';
  names: Identifier[];
}

/**
 * Assignment (reassignment) statement
 *
 * myVar := newValue
 */
export interface AssignmentStatement extends BaseNode {
  type: 'AssignmentStatement';
  operator: ':=' | '+=' | '-=' | '*=' | '/=' | '%=';
  left: Identifier | MemberExpression | IndexExpression;
  right: Expression;
}

/**
 * Expression used as statement (e.g., function call)
 *
 * plot(close)
 */
export interface ExpressionStatement extends BaseNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

/**
 * If statement with optional else/else-if
 */
export interface IfStatement extends BaseNode {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement[];
  alternate?: Statement[] | IfStatement; // else block or else-if
}

/**
 * For loop
 *
 * for i = 0 to 10
 *     ...
 *
 * for i = 0 to 10 by 2
 *     ...
 */
export type ForStatement = NumericForStatement | CollectionForStatement;

export interface NumericForStatement extends BaseNode {
  type: 'ForStatement';
  kind: 'numeric';
  counter: Identifier;
  start: Expression;
  end: Expression;
  step?: Expression;
  body: Statement[];
}

export interface CollectionForStatement extends BaseNode {
  type: 'ForStatement';
  kind: 'collection';
  counter: Identifier;
  indexCounter?: Identifier;
  iterable: Expression;
  body: Statement[];
}

/**
 * While loop
 */
export interface WhileStatement extends BaseNode {
  type: 'WhileStatement';
  test: Expression;
  body: Statement[];
}

export interface BreakStatement extends BaseNode {
  type: 'BreakStatement';
}

export interface ContinueStatement extends BaseNode {
  type: 'ContinueStatement';
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression =
  | Identifier
  | Literal
  | BinaryExpression
  | UnaryExpression
  | ConditionalExpression
  | SwitchExpression
  | ForStatement
  | WhileStatement
  | CallExpression
  | MemberExpression
  | IndexExpression
  | ArrayExpression
  | NaExpression;

/**
 * Identifier (variable/function name)
 */
export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

/**
 * Literal values
 */
export type Literal = NumericLiteral | StringLiteral | BooleanLiteral | ColorLiteral;

export interface NumericLiteral extends BaseNode {
  type: 'NumericLiteral';
  value: number;
  raw: string;
}

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
  raw: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface ColorLiteral extends BaseNode {
  type: 'ColorLiteral';
  value: string; // e.g., "#FF0000" or "red"
}

/**
 * Binary expression: left op right
 *
 * a + b, x > y, a and b
 */
export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator =
  // Arithmetic
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  // Comparison
  | '=='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  // Logical
  | 'and'
  | 'or';

/**
 * Unary expression: op operand
 *
 * -x, not y
 */
export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  argument: Expression;
  prefix: boolean;
}

export type UnaryOperator = '-' | '+' | 'not';

/**
 * Conditional (ternary) expression
 *
 * condition ? trueExpr : falseExpr
 */
export interface ConditionalExpression extends BaseNode {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

/**
 * Switch expression
 *
 * switch mode
 *     "EMA" => ta.ema(close, length)
 *     => ta.sma(close, length)
 *
 * switch
 *     close > open => 1
 *     => 0
 */
export interface SwitchExpression extends BaseNode {
  type: 'SwitchExpression';
  discriminant?: Expression | null;
  cases: SwitchCase[];
}

export interface SwitchCase extends BaseNode {
  type: 'SwitchCase';
  test?: Expression | null;
  consequent: Expression | Statement[];
}

/**
 * Function/method call
 *
 * ta.sma(close, 14)
 * math.max(a, b)
 * plot(value, color=color.red)
 */
export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression; // Identifier or MemberExpression
  arguments: CallArgument[];
}

export interface CallArgument extends BaseNode {
  type: 'CallArgument';
  name?: Identifier; // Named argument: name=value
  value: Expression;
}

/**
 * Member access
 *
 * ta.sma, color.red, math.abs
 */
export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

/**
 * Index/history access
 *
 * close[1], myArray[i]
 */
export interface IndexExpression extends BaseNode {
  type: 'IndexExpression';
  object: Expression;
  index: Expression;
}

/**
 * Array literal (for future use)
 *
 * [1, 2, 3]
 */
export interface ArrayExpression extends BaseNode {
  type: 'ArrayExpression';
  elements: Expression[];
}

/**
 * na value (Tealscript's null equivalent)
 */
export interface NaExpression extends BaseNode {
  type: 'NaExpression';
}

// ============================================================================
// Type Annotations
// ============================================================================

export interface TypeAnnotation extends BaseNode {
  type: 'TypeAnnotation';
  baseType: PineType;
  isArray?: boolean;
  elementType?: PineType;
}

export type PineType =
  | 'int'
  | 'float'
  | 'bool'
  | 'string'
  | 'color'
  | 'series'
  | 'simple'
  | 'const'
  | 'input'
  | 'array';

// ============================================================================
// Helper Types
// ============================================================================

export type AnyNode = Program | Statement | Expression | TypeAnnotation | CallArgument;

/**
 * Type guard functions
 */
export function isExpression(node: AnyNode): node is Expression {
  return [
    'Identifier',
    'NumericLiteral',
    'StringLiteral',
    'BooleanLiteral',
    'ColorLiteral',
    'BinaryExpression',
    'UnaryExpression',
    'ConditionalExpression',
    'ForStatement',
    'WhileStatement',
    'CallExpression',
    'MemberExpression',
    'IndexExpression',
    'ArrayExpression',
    'NaExpression',
  ].includes(node.type);
}

export function isStatement(node: AnyNode): node is Statement {
  return [
    'IndicatorDeclaration',
    'FunctionDeclaration',
    'VariableDeclaration',
    'AssignmentStatement',
    'ExpressionStatement',
    'IfStatement',
    'ForStatement',
    'WhileStatement',
    'BreakStatement',
    'ContinueStatement',
  ].includes(node.type);
}

export function isLiteral(node: AnyNode): node is Literal {
  return ['NumericLiteral', 'StringLiteral', 'BooleanLiteral', 'ColorLiteral'].includes(node.type);
}
