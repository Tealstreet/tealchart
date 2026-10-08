import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = [7, -3, 11].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-3/#forward-referenced-variables-are-removed
// A variable referenced before its declaration produces an undeclared-identifier error.
describe('forward variable declaration boundary', () => {
  for (const version of [3, 4, 5, 6]) {
    const prefix = `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Variable order")\n`;
    it(`refuses a forward variable reference in v${version}`, () => {
      expect(errors(`${prefix}plot(value)\nvalue = close`)).toEqual([
        expect.objectContaining({ code: 'unknown-identifier', message: 'Unknown identifier: value' }),
      ]);
    });

    it(`publishes the declared variable on each bar in v${version}`, () => {
      const source = `${prefix}value = close\nplot(value)`;
      expect(errors(source)).toEqual([]);
      const compiled = tryCompile(parse(source));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, bars)!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0].values).toEqual([7, -3, 11]);
    });
  }
});
