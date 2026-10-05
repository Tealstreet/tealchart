import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Literal contracts from the TradingView type-system tuple documentation and
// ta.sma reference; ledger-gaps-v1 ranks 206/207/214/219/235/236.
// https://www.tradingview.com/pine-script-docs/language/type-system/#tuples
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma
function check(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("Ledger gaps 6")\n${body}`));
}

describe('ledger gaps 6: returned tuple qualifiers', () => {
  it.each([5, 6])('raises literal and input members to simple in v%i (207)', (version) => {
    const result = check(
      `count = input.int(3, "Count")
parameters() => ["ticker", count]
[ticker, length] = parameters()
plot(length)`,
      version,
    );
    expect(result.diagnostics).toEqual([]);
    for (const name of ['ticker', 'length']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.qualifier).toBe('simple');
    }
  });

  it.each([5, 6])('shares series with every returned member in v%i (219)', (version) => {
    const result = check(
      `parameters() => [close, 3, "ticker"]
[source, length, ticker] = parameters()
plot(source)`,
      version,
    );
    expect(result.diagnostics).toEqual([]);
    for (const name of ['source', 'length', 'ticker']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.qualifier).toBe('series');
    }
  });

  it('refuses the series tuple length at a simple-only consumer (219)', () => {
    const result = check(`parameters() => [close, 3]
[source, length] = parameters()
plot(ta.ema(source, length))`);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining("Cannot pass series value to simple parameter 'length' for ta.ema"),
      }),
    ]);
  });

  it.each([
    '[first, secondValue] = if true\n    [1, "x"]\nelse\n    [2, "y"]',
    '[first, secondValue] = switch\n    true => [1, "x"]\n    => [2, "y"]',
  ])('applies the simple floor to conditional local returns (207)', (body) => {
    const result = check(body);
    expect(result.diagnostics).toEqual([]);
    for (const name of ['first', 'secondValue']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.qualifier).toBe('simple');
    }
  });

  it('promotes all members when a conditional tuple depends on series (219)', () => {
    const result = check(`[first, secondValue] = if close > open
    [1, "up"]
else
    [2, "down"]`);
    expect(result.diagnostics).toEqual([]);
    for (const name of ['first', 'secondValue']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.qualifier).toBe('series');
    }
  });

  it('applies the shared qualifier to a method return (219)', () => {
    const result = check(`method parameters(float source) => [source, 3]
[source, length] = close.parameters()`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type).toEqual({
      kind: 'int',
      qualifier: 'series',
    });
  });

  it.each([
    '[first, secondValue] = for i = 0 to bar_index\n    [1, "loop"]',
    '[first, secondValue] = while close > open\n    [1, "loop"]',
    '[first, secondValue] = switch\n    close > open => [1, "up"]\n    => [2, "down"]',
    'parameters() =>\n    for i = 0 to bar_index\n        [1, "loop"]\n[first, secondValue] = parameters()',
  ])('shares the qualifier of local selection/loop controls (219)', (body) => {
    const result = check(body);
    expect(result.diagnostics).toEqual([]);
    for (const name of ['first', 'secondValue']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.qualifier).toBe('series');
    }
  });
});
