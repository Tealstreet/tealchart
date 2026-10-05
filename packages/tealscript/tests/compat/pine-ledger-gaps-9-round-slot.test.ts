import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Rank355: version-rules-v1#202; reference/pine-v6-reference-v1.json math.round:number.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#math-namespace-for-math-related-functions-and-variables
const examples = [
  { call: 'round(x=1.2345, precision=2)', expected: 1.23 },
  { call: 'round(precision=1, x=-1.26)', expected: -1.3 },
];

describe('LEGACY-ROUND-X-SLOT', () => {
  it.each(examples)('binds v4 $call using the published x slot', ({ call, expected }) => {
    const source = `//@version=4\nstudy("old round slot")\nplot(${call}, title="rounded")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const old = runCompatScript(source);
    expect(old.errors).toEqual([]);
    expect(getPlot(old, 'rounded').values).toEqual(Array(12).fill(expected));
    const diagnostics = checkProgram(
      parse('//@version=6\nindicator("old slot refused")\nplot(math.round(x=1.2345, precision=2))'),
    ).diagnostics;
    expect(
      diagnostics.some((diagnostic) => diagnostic.code === 'unknown-argument' && diagnostic.message.includes('x')),
    ).toBe(true);
  });
});
