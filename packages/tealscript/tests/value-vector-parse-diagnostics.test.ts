import { describe, expect, it } from 'vitest';

import { runCase, type ValueVectorCase } from '../scripts/run-pine-value-vectors.ts';

const bars = [{ time: 1, open: 1, high: 2, low: 0, close: 1, volume: 1 }];
const continuation = `//@version=6
indicator("expression continuation values")
value = close +
    open * 2 +
    (high - low)
plot(value)`;
const diagnostic = 'end of line without line continuation';

function vector(pine: string, expectedDiagnostics?: readonly string[]): ValueVectorCase {
  return {
    id: 'parser.expected-diagnostics',
    namespace: 'runtime',
    pine,
    bars,
    rule: 'TradingView line wrapping excludes multiples of four outside parentheses. https://www.tradingview.com/pine-script-docs/language/script-structure/#line-wrapping',
    expected: () => [1],
    expectedDiagnostics,
  };
}

describe('value-vector parse diagnostic expectations', () => {
  it('accepts the expected refusal for the unchanged four-space continuation source', () => {
    const result = runCase(vector(continuation, [diagnostic]));
    expect(result.compiledMatches).toBe(true);
    expect(result.publicPathMatches).toBe(true);
    expect(result.diagnostics).toEqual([`parse: Syntax error at input "${diagnostic}"`]);
    expect(result.compiled).toBeNull();
    expect(result.publicPath).toBeNull();
    expect(result.compiledMismatchBars).toEqual([]);
    expect(result.publicPathMismatchBars).toEqual([]);
    expect(result.compiledMismatchDetails).toEqual([]);
    expect(result.publicPathMismatchDetails).toEqual([]);
  });

  it('keeps an unrelated expected diagnostic red', () => {
    const result = runCase(vector(continuation, ['unrelated diagnostic']));
    expect(result.compiledMatches).toBe(false);
    expect(result.publicPathMatches).toBe(false);
    expect(result.compiledMismatchBars).toEqual([0]);
    expect(result.publicPathMismatchBars).toEqual([0]);
  });

  it('requires every expected diagnostic to match', () => {
    const result = runCase(vector(continuation, [diagnostic, 'unrelated diagnostic']));
    expect(result.compiledMatches).toBe(false);
    expect(result.publicPathMatches).toBe(false);
  });

  it('keeps an unexpected parser failure red', () => {
    const result = runCase(vector(continuation));
    expect(result.compiledMatches).toBe(false);
    expect(result.publicPathMatches).toBe(false);
  });

  it('preserves successful vectors without diagnostic expectations', () => {
    const result = runCase(vector('//@version=6\nindicator("valid vector")\nplot(close)'));
    expect(result.compiledMatches).toBe(true);
    expect(result.publicPathMatches).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
