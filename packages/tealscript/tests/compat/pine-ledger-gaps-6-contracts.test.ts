import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

function check(body: string, version = 6, dynamicRequests?: boolean) {
  return checkProgram(
    parse(
      `//@version=${version}\n${version <= 4 ? 'study' : 'indicator'}("Ledger controls"${dynamicRequests === undefined ? '' : `, dynamic_requests=${dynamicRequests}`})\n${body}`,
    ),
  );
}

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
describe('ledger gaps 6: v5 builtin migrations', () => {
  it.each([5, 6])('refuses the removed series-float RSI overload in v%i (220)', (version) => {
    expect(check('plot(ta.rsi(close, open))', version).diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('length') }),
    ]);
    expect(check('plot(ta.rsi(close, 3))', version).diagnostics).toEqual([]);
  });

  it.each([
    [4, 'tostring(1.2, "0.00")'],
    [4, 'tostring(x=1.2, y="0.00")'],
    [5, 'str.tostring(1.2, "0.00")'],
    [5, 'str.tostring(value=1.2, format="0.00")'],
  ] as const)('binds v%i %s (229–231)', (version, call) => {
    const source = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Migration")\nplot(${call} == "1.20", title="Correct")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Correct').values).toEqual(Array(12).fill(true));
  });

  it('refuses the bare tostring name after the v5 migration (229)', () => {
    expect(check('value = tostring(1.2)', 5).diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('tostring') }),
    );
  });

  it.each([
    ['str.tostring(x=1.2)', 'x'],
    ['str.tostring(1.2, y="0.00")', 'y'],
  ] as const)('rejects obsolete modern argument %s (230/231)', (call, name) => {
    expect(check(`value = ${call}`, 5).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown-argument', message: expect.stringContaining(`'${name}'`) }),
    );
  });

  it.each([
    [4, 'sma'],
    [5, 'ta.sma'],
  ] as const)('binds v%i %s (237)', (version, name) => {
    const source = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("SMA migration")\nplot(${name}(close, 2), title="Mean")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Mean').values).toEqual([
      null,
      103.5,
      106,
      105,
      101,
      99.5,
      102,
      106.5,
      108.5,
      109.5,
      110.5,
      111,
    ]);
  });
  it('refuses the pre-v5 bare SMA name in v5 (237)', () => {
    expect(check('plot(sma(close, 2))', 5).diagnostics).toContainEqual(expect.objectContaining({ severity: 'error' }));
  });
});
