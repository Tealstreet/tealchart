import type { SymInfo } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars } from './fixtures';

const members = [
  'recommendations_buy',
  'recommendations_buy_strong',
  'recommendations_hold',
  'recommendations_sell',
  'recommendations_sell_strong',
] as const;

function evaluate(member: (typeof members)[number], count?: number, requested = false) {
  const expression = requested
    ? `request.security("TARGET", "1", syminfo.${member}, lookahead=barmerge.lookahead_on)`
    : `syminfo.${member}`;
  const chartInfo: Partial<SymInfo> = { tickerid: 'CHART', [member]: requested ? 23 : count };
  const result = executeCompiledScript(
    parse(`//@version=6
indicator("Recommendation host context")
count = ${expression}
plot(count, "Count")
plot(na(count) ? 1 : 0, "Missing")`),
    compatibilityBars,
    undefined,
    {
      runtime: { syminfo: chartInfo, timeframe: { period: '1' } },
      requestDatafeed: requested
        ? new InMemoryRequestDatafeed([
            { symbol: 'TARGET', timeframe: '1', bars: compatibilityBars, syminfo: { [member]: count } },
          ])
        : undefined,
    },
  );
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.reason);
  expect(result.result.errors).toEqual([]);
  return result.result.plots;
}

// Counts are supplied by the host; these fixtures do not model analyst availability.
describe('recommendation count host and requested contexts', () => {
  for (const member of members) {
    it(`${member} preserves a supplied compiled count`, () => {
      const plots = evaluate(member, 7);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => 7));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 0));
    });

    it(`${member} preserves zero as an available count`, () => {
      const plots = evaluate(member, 0);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => 0));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 0));
    });

    it(`${member} preserves the unavailable host value`, () => {
      const plots = evaluate(member);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => null));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 1));
    });

    it(`${member} reads the requested symbol's supplied count`, () => {
      const plots = evaluate(member, 11, true);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => 11));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 0));
    });

    it(`${member} retains a requested zero rather than the chart count`, () => {
      const plots = evaluate(member, 0, true);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => 0));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 0));
    });

    it(`${member} retains explicit requested unavailability`, () => {
      const plots = evaluate(member, undefined, true);
      expect(plots[0]!.values).toEqual(compatibilityBars.map(() => null));
      expect(plots[1]!.values).toEqual(compatibilityBars.map(() => 1));
    });

    it(`${member} has the documented series int type`, () => {
      const result = checkProgram(
        parse(`//@version=6
indicator("Count type")
count = syminfo.${member}
plot(count)`),
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'count')?.type).toEqual({
        kind: 'int',
        qualifier: 'series',
      });
    });
  }
});
