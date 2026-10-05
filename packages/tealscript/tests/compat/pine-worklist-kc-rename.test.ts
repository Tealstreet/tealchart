import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables
const source = (version: number, name: string) => `//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Keltner rename")
[basis, upper, lower] = ${name}(close, 3, 1.25)
plot(basis, title="basis")
plot(upper, title="upper")
plot(lower, title="lower")`;
const errors = (code: string) => checkProgram(parse(code)).diagnostics.filter((d) => d.severity === 'error');

describe('worklist 1458 Keltner namespace migration', () => {
  it('accepts v4 kc and v5 ta.kc with identical compiled tuple outputs', () => {
    expect(errors(source(4, 'kc'))).toEqual([]);
    expect(errors(source(5, 'ta.kc'))).toEqual([]);
    const legacy = runCompatScript(source(4, 'kc'));
    const modern = runCompatScript(source(5, 'ta.kc'));
    expect(legacy.errors).toEqual([]);
    expect(modern.errors).toEqual([]);
    for (const title of ['basis', 'upper', 'lower']) {
      expect(getPlot(legacy, title).values).toEqual(getPlot(modern, title).values);
      expect(getPlot(modern, title).values.some((v) => typeof v === 'number' && Number.isFinite(v))).toBe(true);
    }
  });
  it.each([5, 6])('refuses bare kc in v%s while accepting ta.kc', (version) => {
    expect(errors(source(version, 'kc')).length).toBeGreaterThan(0);
    expect(errors(source(version, 'ta.kc'))).toEqual([]);
  });
});
