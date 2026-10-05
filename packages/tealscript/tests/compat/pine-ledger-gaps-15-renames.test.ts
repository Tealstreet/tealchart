import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ledger ranks578/579/590; v5 migration guide renamed tr and stoch to ta.*.
// All three RED when v5 admits legacy globals; restored GREEN in a discarded
// copy (pine-gaps15-witnesses-proof-v1.log). No migration engine patch needed.
const authority = 'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#renamed-functions-and-variables';

describe(`ledger gaps15 TA namespace migration [${authority}]`, () => {
  for (const [rank, legacy, modern, expected] of [
    [578, 'tr', 'ta.tr', [null, 5]],
    [579, 'tr(handle_na=true)', 'ta.tr(handle_na=true)', [4, 5]],
    [590, 'stoch(close, high, low, 1)', 'ta.stoch(close, high, low, 1)', [75, 80]],
  ] as const) {
    it(`rank ${rank}: legacy v4 and namespaced v5 values agree; v5 refuses the old spelling`, () => {
      const source = (version: number, expression: string) => `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("TA migration")\nplot(${expression}, title="value")`;
      for (const [version, expression] of [[4, legacy], [5, modern]] as const) {
        const pine = source(version, expression);
        expect(checkProgram(parse(pine)).diagnostics).toEqual([]);
        const result = runCompatScript(pine, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'value').values).toEqual(expected);
      }
      expect(checkProgram(parse(source(5, legacy))).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: rank === 578 ? 'unknown-identifier' : 'version-mismatch' })]),
      );
    });
  }
});
