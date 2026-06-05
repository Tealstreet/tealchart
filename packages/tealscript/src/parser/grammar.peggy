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
  / LibraryDeclaration
  / ImportDeclaration
  / TypeDeclaration
  / EnumDeclaration
  / MethodDeclaration
  / FunctionDeclaration
  / IfStatement
  / ForStatement
  / WhileStatement
  / BreakStatement
  / ContinueStatement
  / VariableDeclaration
  / AssignmentStatement
  / ExpressionStatement
  / EmptyStatement

EmptyStatement
  = LineTerminator { return null; }
  / Comment { return null; }

// indicator("title", ...) / strategy("title", ...)
IndicatorDeclaration
  = declarationKind:("indicator" / "strategy") _ "(" __ args:ArgumentList __ ")" _ LineTerminator? {
      const result = {
        type: 'IndicatorDeclaration',
        declarationKind,
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
        'use_bar_magnifier'
      ];
      for (const arg of args) {
        if (arg.name) {
          result[arg.name.name] = arg.value;
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
        }
      }

      return result;
    }

ImportDeclaration
  = "import" !IdentifierPart _ path:ImportPath _ "as" !IdentifierPart _ alias:Identifier _ LineTerminator? {
      return {
        type: 'ImportDeclaration',
        path,
        alias,
        loc: loc()
      };
    }

ImportPath
  = parts:$(IdentifierName ("/" [a-zA-Z0-9_]+)+) {
      return parts;
    }

// User-defined type:
// type pivotPoint
//     int x
//     float y
//     string xloc = xloc.bar_time
TypeDeclaration
  = exported:("export" _)? "type" !IdentifierPart _ name:Identifier _ LineTerminator fields:TypeIndentedBlock {
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
  = varip:("varip" !IdentifierPart _)? type:TypeAnnotation _ name:Identifier defaultValue:(_ "=" _ Expression)? _ LineTerminator? {
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
  = varip:("varip" !IdentifierPart _)? name:Identifier defaultValue:(_ "=" _ Expression)? _ LineTerminator? {
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
  = exported:("export" _)? "enum" !IdentifierPart _ name:Identifier _ LineTerminator fields:EnumIndentedBlock {
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
MethodDeclaration
  = exported:("export" _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* __ ")" _ "=>" _ LineTerminator body:FunctionIndentedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body,
        isMethod: true,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" _)? "method" !IdentifierPart _ name:Identifier _ "(" __ first:TypedParameter rest:(__ "," __ Parameter)* __ ")" _ "=>" _ body:Expression _ LineTerminator? {
      return {
        type: 'FunctionDeclaration',
        name,
        params: [first, ...rest.map(t => t[3])],
        body,
        isMethod: true,
        exported: !!exported,
        loc: loc()
      };
    }

// User-defined function: f(x, y) => x + y
FunctionDeclaration
  = exported:("export" _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ LineTerminator body:FunctionIndentedBlock {
      return {
        type: 'FunctionDeclaration',
        name,
        params: params || [],
        body,
        exported: !!exported,
        loc: loc()
      };
    }
  / exported:("export" _)? name:Identifier _ "(" __ params:ParameterList? __ ")" _ "=>" _ body:Expression _ LineTerminator? {
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
  = head:Parameter tail:(__ "," __ Parameter)* {
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
VariableDeclaration
  = TypedVariableDeclaration
  / UntypedVariableDeclaration

TypedVariableDeclaration
  = exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:VariableInitializer _ LineTerminator? {
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

UntypedVariableDeclaration
  = exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:VariableInitializer _ LineTerminator? {
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
  / "matrix" !IdentifierPart _ "<" __ elementType:TypeReferenceName __ ">" {
      return formatTemplateType('matrix', [elementType]);
    }
  / "map" !IdentifierPart _ "<" __ keyType:TypeReferenceName __ "," __ valueType:TypeReferenceName __ ">" {
      return formatTemplateType('map', [keyType, valueType]);
    }
  / TypeName

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
  = "for" _ counter:CollectionForCounter _ "in" _ iterable:Expression _ LineTerminator body:IndentedBlock {
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
  / "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:IndentedBlock {
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
  / valueCounter:Identifier {
      return { valueCounter };
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
  = "break" !IdentifierPart _ LineTerminator? {
      return { type: 'BreakStatement', loc: loc() };
    }

ContinueStatement
  = "continue" !IdentifierPart _ LineTerminator? {
      return { type: 'ContinueStatement', loc: loc() };
    }

// Indented block (simplified: just look for indented lines)
IndentedBlock
  = statements:(BlockIgnorableLine / IndentedStatement)+ {
      return statements.filter(s => s !== null);
    }

IndentedStatement
  = &Indent Indent stmt:Statement {
      return stmt;
    }

FunctionIndentedBlock
  = statements:(BlockIgnorableLine / FunctionIndentedStatement)+ {
      return statements.filter(s => s !== null);
    }

FunctionIndentedStatement
  = &FunctionIndent FunctionIndent stmt:(FunctionIfStatement / FunctionForStatement / FunctionWhileStatement / FunctionVariableDeclaration / Statement) {
      return stmt;
    }

FunctionIfStatement
  = "if" _ test:Expression _ LineTerminator consequent:FunctionNestedBlock alternate:FunctionElseClause? {
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

FunctionElseClause
  = FunctionElseIndent "else" _ "if" _ test:Expression _ LineTerminator consequent:FunctionNestedBlock alternate:FunctionElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionElseIndent "else" _ LineTerminator? block:FunctionNestedBlock {
      return block;
    }

FunctionForStatement
  = "for" _ counter:CollectionForCounter _ "in" _ iterable:Expression _ LineTerminator body:FunctionNestedBlock {
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
  / "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:FunctionNestedBlock {
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
  = "while" _ test:Expression _ LineTerminator body:FunctionNestedBlock {
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
  = exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:FunctionIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

UntypedFunctionVariableDeclaration
  = exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:FunctionIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

FunctionNestedBlock
  = statements:(BlockIgnorableLine / FunctionNestedStatement)+ {
      return statements.filter(s => s !== null);
    }

FunctionNestedStatement
  = &FunctionNestedIndent FunctionNestedIndent stmt:(FunctionNestedIfStatement / FunctionNestedForStatement / FunctionNestedWhileStatement / FunctionNestedVariableDeclaration / Statement) {
      return stmt;
    }

FunctionNestedIfStatement
  = "if" _ test:Expression _ LineTerminator consequent:FunctionDeepNestedBlock alternate:FunctionNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionNestedElseClause
  = FunctionNestedIndent "else" _ "if" _ test:Expression _ LineTerminator consequent:FunctionDeepNestedBlock alternate:FunctionNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionNestedIndent "else" _ LineTerminator? block:FunctionDeepNestedBlock {
      return block;
    }

FunctionNestedForStatement
  = "for" _ counter:CollectionForCounter _ "in" _ iterable:Expression _ LineTerminator body:FunctionDeepNestedBlock {
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
  / "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:FunctionDeepNestedBlock {
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
  = "while" _ test:Expression _ LineTerminator body:FunctionDeepNestedBlock {
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
  = exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:FunctionNestedIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

UntypedFunctionNestedVariableDeclaration
  = exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:FunctionNestedIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

FunctionDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionDeepNestedStatement)+ {
      return statements.filter(s => s !== null);
    }

FunctionDeepNestedStatement
  = &FunctionDeepNestedIndent FunctionDeepNestedIndent stmt:(FunctionDeepNestedIfStatement / FunctionDeepNestedForStatement / FunctionDeepNestedWhileStatement / FunctionDeepNestedVariableDeclaration / Statement) {
      return stmt;
    }

FunctionDeepNestedIfStatement
  = "if" _ test:Expression _ LineTerminator consequent:FunctionVeryDeepNestedBlock alternate:FunctionDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }

FunctionDeepNestedElseClause
  = FunctionDeepNestedIndent "else" _ "if" _ test:Expression _ LineTerminator consequent:FunctionVeryDeepNestedBlock alternate:FunctionDeepNestedElseClause? {
      return {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
        loc: loc()
      };
    }
  / FunctionDeepNestedIndent "else" _ LineTerminator? block:FunctionVeryDeepNestedBlock {
      return block;
    }

FunctionDeepNestedForStatement
  = "for" _ counter:CollectionForCounter _ "in" _ iterable:Expression _ LineTerminator body:FunctionVeryDeepNestedBlock {
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
  / "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:FunctionVeryDeepNestedBlock {
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
  = "while" _ test:Expression _ LineTerminator body:FunctionVeryDeepNestedBlock {
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
  = exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:FunctionDeepNestedIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ type:TypeAnnotation _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

UntypedFunctionDeepNestedVariableDeclaration
  = exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:FunctionDeepNestedIfStatement {
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
  / exported:("export" _)? kind:VarKind? _ pattern:DeclarationPattern _ "=" _ init:Expression _ LineTerminator? {
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

FunctionVeryDeepNestedBlock
  = statements:(BlockIgnorableLine / FunctionVeryDeepNestedStatement)+ {
      return statements.filter(s => s !== null);
    }

FunctionVeryDeepNestedStatement
  = &FunctionVeryDeepNestedIndent FunctionVeryDeepNestedIndent stmt:Statement {
      return stmt;
    }

FunctionIndent
  = "    "
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

SingleLineBody
  = stmt:(VariableDeclaration / AssignmentStatement / ExpressionStatement / BreakStatement / ContinueStatement) {
      return stmt;
    }

Indent
  = "    " // 4 spaces
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
  = "switch" !IdentifierPart _ discriminant:ConditionalExpression? _ LineTerminator cases:SwitchCase+ {
      return {
        type: 'SwitchExpression',
        discriminant: discriminant || null,
        cases,
        loc: loc()
      };
    }

CollectionForExpression
  = "for" _ counter:CollectionForCounter _ "in" _ iterable:Expression _ LineTerminator body:IndentedBlock {
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
  = "for" _ counter:Identifier _ "=" _ start:Expression _ "to" _ end:Expression step:(_ "by" _ Expression)? _ LineTerminator body:IndentedBlock {
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
  = "while" _ test:Expression _ LineTerminator body:IndentedBlock {
      return {
        type: 'WhileStatement',
        test,
        body,
        loc: loc()
      };
    }

SwitchCase
  = Indent _ "=>" _ LineTerminator consequent:FunctionNestedBlock {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / Indent _ test:ConditionalExpression _ "=>" _ LineTerminator consequent:FunctionNestedBlock {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
    }
  / Indent _ "=>" _ consequent:Expression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test: null,
        consequent,
        loc: loc()
      };
    }
  / Indent _ test:ConditionalExpression _ "=>" _ consequent:Expression _ LineTerminator? {
      return {
        type: 'SwitchCase',
        test,
        consequent,
        loc: loc()
      };
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
  = head:ComparisonExpression tail:(BeforeAndOperator AndOperator OpSpace ComparisonExpression)* {
      return buildBinaryExpr(head, tail);
    }

OrOperator
  = "or" !IdentifierPart { return "or"; }

AndOperator
  = "and" !IdentifierPart { return "and"; }

// Comparison: ==, !=, <, >, <=, >=
ComparisonExpression
  = head:AdditiveExpression tail:(BeforeComparisonOperator ComparisonOperator OpSpace AdditiveExpression)* {
      return buildBinaryExpr(head, tail);
    }

ComparisonOperator
  = "==" / "!=" / "<=" / ">=" / "<" / ">"

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
    / _ typeArguments:GenericTypeArguments { return { type: 'typeArgs', typeArguments }; }
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

// Primary expressions
PrimaryExpression
  = "(" __ expr:Expression __ ")" { return expr; }
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
    / "switch" / "type" / "method" / "enum"
    / "indicator" / "library" / "import" / "export"
    ) !IdentifierPart

// ============================================================================
// Function Arguments
// ============================================================================

ArgumentList
  = head:Argument tail:(__ "," __ Argument)* {
      return [head, ...tail.map(t => t[3])];
    }

Argument
  = name:Identifier __ "=" __ value:Expression {
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
  / &(__ "+") __
  / &(__ "-" !([0-9] / ".")) __

BeforeMultiplicativeOperator
  = &(__ ("*" / "/" / "%")) __

OpSpace
  = (WhiteSpace / MultiLineComment / LineTerminator)*

PostfixContinuationSpace
  = &( __ ("." / "[")) __
  / _

WhiteSpace
  = [ \t]

LineTerminator
  = SingleLineComment? LineTerminatorChar+

LineTerminatorChar
  = [\n\r]
