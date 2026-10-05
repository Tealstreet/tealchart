import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Published v4 global -> v5 namespace migration.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ticker-namespace-for-functions-that-help-create-tickers
function errors(call: string, version: number) {
  return checkProgram(
    parse(`//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Line Break migration")\nid=${call}\n`),
  ).diagnostics.filter((d) => d.severity === 'error');
}
describe('Line Break published namespace migration', () => {
  it.each([
    ['linebreak(symbol="EXCHANGE:ABC",number_of_lines=3)', 4],
    ['ticker.linebreak(symbol="EXCHANGE:ABC",number_of_lines=3)', 5],
  ] as const)('accepts published %s in v%i', (call, version) => {
    expect(errors(call, version)).toEqual([]);
  });
  it.each([
    ['linebreak("EXCHANGE:ABC",3)', 5],
    ['ticker.linebreak("EXCHANGE:ABC",3)', 4],
  ] as const)('refuses opposite-version namespace %s in v%i', (call, version) => {
    expect(errors(call, version)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
    );
  });
});
