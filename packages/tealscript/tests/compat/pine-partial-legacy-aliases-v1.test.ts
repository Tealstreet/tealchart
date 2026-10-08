import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = [7, 11, 3].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

// https://www.tradingview.com/pine-script-reference/v6/: bar_index and input.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
// V4 renamed n to bar_index and integer to input.integer.
describe('PARTIAL legacy alias boundaries', () => {
  it('publishes the v3 n index and v4 bar_index index with a v4 n refusal, rank1887', () => {
    for (const [version, name] of [
      [3, 'n'],
      [4, 'bar_index'],
    ] as const) {
      const source = `//@version=${version}\nstudy("Index")\nplot(${name})`;
      expect(errors(source)).toEqual([]);
      expect(executeCompiled(tryCompile(parse(source)), bars)!.plots[0]!.values).toEqual([0, 1, 2]);
    }
    expect(errors('//@version=4\nstudy("Index")\nplot(n)').length).toBeGreaterThan(0);
  });

  // Frozen reference entries[511]/[518] anchors input defaults; the v4 migration above settles the rename.
  it('retains integer input defaults on both sides of the v4 input.integer rename, rank1891', () => {
    for (const [version, kind] of [
      [3, 'integer'],
      [4, 'input.integer'],
    ] as const) {
      const source = `//@version=${version}\nstudy("Integer input")\nvalue = input(7, type=${kind})\nplot(value)`;
      expect(errors(source)).toEqual([]);
      const result = executeCompiled(tryCompile(parse(source)), bars);
      expect(result!.plots[0]!.values).toEqual([7, 7, 7]);
      expect(result!.inputs[0]?.type).toBe('int');
    }
  });
});
