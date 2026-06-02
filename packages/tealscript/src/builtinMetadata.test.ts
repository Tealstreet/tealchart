import {
  BUILTIN_NAMESPACES,
  EXPORTABLE_BUILTIN_CONSTANTS,
} from './builtinMetadata';

describe('builtin metadata', () => {
  it('recognizes exportable constant roots as builtin namespaces', () => {
    const roots = new Set([...EXPORTABLE_BUILTIN_CONSTANTS].map((name) => name.split('.')[0]));
    expect(roots.size).toBeGreaterThan(0);

    for (const root of roots) {
      expect(BUILTIN_NAMESPACES.has(root)).toBe(true);
    }
  });
});
