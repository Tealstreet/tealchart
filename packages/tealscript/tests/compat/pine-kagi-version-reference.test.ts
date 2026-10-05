import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger1404: published v4 kagi() -> v5 ticker.kagi() rename.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ticker-namespace-for-functions-that-help-create-tickers
const errors = (call: string, version: number) =>
  checkProgram(
    parse(`//@version=${version}
indicator("Kagi migration")
id=${call}`),
  ).diagnostics.filter((d) => d.severity === 'error');
describe('Kagi published namespace migration', () => {
  it.each([
    ['kagi(symbol="EXCHANGE:ABC",reversal=2)', 4],
    ['ticker.kagi(symbol="EXCHANGE:ABC",reversal=2)', 5],
  ] as const)('accepts %s in v%i', (call, version) => {
    expect(errors(call, version)).toEqual([]);
  });
  it.each([
    ['kagi("EXCHANGE:ABC",2)', 5],
    ['ticker.kagi("EXCHANGE:ABC",2)', 4],
  ] as const)('refuses %s in v%i', (call, version) => {
    expect(errors(call, version)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
    );
  });
  it('retains a modern local kagi function', () => {
    expect(
      checkProgram(parse('//@version=6\nindicator("Local Kagi")\nkagi(x) => x+1\nplot(kagi(2))')).diagnostics.filter(
        (d) => d.severity === 'error',
      ),
    ).toEqual([]);
  });
});
