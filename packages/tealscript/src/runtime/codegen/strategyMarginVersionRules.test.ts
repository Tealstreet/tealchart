import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const citation = 'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#default-margin-percentage';
const bars = [{ time: 60000, open: 10, high: 12, low: 9, close: 11, volume: 100 }];

function settings(version: number, declarationArgs = '', assertDeferredAdmission = false) {
  const body = assertDeferredAdmission ? 'strategy.entry("L", strategy.long, qty=20)' : '';
  const compiled = tryCompile(parse(`//@version=${version}\nstrategy("margin", initial_capital=100, process_orders_on_close=true${declarationArgs})\n${body}\nplot(close)`));
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error(compiled.unsupported.join(', '));
  const result = executeCompiled(compiled, bars);
  expect(result).not.toBeNull();
  expect(result!.errors).toEqual([]);
  expect(result!.strategy).toBeDefined();
  if (assertDeferredAdmission) {
    // KNOWN DIVERGENCE: 20 * 11 requires 220 at 100% margin on equity 100,
    // yet fills. Margin fields are not consumed by the ledger. Correcting the
    // legacy default alone would create a read-but-inert rule. Admission and
    // legacy defaults must be addressed together once reference behavior is settled.
    expect(result!.strategy!.position.size).toBe(20);
    expect(result!.strategy!.fills).toHaveLength(1);
  }
  return result!.strategy!.settings;
}

describe('deferred margin defaults: known divergence until the ledger consumes margin', () => {
  for (const version of [3, 4, 5, 6]) {
    // Reference/project policy: v3-v5 default 0; v6 default 100. Current default
    // is 100 in all versions. This deliberate inversion preserves the finding
    // and goes red when admission/default behavior changes, requiring review.
    const defaultMargin = 100;

    it('records current 100 defaults and inert admission in v' + version + (version < 6 ? ' (reference default: 0)' : ' (reference default: 100)'), () => {
      expect(settings(version, '', true), citation).toMatchObject({ marginLong: defaultMargin, marginShort: defaultMargin });
    });

    it('preserves explicit zero margin in v' + version, () => {
      expect(settings(version, ', margin_long=0, margin_short=0')).toMatchObject({ marginLong: 0, marginShort: 0 });
    });

    it('preserves separate explicit margins in v' + version, () => {
      expect(settings(version, ', margin_long=25, margin_short=50')).toMatchObject({ marginLong: 25, marginShort: 50 });
    });

    it('defaults only the omitted short side in v' + version, () => {
      expect(settings(version, ', margin_long=25')).toMatchObject({ marginLong: 25, marginShort: defaultMargin });
    });

    it('defaults only the omitted long side in v' + version, () => {
      expect(settings(version, ', margin_short=50')).toMatchObject({ marginLong: defaultMargin, marginShort: 50 });
    });
  }
});
