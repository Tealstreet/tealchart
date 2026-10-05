import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { analyze } from './analyzer';
import { compile } from './compile';

const source = `//@version=6
indicator("Analyzer membership")
one(float x) => ta.ema(x, 2) + ta.ema(x, 3)
two(float x) => ta.ema(x, 4)
plain(float x) => x * 2
plot(one(close) + two(close) + plain(close))`;

describe('analyzer identity membership work', () => {
  it('recognizes actual TA descendants without serializing each TA target', () => {
    const ast = parse(source);
    const stringify = vi.spyOn(JSON, 'stringify');
    try {
      const result = analyze(ast);
      expect(result.unsupported).toEqual([]);
      expect(result.funcInfos.get('one')?.hasTACalls).toBe(true);
      expect(result.funcInfos.get('two')?.hasTACalls).toBe(true);
      expect(result.funcInfos.get('plain')?.hasTACalls).toBe(false);
      const bodies = new Set([...result.funcInfos.values()].map((info) => info.body));
      const targets = new Set(result.taCallSites.map((site) => site.node).filter((node) => !bodies.has(node)));
      expect(
        stringify.mock.calls.filter(([value]) => targets.has(value as (typeof result.taCallSites)[number]['node'])),
      ).toHaveLength(0);
    } finally {
      stringify.mockRestore();
    }
  });

  it('tracks series-name membership without serializing function bodies', () => {
    const ast = parse(`//@version=6
indicator("Series membership")
tracked = close
read() => tracked + 1
plain() => "tracked"
quoted() => '\"name\":\"tracked\"'
plot(tracked[1] + read())`);
    const stringify = vi.spyOn(JSON, 'stringify');
    try {
      const result = analyze(ast);
      expect(result.unsupported).toEqual([]);
      expect(result.seriesVars.has('tracked')).toBe(true);
      expect(result.funcInfos.get('read')?.hasSeriesVars).toBe(true);
      expect(result.funcInfos.get('plain')?.hasSeriesVars).toBe(false);
      expect(result.funcInfos.get('quoted')?.hasSeriesVars).toBe(false);
      const bodies = new Set<object>([...result.funcInfos.values()].map((info) => info.body));
      expect(stringify.mock.calls.filter(([value]) => bodies.has(value as object))).toHaveLength(0);
    } finally {
      stringify.mockRestore();
    }
  });

  it('retains the existing generic member-name match for series access', () => {
    const result = analyze(
      parse(`//@version=6
indicator("Member names")
type Record
    float tracked
tracked = close
record = Record.new(close)
field() => record.tracked
plot(tracked[1] + field())`),
    );
    expect(result.unsupported).toEqual([]);
    expect(result.seriesVars.has('tracked')).toBe(true);
    expect(result.funcInfos.get('field')?.hasSeriesVars).toBe(true);
  });

  it('ignores non-index array metadata as the prior JSON membership did', () => {
    const ast = parse(`//@version=6
indicator("Array metadata")
tracked = close
plain() =>
    local = 2
    local
plot(tracked[1] + plain())`);
    const declaration = ast.body.find((s) => s.type === 'FunctionDeclaration');
    if (declaration?.type !== 'FunctionDeclaration' || !Array.isArray(declaration.body))
      throw new Error('Missing block');
    Object.assign(declaration.body, { name: 'tracked' });
    const result = analyze(ast);
    expect(result.unsupported).toEqual([]);
    expect(result.seriesVars.has('tracked')).toBe(true);
    expect(result.funcInfos.get('plain')?.hasSeriesVars).toBe(false);
  });

  it('retains a negative function membership result', () => {
    const result = analyze(parse(source));
    expect(result.funcInfos.get('plain')?.hasTACalls).toBe(false);
    expect(result.funcInfos.get('one')?.hasTACalls).toBe(true);
  });

  it('retains structural membership when a caller supplies cloned body views', () => {
    const ast = parse(source);
    const declaration = ast.body.find((s) => s.type === 'FunctionDeclaration');
    if (declaration?.type !== 'FunctionDeclaration') throw new Error('Missing function');
    const body = declaration.body;
    Object.defineProperty(declaration, 'body', { enumerable: true, get: () => structuredClone(body) });
    const result = analyze(ast);
    expect(result.unsupported).toEqual([]);
    expect(result.funcInfos.get('one')?.hasTACalls).toBe(true);
    expect(result.funcInfos.get('plain')?.hasTACalls).toBe(false);
    expect(result.funcInfos.get('one')?.body).not.toBe(declaration.body);
  });

  it('does not equate different calls that share source coordinates', () => {
    const ast = parse(`//@version=6
indicator("Position collision", dynamic_requests=true)
f(float x) => request.security("BINANCE:BTCUSDT", "D", ta.ema(x, 2))
g(float x) => ta.ema(x, 12)
plot(f(close) + g(close))`);
    const f = ast.body.find((s) => s.type === 'FunctionDeclaration' && s.name.name === 'f');
    const g = ast.body.find((s) => s.type === 'FunctionDeclaration' && s.name.name === 'g');
    if (
      f?.type !== 'FunctionDeclaration' ||
      g?.type !== 'FunctionDeclaration' ||
      Array.isArray(f.body) ||
      f.body.type !== 'CallExpression' ||
      Array.isArray(g.body) ||
      g.body.type !== 'CallExpression'
    )
      throw new Error('Missing calls');
    const nested = f.body.arguments[2].value;
    expect(nested.type).toBe('CallExpression');
    g.body.loc = structuredClone(nested.loc);
    const result = analyze(ast);
    expect(result.unsupported).toEqual([]);
    expect(result.funcInfos.get('f')?.hasTACalls).toBe(false);
    expect(result.funcInfos.get('g')?.hasTACalls).toBe(true);
  });

  it('retains cloned structural matching without source locations', () => {
    const ast = parse(source);
    const stripLocations = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      delete (value as { loc?: unknown }).loc;
      for (const child of Object.values(value)) stripLocations(child);
    };
    stripLocations(ast);
    const declaration = ast.body.find((s) => s.type === 'FunctionDeclaration');
    if (declaration?.type !== 'FunctionDeclaration') throw new Error('Missing function');
    const body = declaration.body;
    Object.defineProperty(declaration, 'body', { enumerable: true, get: () => structuredClone(body) });
    const result = analyze(ast);
    expect(result.unsupported).toEqual([]);
    expect(result.funcInfos.get('one')?.hasTACalls).toBe(true);
  });

  it('rebuilds the index when a previously analyzed AST is changed', () => {
    const ast = parse(source);
    const before = compile(ast);
    expect(before.success).toBe(true);
    const changed = parse(source.replace('ta.ema(x, 2)', 'ta.ema(x, 12)'));
    const original = ast.body.find((s) => s.type === 'FunctionDeclaration');
    const replacement = changed.body.find((s) => s.type === 'FunctionDeclaration');
    if (original?.type !== 'FunctionDeclaration' || replacement?.type !== 'FunctionDeclaration')
      throw new Error('Missing function');
    original.body = replacement.body;
    const after = compile(ast);
    expect(after.success).toBe(true);
    expect(after.generatedCode).not.toBe(before.generatedCode);
    expect(after.generatedCode).toBe(compile(changed).generatedCode);
  });
});
