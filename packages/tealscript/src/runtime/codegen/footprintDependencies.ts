import type { CallExpression, Expression, Identifier, Program, Statement } from '../../parser/ast';
import type { AnalysisContext } from './analyzer';

function children(node: object): object[] {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'loc') return [];
    return (Array.isArray(value) ? value : [value]).filter((child) => child && typeof child === 'object');
  });
}

function declarationNames(statement: Statement): string[] {
  if (statement.type !== 'VariableDeclaration') return [];
  return statement.names.type === 'VariableDeclarator'
    ? [statement.names.name.name]
    : statement.names.names.map((name) => name.name);
}

function callName(call: CallExpression): string | undefined {
  const callee = call.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return `${callee.object.name}.${callee.property.name}`;
  }
  return undefined;
}

export function discardedFootprintCalls(ast: Program, analysis: AnalysisContext): Set<Expression> {
  const functions = analysis.funcInfos;
  const isBuiltinFootprint = (call: CallExpression) => callName(call) === 'request.footprint'
    && !analysis.resolvedUserFunctionCalls.has(call);
  const hasFootprint = (node: object): boolean => {
    if ('type' in node && node.type === 'CallExpression' && isBuiltinFootprint(node as CallExpression)) return true;
    return children(node).some(hasFootprint);
  };
  if (!hasFootprint(ast) && ![...functions.values()].some((fn) =>
    (Array.isArray(fn.body) ? fn.body : [fn.body]).some(hasFootprint))) return new Set();
  const functionName = (call: CallExpression) => analysis.resolvedUserFunctionCalls.get(call) ?? callName(call);
  const globalInitializers = new Map(ast.body.flatMap((statement) => statement.type === 'VariableDeclaration'
    ? declarationNames(statement).map((name) => [name, statement.init] as const) : []));
  const dependsOnFootprint = (node: object, visiting = new Set<object>()): boolean => {
    if (visiting.has(node)) return false;
    const next = new Set(visiting).add(node);
    if ('type' in node && node.type === 'Identifier') {
      const init = globalInitializers.get((node as Identifier).name);
      return init ? dependsOnFootprint(init, next) : false;
    }
    if ('type' in node && node.type === 'CallExpression') {
      const call = node as CallExpression;
      if (isBuiltinFootprint(call)) return true;
      const name = functionName(call);
      const fn = name && functions.get(name);
      if (fn && (Array.isArray(fn.body) ? fn.body : [fn.body]).some((body) => dependsOnFootprint(body, next))) return true;
    }
    return children(node).some((child) => dependsOnFootprint(child, next));
  };
  const securitySites = new Map(analysis.securitySites.map((site) => [site.node, site]));
  const footprintCalls = (node: object): CallExpression[] => {
    if ('type' in node && node.type === 'CallExpression') {
      const call = node as CallExpression;
      const site = securitySites.get(call);
      if (isBuiltinFootprint(call) || (site && dependsOnFootprint(site.expressionExpr))) return [call];
    }
    return children(node).flatMap(footprintCalls);
  };
  const candidates = ast.body.filter((statement) => statement.type === 'VariableDeclaration'
    && statement.init.type !== 'IfStatement' && footprintCalls(statement.init).length > 0);
  if (candidates.length === 0) return new Set();

  // Requested expressions are compiled independently; their chart copies are not outputs.
  const requestedExpressions = new Set<object>(analysis.securitySites.map((site) => site.expressionExpr));
  const references = (node: object, visiting = new Set<string>()): Set<string> => {
    if (requestedExpressions.has(node)) return new Set();
    if ('type' in node && node.type === 'Identifier') return new Set([(node as Identifier).name]);
    if ('type' in node && node.type === 'MemberExpression') {
      return references((node as Extract<Expression, { type: 'MemberExpression' }>).object, visiting);
    }
    if ('type' in node && node.type === 'VariableDeclaration') {
      return references((node as Extract<Statement, { type: 'VariableDeclaration' }>).init, visiting);
    }
    const result = new Set<string>();
    if ('type' in node && node.type === 'CallExpression') {
      const name = functionName(node as CallExpression);
      const fn = name && functions.get(name);
      if (name && fn && !visiting.has(name)) {
        const next = new Set(visiting).add(name);
        const body = Array.isArray(fn.body) ? fn.body : [fn.body];
        const locals = new Set(fn.params);
        for (const item of body) {
          if ('type' in item && item.type === 'VariableDeclaration') {
            for (const local of declarationNames(item)) locals.add(local);
          }
        }
        for (const item of body) for (const ref of references(item, next)) if (!locals.has(ref)) result.add(ref);
      }
    }
    for (const child of children(node)) for (const ref of references(child, visiting)) result.add(ref);
    return result;
  };
  const hasOutput = (node: object, visiting = new Set<string>()): boolean => {
    if ('type' in node && node.type === 'CallExpression') {
      const call = node as CallExpression;
      const name = callName(call) ?? '';
      if (/^(plot|plotarrow|plotbar|plotcandle|plotchar|plotshape|hline|fill|bgcolor|barcolor|alert|alertcondition)$/.test(name)
        || /^(line|label|box|table|polyline|linefill)\.(new|copy|delete|set_)/.test(name)
        || /^(strategy|log)\./.test(name)) return true;
      const resolved = functionName(call);
      const fn = resolved && functions.get(resolved);
      if (resolved && fn && !visiting.has(resolved)) {
        const next = new Set(visiting).add(resolved);
        if ((Array.isArray(fn.body) ? fn.body : [fn.body]).some((item) => hasOutput(item, next))) return true;
      }
    }
    return children(node).some((child) => hasOutput(child, visiting));
  };
  const needed = new Set<string>();
  const selected = new Set<Statement>();
  for (const statement of ast.body) {
    if (statement.type === 'FunctionDeclaration') continue;
    if (statement.type === 'VariableDeclaration' && !hasOutput(statement.init)) continue;
    selected.add(statement);
    for (const ref of references(statement)) needed.add(ref);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const statement of ast.body) {
      if (selected.has(statement) || !declarationNames(statement).some((name) => needed.has(name))) continue;
      selected.add(statement);
      for (const ref of references(statement)) needed.add(ref);
      changed = true;
    }
  }
  return new Set(candidates.flatMap((statement) => statement.type === 'VariableDeclaration'
    && statement.init.type !== 'IfStatement' && !selected.has(statement) ? footprintCalls(statement.init) : []));
}
