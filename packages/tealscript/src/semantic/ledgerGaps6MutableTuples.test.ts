import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// v6 migration: mutable variables are always series. Tuple return qualification
// and per-binding mutability are separate; immutable siblings stay simple.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#mutable-variables-are-always-series
function check(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("Mutable tuple")\n${body}`));
}

describe('ledger gaps 6: reassigned tuple scalar qualifiers', () => {
  const returnedTuple = 'parameters() => [3, 0]\n[length, unused] = parameters()';
  const conditionalTuple = '[length, unused] = if true\n    [3, 0]\nelse\n    [4, 0]';
  for (const [name, body] of [
    ['returned tuple', `${returnedTuple}\nlength := 4\nplot(ta.ema(close, length))`],
    ['assignment after consumer', `${returnedTuple}\nplot(ta.ema(close, length))\nlength := 4`],
    ['conditional tuple with compound assignment', `${conditionalTuple}\nlength += 1\nplot(ta.ema(close, length))`],
    ['conditional reassignment', `${returnedTuple}\nif close > open\n    length := 4\nplot(ta.ema(close, length))`],
  ]) {
    it(`marks the mutable ${name} binding series before consumers`, () => {
      const result = check(body);
      expect(result.symbols.find((symbol) => symbol.name === 'length')?.type).toEqual({
        kind: 'int',
        qualifier: 'series',
      });
      expect(result.symbols.find((symbol) => symbol.name === 'unused')?.type).toEqual({
        kind: 'int',
        qualifier: 'simple',
      });
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining("'length' for ta.ema"),
        }),
      ]);
    });
  }

  it('propagates mutable UDF-local tuple bindings through return inference', () => {
    const result = check(`getLength() =>
    [length, unused] = if true
        [3, 0]
    else
        [4, 0]
    length += 1
    length
length = getLength()
plot(ta.ema(close, length))`);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type).toEqual({
      kind: 'int',
      qualifier: 'series',
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("'length' for ta.ema") }),
    ]);
  });

  it('keeps unmodified tuple bindings usable as simple lengths', () => {
    const result = check(`${returnedTuple}\nplot(ta.ema(close, length))`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.qualifier).toBe('simple');
  });

  it('keeps an immutable sibling usable after another tuple binding is reassigned', () => {
    const result = check(
      'parameters() => [3, 5]\n[length, other] = parameters()\nlength := 4\nplot(ta.ema(close, other))',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'other')?.type?.qualifier).toBe('simple');
  });

  it('resolves tuple bindings independently from a shadowing inner declaration', () => {
    const result = check(`${returnedTuple}
if close > open
    length = 4
    length += 1
plot(ta.ema(close, length))`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.qualifier).toBe('simple');
  });

  it('preserves the v5 mutable-constant migration control', () => {
    expect(check(`${returnedTuple}\nlength := 4\nplot(ta.ema(close, length))`, 5).diagnostics).toEqual([]);
  });
});
