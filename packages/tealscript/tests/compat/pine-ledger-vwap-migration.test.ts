import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

function check(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('v4 to v5 declaration and VWAP migration', () => {
  it('executes legacy named VWAP source separately from its hlc3 variable', () => {
    const ast = parse(
      '//@version=4\nstudy("legacy")\nplot(vwap(x=close))\nplot(vwap)\nplot(timeframe.isintraday ? timeframe.multiplier : 0)',
    );
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeCompiledScript(
      ast,
      [
        { time: 1700000000000, open: 10, high: 16, low: 10, close: 10, volume: 1 },
        { time: 1700000060000, open: 20, high: 29, low: 20, close: 20, volume: 1 },
      ],
      undefined,
      { runtime: { timeframe: { period: '15', multiplier: 15, isminutes: true, isintraday: true } } },
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots.map((plot) => plot.values)).toEqual([
      [10, 15],
      [12, 17.5],
      [15, 15],
    ]);
  });

  it('preserves local aliases and their history', () => {
    const ast = parse(
      '//@version=4\nstudy("locals")\ninterval = close\nisintraday = false\nplot(interval)\nplot(interval[1])\nplot(isintraday ? 1 : 0)',
    );
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const result = executeCompiledScript(
      ast,
      [10, 20].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close,
        low: close,
        close,
        volume: 1,
      })),
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots.map((plot) => plot.values)).toEqual([
      [10, 20],
      [null, 10],
      [0, 0],
    ]);
  });
  it('accepts legacy study resolution and resolution_gaps with matching modern fields', () => {
    const legacy = parse('//@version=4\nstudy("legacy", resolution="1D", resolution_gaps=false)\nplot(close)');
    const modern = parse('//@version=5\nindicator("modern", timeframe="1D", timeframe_gaps=false)\nplot(close)');
    expect(checkProgram(legacy).diagnostics).toEqual([]);
    expect(checkProgram(modern).diagnostics).toEqual([]);
    const oldDeclaration = legacy.body[0];
    const newDeclaration = modern.body[0];
    expect(oldDeclaration).toMatchObject({ timeframe: { value: '1D' }, timeframe_gaps: { value: false } });
    expect(newDeclaration).toMatchObject({ timeframe: { value: '1D' }, timeframe_gaps: { value: false } });
  });

  it.each(['resolution="1D"', 'resolution_gaps=false'])(
    'rejects the obsolete modern declaration slot %s',
    (argument) => {
      expect(check(`//@version=5\nindicator("modern", ${argument})\nplot(close)`)).not.toEqual([]);
    },
  );

  it('accepts v4 VWAP variable and positional function forms', () => {
    expect(check('//@version=4\nstudy("legacy")\nplot(vwap)\nplot(vwap(close))')).toEqual([]);
  });

  it('accepts legacy named x in v4 VWAP', () => {
    expect(check('//@version=4\nstudy("legacy")\nplot(vwap(x=close))')).toEqual([]);
  });

  it('accepts modern source and refuses legacy x', () => {
    expect(check('//@version=5\nindicator("modern")\nplot(ta.vwap)\nplot(ta.vwap(source=close))')).toEqual([]);
    expect(check('//@version=5\nindicator("modern")\nplot(ta.vwap(x=close))')).not.toEqual([]);
  });

  it('refuses bare v4 VWAP spelling after migration', () => {
    expect(check('//@version=5\nindicator("modern")\nplot(vwap)\nplot(vwap(close))')).not.toEqual([]);
  });

  // v3 -> v4: the old chart variables moved to timeframe.*.
  // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
  it.each(['interval', 'isintraday'])('accepts the v3 builtin %s', (name) => {
    const expression = name === 'isintraday' ? `${name} ? 1 : 0` : name;
    expect(check(`//@version=3\nstudy("legacy")\nplot(${expression})`)).toEqual([]);
  });

  it.each([4, 5, 6].flatMap((version) => ['interval', 'isintraday'].map((name) => [version, name] as const)))(
    'refuses removed v%i builtin %s',
    (version, name) => {
      const expression = name === 'isintraday' ? `${name} ? 1 : 0` : name;
      const declaration = version === 4 ? 'study' : 'indicator';
      expect(check(`//@version=${version}\n${declaration}("removed")\nplot(${expression})`)).toEqual([
        expect.objectContaining({ code: 'unknown-identifier' }),
      ]);
    },
  );

  it.each([4, 5, 6])('accepts the modern timeframe fields in v%i', (version) => {
    const declaration = version === 4 ? 'study' : 'indicator';
    expect(
      check(`//@version=${version}\n${declaration}("modern")\nplot(timeframe.isintraday ? timeframe.multiplier : 0)`),
    ).toEqual([]);
  });

  it('executes both v3 aliases against the chart context', () => {
    const ast = parse('//@version=3\nstudy("legacy chart")\nplot(isintraday ? interval : 0)');
    const result = executeCompiledScript(
      ast,
      [10, 20].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close,
        low: close,
        close,
        volume: 1,
      })),
      undefined,
      { runtime: { timeframe: { period: '15', multiplier: 15, isminutes: true, isintraday: true } } },
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0].values).toEqual([15, 15]);
  });
});
