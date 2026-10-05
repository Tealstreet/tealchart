import type { SymInfo } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const recommendationCounts = [
  ['recommendations_buy', 3],
  ['recommendations_buy_strong', 5],
  ['recommendations_hold', 7],
  ['recommendations_sell', 11],
  ['recommendations_sell_strong', 13],
  ['recommendations_total', 39],
] as const;

describe('documented analyst recommendation counts', () => {
  it.each(recommendationCounts)('reads host-supplied %s without changing the count', (member, count) => {
    const source = `//@version=6
indicator("Recommendations")
int count = syminfo.${member}
plot(count, "Count")
plot(na(count) ? 1 : 0, "Missing")
`;
    const syminfo: Partial<SymInfo> = { [member]: count };
    const result = runCompatScript(source, { engineOptions: { runtime: { syminfo } } });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual(compatibilityBars.map(() => count));
    expect(getPlot(result, 'Missing').values).toEqual(compatibilityBars.map(() => 0));
  });

  it.each(recommendationCounts)('infers %s as series int', (member) => {
    const accepted = checkProgram(
      parse(`//@version=6
indicator("Integer count")
int count = syminfo.${member}
plot(count)
`),
    );
    const invalidKind = checkProgram(
      parse(`//@version=6
indicator("String count")
string count = syminfo.${member}
plot(1)
`),
    );
    const invalidQualifier = checkProgram(
      parse(`//@version=6
indicator("Simple count")
simple int count = syminfo.${member}
plot(count)
`),
    );

    expect(accepted.diagnostics).toEqual([]);
    expect(invalidKind.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
    expect(invalidQualifier.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
    );
  });
});
