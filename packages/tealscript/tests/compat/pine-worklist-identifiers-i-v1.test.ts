import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

// https://www.tradingview.com/pine-script-reference/v6/: reference context only; no identifier grammar entry.
// https://www.tradingview.com/pine-script-docs/language/identifiers/ supplies the three identifier clauses.
describe('I identifier clauses', () => {
  it('rank1662: admits each ASCII letter and underscore at the start', () => {
    for (const initial of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_') {
      expect(() => parse(`${initial}slot`, { startRule: 'Expression' })).not.toThrow();
      expect(parse(`${initial}slot`, { startRule: 'Expression' })).toMatchObject({
        type: 'Identifier',
        name: `${initial}slot`,
      });
    }
  });

  it('rank1663: retains letters digits and underscore after the first character', () => {
    for (const suffix of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_') {
      expect(() => parse(`slot${suffix}`, { startRule: 'Expression' })).not.toThrow();
      expect(parse(`slot${suffix}`, { startRule: 'Expression' })).toMatchObject({
        type: 'Identifier',
        name: `slot${suffix}`,
      });
    }
  });

  it('rank1664: resolves differently cased declarations independently', () => {
    const program = parse('//@version=6\nindicator("Case")\nValue = 7\nvalue = 19\nplot(Value)\nplot(value)');
    expect(checkProgram(program).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeCompiled(tryCompile(program), [
      { time: 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ]);
    expect(result?.plots.map((plot) => plot.values)).toEqual([[7], [19]]);
  });
});
