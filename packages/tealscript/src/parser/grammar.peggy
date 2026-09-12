/**
 * PineScript v6 Grammar (MVP Subset)
 *
 * A PEG grammar for parsing a subset of TradingView's PineScript language.
 * Designed to handle the most common indicator patterns.
 */

{
  const BUILTIN_TYPE_NAMES = new Set([
    'int',
    'float',
    'bool',
    'string',
    'color',
    'series',
    'simple',
    'const',
    'input',
  ]);

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

  function formatTemplateType(name, args) {
    return `${name}<${args.join(', ')}>`;
  }

  function flattenTransientStatement(statement) {
    if (statement.type === 'MultiDeclaration') return statement.declarations;
    if (statement.type === 'MultiAssignment') return statement.assignments;
    if (statement.type === 'MultiExpressionStatement') {
      return statement.expressions.map(expression => ({
        type: 'ExpressionStatement',
        expression,
        loc: statement.loc
      }));
    }
    if (statement.type === 'MultiStatement') return statement.statements.flatMap(flattenTransientStatement);
    return [statement];
  }

  function buildStatementChain(head, tail) {
    const statements = [head, ...tail.map(t => t[3]).flatMap(flattenTransientStatement)];
    if (statements.every(statement => statement.type === 'VariableDeclaration')) {
      return { type: 'MultiDeclaration', declarations: statements, loc: loc() };
    }
    if (statements.every(statement => statement.type === 'AssignmentStatement')) {
      return { type: 'MultiAssignment', assignments: statements, loc: loc() };
    }
    return { type: 'MultiStatement', statements, loc: loc() };
  }

  function buildExpressionBodyChain(head, tail) {
    return [
      { type: 'ExpressionStatement', expression: head, loc: loc() },
      ...tail.map(t => t[3]).flatMap(flattenTransientStatement)
    ];
  }

  function isIdentifierStart(ch) {
    return /^[A-Za-z_]$/u.test(ch) || /^\p{L}$/u.test(ch);
  }

  function isIdentifierPart(ch) {
    return /^[A-Za-z0-9_]$/u.test(ch) || /^[\p{L}\p{N}]$/u.test(ch);
  }

  function isBlockIndentedOperator() {
    const start = location().start.offset;
    const previousLineStart = input.lastIndexOf('\n', start - 1) + 1;
    let previousIndentation = 0;
    while (input[previousLineStart + previousIndentation] === ' ' || input[previousLineStart + previousIndentation] === '\t') {
      previousIndentation += input[previousLineStart + previousIndentation] === '\t' ? 4 : 1;
    }

    const lineBreak = input.indexOf('\n', start);
    if (lineBreak === -1) return false;
    let offset = lineBreak + 1;
    let nextIndentation = 0;
    while (input[offset] === ' ' || input[offset] === '\t') {
      nextIndentation += input[offset] === '\t' ? 4 : 1;
      offset += 1;
    }
    const previousLine = input.slice(previousLineStart, start).trimStart();
    const previousLineIsAssignment = startsWithAssignmentStatement(previousLine);
    const previousLineIsBlockHeader = /^(if|else\s+if|for|while|switch)\b/.test(previousLine);
    const previousLineIsSwitchAssignment = previousLineIsAssignment && /\bswitch\b/.test(previousLine);
    const beforeOperator = input.slice(0, start);
    const openDelimiters = [...beforeOperator].reduce((depth, char) => {
      if (char === '(' || char === '[' || char === '{') return depth + 1;
      if (char === ')' || char === ']' || char === '}') return Math.max(0, depth - 1);
      return depth;
    }, 0);
    return (input[offset] === '-' || input[offset] === '+') &&
      openDelimiters === 0 &&
      (previousLineIsBlockHeader || previousLineIsSwitchAssignment || (nextIndentation <= previousIndentation && previousLineIsAssignment));
  }

  function startsWithAssignmentStatement(line) {
    let depth = 0;
    let inDouble = false;
    let inSingle = false;
    let escaped = false;
    for (let offset = 0; offset < line.length; offset += 1) {
      const character = line[offset];
      const previous = line[offset - 1] || '';
      const next = line[offset + 1] || '';
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && (inDouble || inSingle)) {
        escaped = true;
        continue;
      }
      if (character === '"' && !inSingle) {
        inDouble = !inDouble;
        continue;
      }
      if (character === "'" && !inDouble) {
        inSingle = !inSingle;
        continue;
      }
      if (inDouble || inSingle) continue;
      if (character === '/' && next === '/') break;
      if (character === '(' || character === '[' || character === '{') {
        depth += 1;
        continue;
      }
      if (character === ')' || character === ']' || character === '}') {
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (depth !== 0) continue;
      if (character === ':' && next === '=') return true;
      if (
        character === '=' &&
        next !== '=' &&
        next !== '>' &&
        previous !== '=' &&
        previous !== '!' &&
        previous !== '<' &&
        previous !== '>'
      ) {
        return true;
      }
      if ("+-*/%".includes(character) && next === '=') return true;
    }
    return false;
  }

  function currentLineIndentation() {
    const lineStart = input.lastIndexOf('\n', location().start.offset - 1) + 1;
    let indentation = 0;
    for (let offset = lineStart; offset < input.length; offset += 1) {
      const character = input[offset];
      if (character === ' ') indentation += 1;
      else if (character === '\t') indentation += 4;
      else break;
    }
    return indentation;
  }

  const arbitraryElseIndentStack = [];

  function currentArbitraryElseIndentation() {
    return arbitraryElseIndentStack[arbitraryElseIndentStack.length - 1];
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
        explicitVersion: version !== null,
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
      return statements.map(s => s[0]).filter(s => s !== null).flatMap(flattenTransientStatement);
    }

// ============================================================================
// Statements
// ============================================================================

Statement
  = IndicatorDeclaration
  / LibraryDeclaration
  / ImportDeclaration
  / TypeDeclaration
  / EnumDeclaration
  / MethodDeclaration
  / FunctionDeclaration
  / IfStatement
  / OnceStatement
  / ForStatement
  / WhileStatement
  / BreakStatement
  / ContinueStatement
  / VariableDeclaration
  / TupleAssignment
  / AssignmentStatement
  / ExpressionStatement
  / EmptyStatement

EmptyStatement
  = LineTerminator { return null; }
  / Comment { return null; }

// indicator("title", ...) / strategy("title", ...) / legacy study("title", ...)
IndicatorDeclaration
  = declarationKind:("indicator" / "strategy" / "study") _ "(" __ args:ArgumentList __ ")" _ LineTerminator? {
      const result = {
        type: 'IndicatorDeclaration',
        declarationKind: declarationKind === 'study' ? 'indicator' : declarationKind,
        sourceDeclarationKind: declarationKind,
        loc: loc()
      };

      // Process arguments
      const params = [
        'title',
        'shorttitle',
        'overlay',
        'format',
        'precision',
        'scale',
        'max_bars_back',
        'timeframe',
        'timeframe_gaps',
        'explicit_plot_zorder',
        'behind_chart',
        'max_lines_count',
        'max_labels_count',
        'max_boxes_count',
        'calc_bars_count',
        'max_polylines_count',
        'dynamic_requests',
        'initial_capital',
        'currency',
        'default_qty_type',
        'default_qty_value',
        'pyramiding',
        'commission_type',
        'commission_value',
        'slippage',
        'margin_long',
        'margin_short',
        'calc_on_order_fills',
        'calc_on_every_tick',
        'process_orders_on_close',
        'use_bar_magnifier',
        'risk_free_rate',
        'backtest_fill_limits_assumption',
        'close_entries_rule',
        'fill_orders_on_standard_ohlc',
        'calc_on_every_history_tick'
      ];
      for (const arg of args) {
        if (arg.name) {
          const name = declarationKind === 'study' && arg.name.name === 'resolution'
            ? 'timeframe'
            : declarationKind === 'study' && arg.name.name === 'resolution_gaps'
              ? 'timeframe_gaps'
              : arg.name.name;
          result[name] = arg.value;
        } else {
          const param = params.find((name) => result[name] === undefined);
          if (param) {
            result[param] = arg.value;
          }
        }
      }

      return result;
    }

// library("title", ...)
LibraryDeclaration
  = "library" !IdentifierPart _ "(" __ args:ArgumentList __ ")" _ LineTerminator? {
      const result = {
        type: 'LibraryDeclaration',
        loc: loc()
      };

      for (const arg of args) {
        if (arg.name) {
          result[arg.name.name] = arg.value;
        } else if (!result.title) {
          result.title = arg.value;
        } else if (!result.overlay) {
          result.overlay = arg.value;
        } else if (!result.dynamic_requests) {
          result.dynamic_requests = arg.value;
        }
      }

      return result;
    }

ImportDeclaration
  = "import" !IdentifierPart _ importPath:ImportPath _ "as" !IdentifierPart _ alias:Identifier _ LineTerminator? {
      return {
        type: 'ImportDeclaration',
        path: importPath.path,
        owner: importPath.owner,
        library: importPath.library,
        version: importPath.version,
        alias,
        loc: loc()
      };
    }
  / "import" !IdentifierPart _ importPath:ImportPath _ LineTerminator? {
      const alias = { type: 'Identifier', name: importPath.library, loc: loc() };
      return {
        type: 'ImportDeclaration',
        path: importPath.path,
        owner: importPath.owner,
        library: importPath.library,
        version: importPath.version,
        alias,
        loc: loc()
      };
    }

ImportPath
  = owner:ImportPathSegment "/" library:ImportPathSegment "/" version:Integer {
      return {
        path: `${owner}/${library}/${version.value}`,
        owner,
        library,
        version: version.value
      };
    }

ImportPathSegment
  = name:$([A-Za-z0-9_-]+) { return name; }

// User-defined type:
// type pivotPoint
//     int x
//     float y
//     string xloc = xloc.bar_time
TypeDeclaration
  = exported:("export" !IdentifierPart _)? "type" !IdentifierPart _ name:Identifier _ LineTerminator fields:TypeIndentedBlock {
      return {
        type: 'TypeDeclaration',
        name,
        fields,
        exported: !!exported,
        loc: loc()
      };
    }

TypeIndentedBlock
  = fields:(BlockIgnorableLine / TypeIndentedField)+ {
      return fields.filter(field => field !== null);
    }

TypeIndentedField
  = &Indent Indent field:TypeFieldDeclaration {
      return field;
    }

TypeFieldDeclaration
  = TypedTypeFieldDeclaration
  / UntypedTypeFieldDeclaration

TypedTypeFieldDeclaration
  = varip:("varip" !IdentifierPart _)? type:TypeAnnotation _ name:Identifier defaultValue:(_ "=" InitializerSpace Expression)? _ LineTerminator? {
      return {
        type: 'TypeFieldDeclaration',
        name,
        typeAnnotation: type,
        defaultValue: defaultValue ? defaultValue[3] : null,
        varip: !!varip,
        loc: loc()
      };
    }

UntypedTypeFieldDeclaration
  = varip:("varip" !IdentifierPart _)? name:Identifier defaultValue:(_ "=" InitializerSpace Expression)? _ LineTerminator? {
      return {
        type: 'TypeFieldDeclaration',
        name,
        typeAnnotation: null,
        defaultValue: defaultValue ? defaultValue[3] : null,
        varip: !!varip,
        loc: loc()
      };
    }

// User-defined enum:
// enum State
//     long = "Long"
//     short = "Short"
EnumDeclaration
  = exported:("export" !IdentifierPart _)? "enum" !IdentifierPart _ name:Identifier _ LineTerminator fields:EnumIndentedBlock {
      return {
        type: 'EnumDeclaration',
        name,
        fields,
        exported: !!exported,
        loc: loc()
      };
    }

EnumIndentedBlock
  = fields:(BlockIgnorableLine / EnumIndentedField)+ {
      return fields.filter(field => field !== null);
    }

EnumIndentedField
  = &Indent Indent field:EnumFieldDeclaration {
      return field;
    }

EnumFieldDeclaration
  = name:Identifier title:(_ "=" _ StringLiteral)? _ LineTerminator? {
      return {
        type: 'EnumFieldDeclaration',
        name,
        title: title ? title[3] : null,
        loc: loc()
      };
    }

// User-defined method: method scale(float this, float factor) => this * factor
// overload method f(...) => ... overloads an existing method for a different type
MethodDeclaration
  = exported:("export" !IdentifierPart _)? overload:("overload" !IdentifierPart _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* (__ ",")? __ ")" _ "=>" _ LineTerminator body:FunctionIndentedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body,
        isMethod: true,
        overloaded: !!overload,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? overload:("overload" !IdentifierPart _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* (__ ",")? __ ")" _ "=>" _ body:VariableDeclaration {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body: [body],
        isMethod: true,
        overloaded: !!overload,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? overload:("overload" !IdentifierPart _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* (__ ",")? __ ")" _ "=>" _ head:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)+ _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body: buildExpressionBodyChain(head, tail),
        isMethod: true,
        overloaded: !!overload,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? overload:("overload" !IdentifierPart _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* (__ ",")? __ ")" _ "=>" _ body:Expression _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body,
        isMethod: true,
        overloaded: !!overload,
        exported: !!exported,
        loc: loc()
      };
    }

// User-defined function: f(x, y) => x + y
FunctionDeclaration
  = exported:("export" !IdentifierPart _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ LineTerminator body:FunctionIndentedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ body:VariableDeclaration {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body: [body],
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ head:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)+ _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body: buildExpressionBodyChain(head, tail),
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ body:Expression _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        exported: !!exported,
        loc: loc()
      };
    }

ParameterList
  = head:Parameter tail:(__ "," __ Parameter)* (__ ",")? {
      return [head, ...tail.map(t => t[3])];
    }

Parameter
  = TypedParameter
  / UntypedParameter

TypedParameter
  = typeAnnotation:TypeAnnotation _ name:Identifier defaultValue:(__ "=" __ Expression)? {
      return {
        ...name,
        typeAnnotation,
        ...(defaultValue ? { defaultValue: defaultValue[3] } : {})
      };
    }

UntypedParameter
  = name:Identifier defaultValue:(__ "=" __ Expression)? {
      return {
        ...name,
        typeAnnotation: null,
        ...(defaultValue ? { defaultValue: defaultValue[3] } : {})
      };
    }

// Variable declaration: var float x = 0.0 or just x = 0.0
// Supports comma-separated multi-declaration: float x = 0, float y = 1
VariableDeclaration
  = TypedVariableDeclaration
  / UntypedVariableDeclaration

TypedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:VariableInitializer tail:(BeforeComma "," CommaContinuationSpace ChainedStatement)* _ LineTerminator? {
      const first = {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

UntypedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:VariableInitializer tail:(BeforeComma "," CommaContinuationSpace ChainedStatement)* _ LineTerminator? {
      const first = {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

ChainedStatement
  = TypedChainedVariableDeclaration
  / UntypedChainedVariableDeclaration
  / SingleAssignment
  / InlineLoopControlStatement
  / ChainedExpressionStatement

FunctionChainedStatement
  = FunctionForStatement
  / TypedChainedVariableDeclaration
  / UntypedChainedVariableDeclaration
  / SingleAssignment
  / InlineLoopControlStatement
  / ChainedExpressionStatement

TypedChainedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }

UntypedChainedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }

ChainedExpressionStatement
  = !StatementReservedWord expression:Expression {
      return {
        type: 'ExpressionStatement',
        expression,
        loc: loc()
      };
    }

VariableInitializer
  = IfStatement
  / Expression

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
  = "[" __ head:Identifier tail:(__ "," __ Identifier)* __ "]" {
      return {
        type: 'TupleDeclarator',
        names: [head, ...tail.map(t => t[3])],
        loc: loc()
      };
    }

TypeAnnotation
  = qualifier:TypeQualifier _ inner:TypeAnnotationBase {
      return { ...inner, qualifier };
    }
  / TypeAnnotationBase

TypeAnnotationBase
  = "array" !IdentifierPart _ "<" __ elementType:TypeReferenceName __ ">" {
      return {
        type: 'TypeAnnotation',
        baseType: 'array',
        isArray: true,
        elementType,
        loc: loc()
      };
    }
  / "matrix" !IdentifierPart _ "<" __ elementType:TypeReferenceName __ ">" {
      return {
        type: 'TypeAnnotation',
        baseType: 'matrix',
        elementType,
        loc: loc()
      };
    }
  / "map" !IdentifierPart _ "<" __ keyType:TypeReferenceName __ "," __ valueType:TypeReferenceName __ ">" {
      return {
        type: 'TypeAnnotation',
        baseType: 'map',
        keyType,
        valueType,
        loc: loc()
      };
    }
  / elementType:TypeName _ "[]" {
      return {
        type: 'TypeAnnotation',
        baseType: 'array',
        isArray: true,
        elementType,
        loc: loc()
      };
    }
  / baseType:TypeName {
      if (!BUILTIN_TYPE_NAMES.has(baseType)) {
        return {
          type: 'TypeAnnotation',
          baseType: 'udt',
          name: baseType,
          loc: loc()
        };
      }
      return {
        type: 'TypeAnnotation',
        baseType,
        loc: loc()
      };
    }

TypeQualifier
  = "series" !IdentifierPart { return 'series'; }
  / "simple" !IdentifierPart { return 'simple'; }
  / "const" !IdentifierPart { return 'const'; }
  / "input" !IdentifierPart { return 'input'; }

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
  / name:QualifiedTypeName { return name; }

QualifiedTypeName
  = head:IdentifierName tail:(_ "." _ IdentifierName)* {
      return [head, ...tail.map(t => t[3])].join('.');
    }

TypeReferenceName
  = "array" !IdentifierPart _ "<" __ elementType:TypeReferenceName __ ">" {
      return formatTemplateType('array', [elementType]);
    }
  / elementType:TypeName _ "[" _ "]" {
      return formatTemplateType('array', [elementType]);
    }
  / "matrix" !IdentifierPart _ "<" __ elementType:TypeReferenceName __ ">" {
      return formatTemplateType('matrix', [elementType]);
    }
  / "map" !IdentifierPart _ "<" __ keyType:TypeReferenceName __ "," __ valueType:TypeReferenceName __ ">" {
      return formatTemplateType('map', [keyType, valueType]);
    }
  / TypeName

// Tuple reassignment: [a, b] := expr (reassigns already-declared variables)
TupleAssignment
  = "[" __ head:Identifier tail:(__ "," __ Identifier)* __ "]" _ ":=" InitializerSpace right:VariableInitializer _ LineTerminator? {
      return {
        type: 'TupleAssignment',
        names: [head, ...tail.map(t => t[3])],
        right,
        loc: loc()
      };
    }

// Assignment: x := value, or comma-separated: x := 1, y := 2
// Left side can be an identifier, member access, or index access
AssignmentStatement
  = head:SingleAssignment tail:(BeforeComma "," CommaContinuationSpace ChainedStatement)* _ LineTerminator? {
      if (tail.length === 0) return head;
      return buildStatementChain(head, tail);
    }

SingleAssignment
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:VariableInitializer {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

// Reassignment with block if/switch RHS (function body context)
// These parallel SingleAssignment but allow FunctionIfStatement /
// FunctionSwitchExpression as the RHS value.
FunctionAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionSwitchExpression / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionNestedSwitchExpression / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionDeepNestedSwitchExpression / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionVeryDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionVeryDeepNestedSwitchExpression / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionUltraDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionMegaDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionSuperDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionSuperDeepNestedSwitchExpression / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionHyperDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
      return {
        type: 'AssignmentStatement',
        operator: op,
        left,
        right,
        loc: loc()
      };
    }

FunctionExtremeDeepNestedAssignmentStatement
  = left:AssignmentTarget _ op:AssignmentOperator InitializerSpace right:(FunctionArbitraryInlineIfStatement / FunctionCollectionForExpression / FunctionNumericForExpression / FunctionWhileExpression) {
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
      PostfixContinuationSpace "." _ prop:IdentifierName { return { type: 'member', prop }; }
    / PostfixContinuationSpace "[" _ index:Expression _ "]" { return { type: 'index', index }; }
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
// StatementReservedWord excludes switch/na/true/false so they can appear
// as standalone expression statements (e.g. UDF last-line switch, else-na).
// not/and/or are operators, not statement keywords — they must be allowed
// as expression starters (e.g. `not na(ph)` as a UDF return expression).
// method is intentionally excluded: MethodDeclaration is tried first in Statement,
// and method is valid as a variable/parameter name in expression context.
StatementReservedWord
  = ("if" / "else" / "for" / "while" / "break" / "continue" / "var" / "varip"
    / "to" / "by" / "once"
    / "enum"
    / "library" / "import" / "export"
    ) !IdentifierPart

ExpressionStatement
  = !StatementReservedWord head:Expression tail:(BeforeComma "," CommaContinuationSpace ChainedStatement)* _ LineTerminator? {
      if (tail.length === 0) {
        return { type: 'ExpressionStatement', expression: head, loc: loc() };
      }
      const chained = tail.map(t => t[3]);
      if (chained.every(statement => statement.type === 'ExpressionStatement')) {
        return {
          type: 'MultiExpressionStatement',
          expressions: [head, ...chained.map(statement => statement.expression)],
          loc: loc()
        };
      }
      return buildStatementChain(
        { type: 'ExpressionStatement', expression: head, loc: loc() },
        tail.map(t => [null, null, null, t[3]])
      );
    }

// If statement
IfStatement
  = "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator? _ consequent:SingleLineBody {
      return {
        type: 'IfStatement',
        test,
        consequent: [consequent],
        alternate: null,
        loc: loc()
      };
    }

ElseClause
  = _ "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / _ "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:IndentedBlock alternate:ElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / _ "else" !IdentifierPart _ LineTerminator? block:IndentedBlock {
      return block;
    }

// Once block
OnceStatement
  = "once" !IdentifierPart condition:(_ Expression)? _ LineTerminator body:IndentedBlock {
      return {
        type: 'OnceStatement',
        test: condition ? condition[1] : null,
        body,
        loc: loc()
      };
    }

// For loop
ForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:IndentedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

CollectionForCounter
  = "[" _ indexCounter:Identifier _ "," _ valueCounter:Identifier _ "]" {
      return { indexCounter, valueCounter };
    }
  / indexCounter:Identifier _ "," _ valueCounter:Identifier {
      return { indexCounter, valueCounter };
    }
  / valueCounter:Identifier {
      return { valueCounter };
    }

NumericForCounter
  = TypeAnnotation _ counter:Identifier { return counter; }
  / Identifier

// While loop
WhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

BreakStatement
  = "break" !IdentifierPart _ LineTerminator? {
      return { type: 'BreakStatement', loc: loc() };
    }

ContinueStatement
  = "continue" !IdentifierPart _ LineTerminator? {
      return { type: 'ContinueStatement', loc: loc() };
    }

IndentedBlock
  = leading:BlockIgnorableLine* first:IndentedFirstStatement rest:(
      BlockIgnorableLine
      / indentation:$([ \t]+) &{ return indentation.replace(/\t/g, '    ').length >= first.indentation; } _ stmt:IndentedStatementBody { return stmt; }
    )* {
      return [
        ...leading.filter(s => s !== null),
        first.statement,
        ...rest.filter(s => s !== null)
      ].flatMap(flattenTransientStatement);
    }

IndentedFirstStatement
  = indentation:$([ \t]+) _ stmt:IndentedStatementBody {
      return {
        indentation: indentation.replace(/\t/g, '    ').length,
        statement: stmt
      };
    }

IndentedStatementBody
  = stmt:(IndentedLocalFunctionDeclaration / FunctionSwitchExpressionStatement / FunctionIfStatement / FunctionForStatement / FunctionWhileStatement / FunctionVariableDeclaration / FunctionAssignmentStatement / Statement) {
      return stmt;
    }

IndentedLocalFunctionDeclaration
  = exported:("export" !IdentifierPart _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        exported: !!exported,
        loc: loc()
      };
    }

FunctionIndentedBlock
  = statements:(BlockIgnorableLine / FunctionIndentedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionIndentedStatement
  = &FunctionIndent FunctionIndent _ stmt:(FunctionSwitchExpressionStatement / FunctionIfStatement / FunctionForStatement / FunctionWhileStatement / FunctionVariableDeclaration / FunctionAssignmentStatement / Statement) {
      return stmt;
    }

FunctionSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionSwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / FunctionSwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

FunctionCollectionForExpression
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }

FunctionNumericForExpression
  = "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionWhileExpression
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionSwitchCase
  = FunctionNestedIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionNestedIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionNestedIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionNestedIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

FunctionIfStatement
  = "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator? _ consequent:SingleLineBody {
      return {
        type: 'IfStatement',
        test,
        consequent: [consequent],
        alternate: null,
        loc: loc()
      };
    }

FunctionElseClause
  = FunctionElseIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionElseIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionElseIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionVariableDeclaration
  = TypedFunctionVariableDeclaration
  / UntypedFunctionVariableDeclaration

TypedFunctionVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionCollectionForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNumericForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionWhileExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:((BeforeComma "," CommaContinuationSpace FunctionChainedStatement) / (_ chained:FunctionChainedStatement { return [null, null, null, chained]; }))* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: type, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

UntypedFunctionVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionCollectionForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNumericForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionWhileExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:((BeforeComma "," CommaContinuationSpace FunctionChainedStatement) / (_ chained:FunctionChainedStatement { return [null, null, null, chained]; }))* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: null, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

FunctionNestedBlock
  = statements:(BlockIgnorableLine / FunctionNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionNestedStatement
  = &FunctionNestedIndent FunctionNestedIndent _ stmt:(FunctionNestedSwitchExpressionStatement / FunctionNestedIfStatement / FunctionNestedForStatement / FunctionNestedWhileStatement / FunctionNestedVariableDeclaration / FunctionNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionNestedSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionNestedSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionNestedSwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / FunctionNestedSwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

FunctionNestedSwitchCase
  = FunctionDeepNestedIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

FunctionNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionNestedElseClause
  = FunctionNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionNestedVariableDeclaration
  = TypedFunctionNestedVariableDeclaration
  / UntypedFunctionNestedVariableDeclaration

TypedFunctionNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionCollectionForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNumericForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: type, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

UntypedFunctionNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionCollectionForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionNumericForExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: null, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

FunctionDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionDeepNestedStatement
  = &FunctionDeepNestedIndent FunctionDeepNestedIndent _ stmt:(FunctionDeepNestedSwitchExpressionStatement / FunctionDeepNestedIfStatement / FunctionDeepNestedForStatement / FunctionDeepNestedWhileStatement / FunctionDeepNestedVariableDeclaration / FunctionDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionDeepNestedSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionDeepNestedSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionDeepNestedSwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / FunctionDeepNestedSwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

FunctionDeepNestedSwitchCase
  = FunctionVeryDeepNestedIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionVeryDeepNestedIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionVeryDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionVeryDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionVeryDeepNestedIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionVeryDeepNestedIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

FunctionDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionDeepNestedElseClause
  = FunctionDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionDeepNestedVariableDeclaration
  = TypedFunctionDeepNestedVariableDeclaration
  / UntypedFunctionDeepNestedVariableDeclaration

TypedFunctionDeepNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionDeepNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: type, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

UntypedFunctionDeepNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionDeepNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: null, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

FunctionVeryDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionVeryDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionVeryDeepNestedStatement
  = &FunctionVeryDeepNestedIndent FunctionVeryDeepNestedIndent _ stmt:(FunctionVeryDeepNestedSwitchExpressionStatement / FunctionVeryDeepNestedIfStatement / FunctionVeryDeepNestedForStatement / FunctionVeryDeepNestedWhileStatement / FunctionVeryDeepNestedVariableDeclaration / FunctionVeryDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionVeryDeepNestedSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionVeryDeepNestedSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionVeryDeepNestedSwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / FunctionVeryDeepNestedSwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

FunctionVeryDeepNestedSwitchCase
  = FunctionUltraDeepNestedIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionUltraDeepNestedIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionUltraDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionUltraDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionUltraDeepNestedIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionUltraDeepNestedIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

FunctionVeryDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionVeryDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionVeryDeepNestedVariableDeclaration
  = TypedFunctionVeryDeepNestedVariableDeclaration
  / UntypedFunctionVeryDeepNestedVariableDeclaration

TypedFunctionVeryDeepNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionVeryDeepNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: type,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: type, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

UntypedFunctionVeryDeepNestedVariableDeclaration
  = exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionArbitraryInlineIfStatement {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:FunctionVeryDeepNestedSwitchExpression {
      return {
        type: 'VariableDeclaration',
        kind: kind || 'none',
        names: pattern,
        typeAnnotation: null,
        init,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" !IdentifierPart _)? kind:VarKind? _ pattern:DeclarationPattern DeclarationEqualsSpace AssignEquals InitializerSpace init:Expression tail:(BeforeComma "," CommaContinuationSpace FunctionChainedStatement)* LineTerminator? {
      const first = { type: 'VariableDeclaration', kind: kind || 'none', names: pattern, typeAnnotation: null, init, exported: !!exported, loc: loc() };
      if (tail.length === 0) return first;
      return buildStatementChain(first, tail);
    }

FunctionVeryDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionVeryDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionVeryDeepNestedElseClause
  = FunctionVeryDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionVeryDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionVeryDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionVeryDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionVeryDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionUltraDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionUltraDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionUltraDeepNestedStatement
  = &FunctionUltraDeepNestedIndent FunctionUltraDeepNestedIndent _ stmt:(FunctionUltraDeepNestedIfStatement / FunctionUltraDeepNestedForStatement / FunctionUltraDeepNestedWhileStatement / FunctionUltraDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionUltraDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionUltraDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionUltraDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionUltraDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionUltraDeepNestedElseClause
  = FunctionUltraDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionUltraDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionUltraDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionUltraDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionUltraDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionMegaDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionMegaDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionMegaDeepNestedStatement
  = &FunctionMegaDeepNestedIndent FunctionMegaDeepNestedIndent _ stmt:(FunctionMegaDeepNestedIfStatement / FunctionMegaDeepNestedForStatement / FunctionMegaDeepNestedWhileStatement / FunctionMegaDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionMegaDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionMegaDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionMegaDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionMegaDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionMegaDeepNestedElseClause
  = FunctionMegaDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionMegaDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionMegaDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionMegaDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionMegaDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionSuperDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionSuperDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionSuperDeepNestedStatement
  = &FunctionSuperDeepNestedIndent FunctionSuperDeepNestedIndent _ stmt:(FunctionSuperDeepNestedSwitchExpressionStatement / FunctionSuperDeepNestedIfStatement / FunctionSuperDeepNestedForStatement / FunctionSuperDeepNestedWhileStatement / FunctionSuperDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionSuperDeepNestedSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionSuperDeepNestedSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionSuperDeepNestedSwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / FunctionSuperDeepNestedSwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

FunctionSuperDeepNestedSwitchCase
  = FunctionHyperDeepNestedIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionHyperDeepNestedIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionHyperDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionHyperDeepNestedIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionHyperDeepNestedIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionHyperDeepNestedIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

FunctionSuperDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionSuperDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionSuperDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionSuperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionSuperDeepNestedElseClause
  = FunctionSuperDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionSuperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionSuperDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionSuperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionSuperDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionHyperDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionHyperDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionHyperDeepNestedStatement
  = &FunctionHyperDeepNestedIndent FunctionHyperDeepNestedIndent _ stmt:(FunctionHyperDeepNestedIfStatement / FunctionHyperDeepNestedForStatement / FunctionHyperDeepNestedWhileStatement / FunctionHyperDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionHyperDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionHyperDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionHyperDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionHyperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionHyperDeepNestedElseClause
  = FunctionHyperDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionHyperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionHyperDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionHyperDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionHyperDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionExtremeDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionExtremeDeepNestedStatement)+ {
      return statements.filter(s => s !== null).flatMap(flattenTransientStatement);
    }

FunctionExtremeDeepNestedStatement
  = &FunctionExtremeDeepNestedIndent FunctionExtremeDeepNestedIndent _ stmt:(FunctionExtremeDeepNestedIfStatement / FunctionExtremeDeepNestedForStatement / FunctionExtremeDeepNestedWhileStatement / FunctionExtremeDeepNestedAssignmentStatement / Statement) {
      return stmt;
    }

FunctionExtremeDeepNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionExtremeDeepNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionExtremeDeepNestedIfStatement
  = "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionExtremeDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionExtremeDeepNestedElseClause
  = FunctionExtremeDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionExtremeDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionExtremeDeepNestedIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionExtremeDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionExtremeDeepNestedIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionMaxDeepNestedBlock
  = FunctionArbitraryNestedBlock

FunctionArbitraryNestedBlock
  = leading:BlockIgnorableLine* first:FunctionArbitraryNestedFirstStatement rest:(
      BlockIgnorableLine
      / indentation:$([ \t]+) &{ return indentation.replace(/\t/g, '    ').length >= first.indentation; } _ stmt:FunctionArbitraryNestedStatementBody { return stmt; }
    )* {
      return [
        ...leading.filter(s => s !== null),
        first.statement,
        ...rest.filter(s => s !== null)
      ].flatMap(flattenTransientStatement);
    }

FunctionArbitraryNestedFirstStatement
  = indentation:$([ \t]+) _ stmt:FunctionArbitraryNestedStatementBody {
      return {
        indentation: indentation.replace(/\t/g, '    ').length,
        statement: stmt
      };
    }

FunctionArbitraryNestedStatementBody
  = stmt:(FunctionArbitraryNestedIfStatement / FunctionArbitraryNestedForStatement / FunctionArbitraryNestedWhileStatement / FunctionArbitraryNestedSwitchExpressionStatement / FunctionNestedVariableDeclaration / FunctionNestedAssignmentStatement / Statement) {
      return stmt;
    }

CurrentIndentation
  = &{ return true; } {
      return currentLineIndentation();
    }

FunctionArbitraryInlineIfStatement
  = indentation:CurrentIndentation "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock &{
      arbitraryElseIndentStack.push(indentation);
      return true;
    } alternate:FunctionArbitraryNestedElseClause? {
      arbitraryElseIndentStack.pop();
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionArbitraryNestedIfStatement
  = indentation:CurrentIndentation "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock &{
      arbitraryElseIndentStack.push(indentation);
      return true;
    } alternate:FunctionArbitraryNestedElseClause? {
      arbitraryElseIndentStack.pop();
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionArbitraryNestedElseClause
  = &{ return currentLineIndentation() === currentArbitraryElseIndentation(); } FunctionArbitraryIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace "(" _ test:Expression _ ")" _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionArbitraryNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / &{ return currentLineIndentation() === currentArbitraryElseIndentation(); } FunctionArbitraryIndent "else" !IdentifierPart _ "if" !IdentifierPart IfConditionSpace test:Expression _ LineTerminator consequent:FunctionArbitraryNestedBlock alternate:FunctionArbitraryNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / &{ return currentLineIndentation() === currentArbitraryElseIndentation(); } FunctionArbitraryIndent "else" !IdentifierPart _ LineTerminator? block:FunctionArbitraryNestedBlock {
      return block;
    }

FunctionArbitraryNestedForStatement
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }
  / "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

FunctionArbitraryNestedWhileStatement
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:FunctionArbitraryNestedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

FunctionArbitraryNestedSwitchExpressionStatement
  = !StatementReservedWord expr:FunctionArbitraryNestedSwitchExpression {
      return {
        type: 'ExpressionStatement',
        expression: expr,
        loc: loc()
      };
    }

FunctionArbitraryNestedSwitchExpression
  = switchIndent:CurrentIndentation "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator leading:BlockIgnorableLine* first:FunctionArbitraryNestedSwitchCase &{
      return first.indentation > switchIndent;
    } rest:(
      BlockIgnorableLine
      / &{ return currentLineIndentation() === first.indentation; } FunctionArbitraryNestedSwitchCase
    )* {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: [
          first.case,
          ...rest.map(item => Array.isArray(item) ? item[1].case : item).filter(c => c !== null)
        ],
        loc: loc()
      };
    }

FunctionArbitraryNestedSwitchCase
  = indentation:CurrentIndentation FunctionArbitraryIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test: null,
          consequent,
          loc: loc()
        }
      };
    }
  / indentation:CurrentIndentation FunctionArbitraryIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test,
          consequent,
          loc: loc()
        }
      };
    }
  / indentation:CurrentIndentation FunctionArbitraryIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test,
          consequent,
          loc: loc()
        }
      };
    }
  / indentation:CurrentIndentation FunctionArbitraryIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test,
          consequent,
          loc: loc()
        }
      };
    }
  / indentation:CurrentIndentation FunctionArbitraryIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test: null,
          consequent,
          loc: loc()
        }
      };
    }
  / indentation:CurrentIndentation FunctionArbitraryIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        indentation,
        case: {
          type: 'SwitchCase',
          test,
          consequent,
          loc: loc()
        }
      };
    }

FunctionArbitraryIndent
  = [ \t]+

FunctionMaxDeepNestedStatement
  = &FunctionMaxDeepNestedIndent FunctionMaxDeepNestedIndent _ stmt:Statement {
    return stmt;
  }

FunctionIndent
  = "        "
  / "      "
  / "     "
  / "    "
  / "   "
  / "  "
  / "\t"

FunctionNestedIndent
  = "        "
  / "\t\t"
  / "    \t"
  / "\t    "

FunctionElseIndent
  = &FunctionNestedIndent FunctionNestedIndent
  / &FunctionIndent FunctionIndent

FunctionDeepNestedIndent
  = "            "
  / "\t\t\t"
  / "        \t"
  / "    \t    "
  / "    \t\t"
  / "\t        "
  / "\t    \t"
  / "\t\t    "

FunctionVeryDeepNestedIndent
  = "                "
  / "\t\t\t\t"
  / "            \t"
  / "        \t    "
  / "        \t\t"
  / "    \t        "
  / "    \t    \t"
  / "    \t\t    "
  / "    \t\t\t"
  / "\t            "
  / "\t        \t"
  / "\t    \t    "
  / "\t    \t\t"
  / "\t\t        "
  / "\t\t    \t"
  / "\t\t\t    "

FunctionUltraDeepNestedIndent
  = "                    "
  / "\t\t\t\t\t"
  / "                \t"
  / "            \t    "
  / "            \t\t"
  / "        \t        "
  / "        \t    \t"
  / "        \t\t    "
  / "        \t\t\t"
  / "    \t            "
  / "    \t        \t"
  / "    \t    \t    "
  / "    \t    \t\t"
  / "    \t\t        "
  / "    \t\t    \t"
  / "    \t\t\t    "
  / "    \t\t\t\t"
  / "\t                "
  / "\t            \t"
  / "\t        \t    "
  / "\t        \t\t"
  / "\t    \t        "
  / "\t    \t    \t"
  / "\t    \t\t    "
  / "\t    \t\t\t"
  / "\t\t            "
  / "\t\t        \t"
  / "\t\t    \t    "
  / "\t\t    \t\t"
  / "\t\t\t        "
  / "\t\t\t    \t"
  / "\t\t\t\t    "

FunctionMegaDeepNestedIndent
  = Indent Indent Indent Indent Indent Indent

FunctionSuperDeepNestedIndent
  = Indent Indent Indent Indent Indent Indent Indent

FunctionHyperDeepNestedIndent
  = Indent Indent Indent Indent Indent Indent Indent Indent

FunctionExtremeDeepNestedIndent
  = Indent Indent Indent Indent Indent Indent Indent Indent Indent

FunctionMaxDeepNestedIndent
  = Indent Indent Indent Indent Indent Indent Indent Indent Indent Indent

SingleLineBody
  = stmt:(VariableDeclaration / TupleAssignment / AssignmentStatement / ExpressionStatement / BreakStatement / ContinueStatement) {
      return stmt;
    }

Indent
  = "    " // 4 spaces
  / "  "   // public Pine often uses two-space UDF bodies
  / "\t"   // or tab

BlockIgnorableLine
  = _ (LineTerminator / Comment) {
      return null;
    }

// ============================================================================
// Expressions (with precedence)
// ============================================================================

Expression
  = SwitchExpression
  / CollectionForExpression
  / NumericForExpression
  / WhileExpression
  / ConditionalExpression

SwitchExpression
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:(BlockIgnorableLine / SwitchCase)+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases: cases.filter(c => c !== null),
        loc: loc()
      };
    }

CollectionForExpression
  = "for" !IdentifierPart _ counter:CollectionForCounter _ "in" LoopHeaderContinuationSpace iterable:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'ForStatement',
        kind: 'collection',
        counter: counter.valueCounter,
        indexCounter: counter.indexCounter,
        iterable,
        body,
        loc: loc()
      };
    }

NumericForExpression
  = "for" !IdentifierPart _ counter:NumericForCounter _ "=" LoopHeaderContinuationSpace start:Expression _ "to" LoopHeaderContinuationSpace end:Expression step:(_ "by" LoopHeaderContinuationSpace Expression)? _ LineTerminator body:IndentedBlock {
      return {
        type: 'ForStatement',
        kind: 'numeric',
        counter,
        start,
        end,
        step: step ? step[3] : null,
        body,
        loc: loc()
      };
    }

WhileExpression
  = "while" !IdentifierPart _ test:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

SwitchCase
  = FunctionIndent _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionIndent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ LineTerminator consequent:FunctionArbitraryNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / indentation:CurrentIndentation FunctionIndent _ test:ConditionalExpression _ LineTerminator &{ return currentLineIndentation() > indentation; } [ \t]+ _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / FunctionIndent _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / FunctionIndent _ test:ConditionalExpression _ "=>" _ consequent:SwitchConsequentExpression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }

SwitchConsequentExpression
  = head:ChainedStatement tail:(BeforeComma "," CommaContinuationSpace ChainedStatement)+ {
      return [head, ...tail.map(t => t[3])].flatMap(flattenTransientStatement);
    }
  / statement:InlineLoopControlStatement {
      return [statement];
    }
  / statement:SingleAssignment {
      return [statement];
    }
  / head:Expression tail:(BeforeComma "," CommaContinuationSpace Expression)* {
      if (tail.length === 0) return head;
      return [head, ...tail.map(t => t[3])].map(expression => ({
        type: 'ExpressionStatement',
        expression,
        loc: loc()
      }));
    }

InlineLoopControlStatement
  = "break" !IdentifierPart {
      return { type: 'BreakStatement', loc: loc() };
    }
  / "continue" !IdentifierPart {
      return { type: 'ContinueStatement', loc: loc() };
    }

// Ternary: condition ? true : false
ConditionalExpression
  = test:OrExpression BeforeQuestion "?" OpSpace consequent:Expression BeforeColon ":" OpSpace alternate:Expression {
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
  = head:AndExpression tail:(BeforeOrOperator OrOperator OpSpace AndExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Logical AND
AndExpression
  = head:EqualityExpression tail:(BeforeAndOperator AndOperator OpSpace EqualityExpression)* {
      return buildBinaryExpr(head, tail);
    }

OrOperator
  = "or" !IdentifierPart { return "or"; }

AndOperator
  = "and" !IdentifierPart { return "and"; }

// Equality has lower precedence than relational comparisons in Pine v6.
EqualityExpression
  = head:RelationalExpression tail:(BeforeComparisonOperator EqualityOperator OpSpace RelationalExpression)* {
      return buildBinaryExpr(head, tail);
    }

EqualityOperator
  = "==" / "!="

RelationalExpression
  = head:BitwiseOrExpression tail:(BeforeComparisonOperator RelationalOperator OpSpace BitwiseOrExpression)* {
      return buildBinaryExpr(head, tail);
    }

RelationalOperator
  = "<=" / ">=" / "<" / ">"

ComparisonOperator
  = EqualityOperator / RelationalOperator

BitwiseOrExpression
  = head:BitwiseXorExpression tail:(BeforeBitwiseOrOperator "|" OpSpace BitwiseXorExpression)* {
      return buildBinaryExpr(head, tail);
    }

BitwiseXorExpression
  = head:BitwiseAndExpression tail:(BeforeBitwiseXorOperator "^" OpSpace BitwiseAndExpression)* {
      return buildBinaryExpr(head, tail);
    }

BitwiseAndExpression
  = head:ShiftExpression tail:(BeforeBitwiseAndOperator "&" OpSpace ShiftExpression)* {
      return buildBinaryExpr(head, tail);
    }

ShiftExpression
  = head:AdditiveExpression tail:(BeforeShiftOperator ("<<" / ">>") OpSpace AdditiveExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Addition/Subtraction
AdditiveExpression
  = head:MultiplicativeExpression tail:(BeforeAdditiveOperator ("+" / "-") OpSpace MultiplicativeExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Multiplication/Division/Modulo
MultiplicativeExpression
  = head:UnaryExpression tail:(BeforeMultiplicativeOperator ("*" / "/" / "%") OpSpace UnaryExpression)* {
      return buildBinaryExpr(head, tail);
    }

// Unary: -x, +x, not x
UnaryExpression
  = op:("-" / "+" / NotOperator) OpSpace arg:UnaryExpression {
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
      _ "(" __ args:ArgumentList? __ ")" { return { type: 'call', args: args || [] }; }
    / &(_ GenericTypeArguments _ "(") _ typeArguments:GenericTypeArguments { return { type: 'typeArgs', typeArguments }; }
    / PostfixContinuationSpace "." _ prop:IdentifierName { return { type: 'member', prop }; }
    / PostfixContinuationSpace "[" __ index:Expression __ "]" { return { type: 'index', index }; }
  )* {
      let pendingTypeArguments = null;
      return tail.reduce((obj, op) => {
        if (op.type === 'typeArgs') {
          pendingTypeArguments = op.typeArguments;
          return obj;
        }
        if (op.type === 'call') {
          const typeArguments = pendingTypeArguments;
          pendingTypeArguments = null;
          return {
            type: 'CallExpression',
            callee: obj,
            arguments: op.args,
            ...(typeArguments ? { typeArguments } : {}),
            loc: loc()
          };
        } else if (op.type === 'member') {
          pendingTypeArguments = null;
          return {
            type: 'MemberExpression',
            object: obj,
            property: { type: 'Identifier', name: op.prop, loc: loc() },
            loc: loc()
          };
        } else if (op.type === 'index') {
          pendingTypeArguments = null;
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

GenericTypeArguments
  = "<" __ first:TypeReferenceName rest:(__ "," __ TypeReferenceName)* __ ">" {
      return [first, ...rest.map(t => t[3])];
    }

// Lambda (anonymous function) expression: (params) => body
// Lookahead ensures we only try this when "( identifiers ) =>" is ahead.
LambdaLookahead
  = "(" _ IdentifierName (_ "," _ IdentifierName)* _ ")" _ "=>"

LambdaExpression
  = &LambdaLookahead "(" _ params:LambdaParams _ ")" _ "=>" _ body:ConditionalExpression {
      return {
        type: 'LambdaExpression',
        params,
        body,
        loc: loc()
      };
    }

LambdaParams
  = head:Identifier tail:(_ "," _ Identifier)* {
      return [head, ...tail.map(t => t[3])];
    }

// Primary expressions
PrimaryExpression
  = LambdaExpression
  / opens:("(" __)+ inner:Identifier closes:(")" _)+ &{ return opens.length === closes.length; } { return inner; }
  / "(" __ expr:Expression __ ")" { return expr; }
  / ArrayLiteral
  / NaFunctionIdentifier
  / NaLiteral
  / BooleanLiteral
  / ColorLiteral
  / StringLiteral
  / NumberLiteral
  / Identifier

NaFunctionIdentifier
  = "na" !IdentifierPart &(_ "(") {
      return { type: 'Identifier', name: 'na', loc: loc() };
    }

// Array literal
ArrayLiteral
  = "[" __ head:Expression? tail:(__ "," __ Expression)* __ "]" {
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
  = "#" hex:$([0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]([0-9a-fA-F][0-9a-fA-F])?) !IdentifierPart {
      return {
        type: 'ColorLiteral',
        value: '#' + hex,
        loc: loc()
      };
    }

StringLiteral
  = "\"\"\"" chars:TripleDoubleStringChar* "\"\"\"" {
      const value = chars.join('');
      return {
        type: 'StringLiteral',
        value,
        raw: '"""' + value + '"""',
        loc: loc()
      };
    }
  / '"' chars:DoubleStringChar* '"' {
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

TripleDoubleStringChar
  = !("\"\"\"") . { return text(); }

DoubleStringChar
  = !('"' / "\\" / LineTerminatorChar) . { return text(); }
  / LineTerminator chars:WhiteSpace* { return text(); }
  / "\\" seq:EscapeSequence { return seq; }

SingleStringChar
  = !("'" / "\\" / LineTerminatorChar) . { return text(); }
  / LineTerminator chars:WhiteSpace* { return text(); }
  / "\\" seq:EscapeSequence { return seq; }

EscapeSequence
  = "n" { return '\n'; }
  / "r" { return '\r'; }
  / "t" { return '\t'; }
  / "\\" { return '\\'; }
  / '"' { return '"'; }
  / "'" { return "'"; }
  / char:. { return '\\' + char; }

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
  / digits:$[0-9]+ exp:$([eE] [+-]? [0-9]+) {
      const raw = digits + exp;
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
  = $(IdentifierStart IdentifierContinue*)

IdentifierPart
  = IdentifierContinue

IdentifierStart
  = ch:. &{ return isIdentifierStart(ch); }

IdentifierContinue
  = ch:. &{ return isIdentifierPart(ch); }

// Reserved words - keywords that cannot be used as identifiers
// Note: Type names (int, float, bool, etc.) are NOT reserved since they're
// valid namespace prefixes like color.red, input.int(), math.abs, etc.
ReservedWord
  = ("if" / "else" / "for" / "while" / "break" / "continue" / "var" / "varip"
    / "true" / "false" / "na" / "and" / "or" / "not" / "to" / "by"
    / "switch" / "enum"
    / "library" / "import" / "export"
    ) !IdentifierPart

// ============================================================================
// Function Arguments
// ============================================================================

ArgumentList
  = head:Argument tail:(__ "," __ Argument)* (__ ",")? {
      return [head, ...tail.map(t => t[3])];
    }

Argument
  = name:ArgumentName __ "=" __ value:Expression {
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

ArgumentName
  = Identifier
  / name:ArgumentReservedName {
      return {
        type: 'Identifier',
        name,
        loc: loc()
      };
    }

ArgumentReservedName
  = ("to") !IdentifierPart { return text(); }

// ============================================================================
// Comments and Whitespace
// ============================================================================

Comment
  = SingleLineComment
  / MultiLineComment

SingleLineComment
  = LineCommentText LineTerminator?

LineCommentText
  = "//" (!LineTerminatorChar .)*

MultiLineComment
  = "/*" (!"*/" .)* "*/"

// Whitespace (no newlines - those are significant)
_
  = (WhiteSpace / MultiLineComment)*

// ContinuationLeadingSpace matches any non-empty leading whitespace on the next
// line, allowing 1-space continuations (e.g. input.text_area multiline defaults)
// without relaxing the block-level Indent rule.
ContinuationLeadingSpace
  = [ \t]+

BlankLine
  = WhiteSpace* LineTerminator

InitializerSpace
  = &( _ LineTerminator BlankLine* ContinuationLeadingSpace) _ LineTerminator BlankLine* ContinuationLeadingSpace (LineCommentText LineTerminator ContinuationLeadingSpace)* _
  / _

DeclarationEqualsSpace
  = &( _ LineTerminator ContinuationLeadingSpace "=") _ LineTerminator ContinuationLeadingSpace _
  / _

AssignEquals
  = "=" !"="

LoopHeaderContinuationSpace
  = InitializerSpace

IfConditionSpace
  = __

CommaContinuationSpace
  = __

BeforeComma
  = &(_ ",") _

// Delimited whitespace allows line continuations inside parentheses/brackets.
__
  = (WhiteSpace / MultiLineComment / LineTerminator)*

// Operator whitespace allows Pine line continuations around operators without
// making newlines generally insignificant between statements.
BeforeQuestion
  = &(__ "?") __

BeforeColon
  = &(__ ":") __

BeforeOrOperator
  = &(__ OrOperator) __

BeforeAndOperator
  = &(__ AndOperator) __

BeforeComparisonOperator
  = &(__ ComparisonOperator) __

BeforeAdditiveOperator
  = &(_ ("+" / "-")) _
  / &(__ "+") !{ return isBlockIndentedOperator(); } __
  / &(__ "-" !([0-9] / ".")) !{ return isBlockIndentedOperator(); } __

BeforeMultiplicativeOperator
  = &(__ ("*" / "/" / "%")) __

BeforeBitwiseOrOperator
  = &(__ "|") __

BeforeBitwiseXorOperator
  = &(__ "^") __

BeforeBitwiseAndOperator
  = &(__ "&") __

BeforeShiftOperator
  = &(__ ("<<" / ">>")) __
OpSpace
  = (WhiteSpace / MultiLineComment / LineTerminator)*

// Detects when a `[` at the start of the next line begins a tuple declaration
// rather than an index expression. Patterns: [id] = expr  or  [id, id] := expr
TuplePatternAhead
  = "[" __ IdentifierName (__ "," __ IdentifierName)* __ "]" _ ("=" !("=" / ">") / ":=")

// Cross-line continuation: allow `.` always, allow `[` only when it is NOT a
// tuple declaration on the next line. Same-line: consume horizontal whitespace.
PostfixContinuationSpace
  = &(_ LineTerminatorChar __ !TuplePatternAhead !SingleElementArrayStatementAhead "[") _ LineTerminatorChar __
  / &(_ LineTerminatorChar __ ".") _ LineTerminatorChar __
  / _

SingleElementArrayStatementAhead
  = "[" __ IdentifierName __ "]"

WhiteSpace
  = [ \t]

LineTerminator
  = (WhiteSpace* LineCommentText)? LineTerminatorChar+

LineTerminatorChar
  = [\n\r]
