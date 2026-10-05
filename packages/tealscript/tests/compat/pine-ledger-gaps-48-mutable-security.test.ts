import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { checkProgram } from '../../src/semantic/checker';

// The v3 migration guide rejects mutable security expressions and permits UDF encapsulation.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-3/#resolving-a-problem-with-a-mutable-variable-in-a-security-expression
const refusals = [
  { name: 'documented accumulator', body: 's = 0.0\ns := nz(s[1]) + close\nplot(security("TEST", "1", s))' },
  { name: 'named expression', body: 's = 0.0\ns := close\nplot(security("TEST", "1", expression=s))' },
  { name: 'arithmetic expression', body: 's = 0.0\ns := close\nplot(security("TEST", "1", s + 1))' },
  { name: 'history expression', body: 's = 0.0\ns := close\nplot(security("TEST", "1", s[1]))' },
  { name: 'function argument', body: 'identity(x) => x\ns = 0.0\ns := close\nplot(security("TEST", "1", identity(s)))' },
  { name: 'later assignment', body: 's = 0.0\nplot(security("TEST", "1", s))\ns := close' },
  { name: 'conditional assignment', body: 's = 0.0\nif close > open\n    s := close\nplot(security("TEST", "1", s))' },
  { name: 'compound assignment', body: 's = 0.0\ns += close\nplot(security("TEST", "1", s))' },
];
const controls = [
  { name: 'documented accumulator wrapper', body: 'calcS() =>\n    s = 0.0\n    s := nz(s[1]) + close\n    s\nplot(security("TEST", "1", calcS()))' },
  { name: 'named accumulator wrapper', body: 'calcS() =>\n    s = 0.0\n    s := nz(s[1]) + close\n    s\nplot(security("TEST", "1", expression=calcS()))' },
  { name: 'unmodified series', body: 's = close\nplot(security("TEST", "1", s))' },
  { name: 'built-in series', body: 'plot(security("TEST", "1", close))' },
  { name: 'same-name function local', body: 'calcS() =>\n    s = 0.0\n    s := close\n    s\ns = close\nplot(security("TEST", "1", s))' },
  { name: 'same-name block local', body: 's = close\nif close > open\n    s = 0.0\n    s := close\nplot(security("TEST", "1", s))' },
  { name: 'parameter shadows mutable global', body: 's = 0.0\ns := close\nf(s) => security("TEST", "1", s)\nplot(f(close))' },
  { name: 'local security shadows builtin', body: 'security(symbol, resolution, expression) => expression\ns = 0.0\ns := close\nplot(security("TEST", "1", s))' },
];

describe.each([3, 4])('ledger gaps 48: legacy mutable security in v%i', (version) => {
  const source = (body: string) => `//@version=${version}\nstudy("Mutable security boundary")\n${body}`;

  it.each(refusals)('refuses $name', ({ body }) => {
    expect(checkProgram(parse(source(body))).diagnostics).toEqual([
      expect.objectContaining({ code: 'mutable-security-expression', severity: 'error' }),
    ]);
  });

  it.each(refusals)('refuses unchecked compilation of $name', ({ body }) => {
    const result = tryCompile(parse(source(body)));
    expect(result.success).toBe(false);
    expect(result.unsupported.join('; ')).toContain('Cannot use mutable variable');
  });

  it.each(controls)('accepts $name', ({ body }) => {
    const program = parse(source(body));
    expect(checkProgram(program).diagnostics).toEqual([]);
    expect(tryCompile(program).success).toBe(true);
  });

  it('evaluates the encapsulated accumulator in the requested context', () => {
    const bars = (closes: number[]) => closes.map((close, index) => ({
      time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100,
    }));
    const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '1', bars: bars([2, 3, 5]) }]);
    const result = executeScript(parse(source('calcS() =>\n    s = 0.0\n    s := nz(s[1]) + close\n    s\nplot(security("ALT", "1", calcS()), "Value")')), bars([11, 17, 13]), undefined, {
      requestDatafeed, runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART' } },
    });
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([2, 5, 10]);
  });
});
