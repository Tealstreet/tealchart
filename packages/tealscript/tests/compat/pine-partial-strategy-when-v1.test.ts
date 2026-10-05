import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { builtinSignatureMapForCoverage, checkProgram } from '../../src/semantic/checker';

const bars = [10, 10].map((close, index) => ({
  time: (index + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: strategy.cancel/cancel_all/close_all.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#removal-of-when-parameter
// The migration lists these calls: v5 when conditions execution; v6 removes the argument.
describe('PARTIAL1870 legacy strategy when', () => {
  it('conditions cancellation coverage on the declared Pine version', () => {
    for (const pineVersion of [5, 6]) {
      const signatures = builtinSignatureMapForCoverage({ pineVersion });
      expect(signatures['strategy.cancel']).toMatchObject({
        params: pineVersion === 5 ? ['id', 'when'] : ['id'],
        maxArgs: pineVersion === 5 ? 2 : 1,
      });
      expect(signatures['strategy.cancel_all']).toMatchObject({
        params: pineVersion === 5 ? ['when'] : [],
        maxArgs: pineVersion === 5 ? 1 : 0,
      });
    }
  });

  it.each([
    'strategy.cancel("pending", when=CONDITION)',
    'strategy.cancel_all(when=CONDITION)',
    'strategy.close_all(when=CONDITION)',
  ])('conditions %s in v5 and refuses when in v6', (call) => {
    for (const condition of ['false', 'true']) {
      const closeAll = call.startsWith('strategy.close_all');
      const body = closeAll
        ? `if bar_index == 0\n    strategy.entry("pending", strategy.long)\nif bar_index == 1\n    ${call.replace('CONDITION', condition)}\nplot(strategy.position_size)`
        : `if bar_index == 0\n    strategy.entry("pending", strategy.long, limit=5)\n    ${call.replace('CONDITION', condition)}\nplot(strategy.position_size)`;
      const source = `//@version=5\nstrategy("When", process_orders_on_close=true)\n${body}`;
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = executeCompiled(tryCompile(ast), bars);
      if (closeAll) expect(result!.plots[0]!.values).toEqual(condition === 'false' ? [1, 1] : [1, 0]);
      else expect(result!.strategy?.orders[0]!.status).toBe(condition === 'false' ? 'pending' : 'cancelled');
      expect(
        checkProgram(parse(source.replace('//@version=5', '//@version=6'))).diagnostics.some(
          (d) => d.severity === 'error',
        ),
      ).toBe(true);
    }
  });
});
