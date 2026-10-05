import { describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser';
import { analyze } from './analyzer';
import { emit } from './emitter';

const source = `//@version=6
indicator("Location walk")
f(float x) => ta.ema(x, 2) + ta.ema(x, 3)
plot(f(close)[1])`;

describe('emission source-location traversal', () => {
  it('retains diagnostic locations without visiting their coordinates in semantic walks', () => {
    const ast = parse(source);
    const analysis = analyze(ast);
    const coordinates = new Set<object>();
    const collect = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const node = value as { loc?: { start: object; end: object } };
      if (node.loc) { coordinates.add(node.loc.start); coordinates.add(node.loc.end); }
      for (const [key, child] of Object.entries(value)) if (key !== 'loc') collect(child);
    };
    collect(ast);
    expect(coordinates.size).toBeGreaterThan(0);
    const locations = JSON.stringify(ast);
    const expected = emit(ast, analysis);
    const values = vi.spyOn(Object, 'values');
    const keys = vi.spyOn(Object, 'keys');
    try {
      expect(emit(ast, analysis)).toBe(expected);
      expect([...values.mock.calls, ...keys.mock.calls]
        .filter(([value]) => coordinates.has(value as object))).toHaveLength(0);
    } finally { values.mockRestore(); keys.mockRestore(); }
    expect(JSON.stringify(ast)).toBe(locations);
  });
});
