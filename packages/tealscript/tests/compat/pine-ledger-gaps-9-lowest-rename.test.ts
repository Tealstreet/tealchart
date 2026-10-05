import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

it('migrates the published lowest overloads from v4 to v5 ta.lowest', () => {
  // Rank332: version-rules-v1#162; reference/pine-v6-reference-v1.json functions[181].
  // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables
  for (const version of [4, 5]) {
    const name = version === 4 ? 'lowest' : 'ta.lowest';
    const declaration = version === 4 ? 'study' : 'indicator';
    const result = runCompatScript(
      `//@version=${version}\n${declaration}("lowest rename")\nplot(${name}(close, 3), title="close minimum")\nplot(${name}(3), title="low minimum")`,
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'close minimum').values.slice(-3)).toEqual([108, 108, 110]);
    expect(getPlot(result, 'low minimum').values.slice(-3)).toEqual([103, 106, 107]);
  }
  for (const version of [5, 6]) {
    expect(
      checkProgram(
        parse(`//@version=${version}\nindicator("old lowest refused")\nplot(lowest(close, 3))`),
      ).diagnostics.some((diagnostic) => diagnostic.code === 'version-mismatch'),
    ).toBe(true);
  }
});
