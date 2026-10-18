import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { transformNativeWorklet } from './transformNativeWorklet';

function compileFixture(source: string, extension: 'ts' | 'tsx') {
  const directory = mkdtempSync(join(tmpdir(), 'tealchart-worklet-'));
  const filename = join(directory, `fixture.${extension}`);
  try {
    writeFileSync(filename, source);
    return transformNativeWorklet(source, filename);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('native worklet TypeScript erasure', () => {
  it('executes generic calls, constructors, optional calls, tags and inheritance', () => {
    const code = compileFixture(`
      function identity<T>(value: T): T { return value; }
      function tag<T>(parts: TemplateStringsArray, value: T) { return parts[0] + value; }
      class Base<T> { constructor(public value: T) {} }
      class Derived extends Base<number> {}
      const optional: typeof identity | undefined = identity;
      export const values = [
        identity<number>(7), optional?.<number>(8),
        new Map<string, number>([['key', 9]]).get('key'),
        tag<number>\`v\${10}\`, new Derived(11).value,
      ];
      export function read(value: number): number {
        'worklet';
        return new Set<number>([value]).size;
      }
    `, 'ts');
    const exports: { values?: unknown; read?: { __initData: { code: string }; __closure: unknown } } = {};
    new Function('exports', code)(exports);
    expect(exports.values).toEqual([7, 8, 9, 'v10', 11]);
    expect(exports.read?.__initData).toBeDefined();
    const onUI = new Function(`return (${exports.read!.__initData.code})`)();
    expect(onUI.call({ __closure: exports.read!.__closure }, 42)).toBe(1);
  });

  it('erases generic JSX arguments while preserving the JSX runtime transform', () => {
    const code = compileFixture(`
      function Box<T>({ value }: { value: T }) { return value; }
      export const view = <Box<number> value={17} />;
    `, 'tsx');
    const exports: Record<string, unknown> = {};
    new Function('require', 'exports', code)((name: string) => {
      expect(name).toBe('react/jsx-runtime');
      return { jsx: (component: (props: unknown) => unknown, props: unknown) => component(props) };
    }, exports);
    expect(exports.view).toBe(17);
  });
});
