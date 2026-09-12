import { describe, expect, it } from 'vitest';

import { createStrategyLedger, markStrategyLedgerToMarket, submitStrategyOrder, fillPendingStrategyMarketOrders } from './strategy';
import { validateStrategyLedgerInvariants } from './strategyInvariants';

describe('strategy ledger invariants', () => {
  it('accepts a coherent ledger with commissions and an open position', () => {
    const ledger = createStrategyLedger({
      initialCapital: 1000,
      commissionType: 'cash_per_order',
      commissionValue: 1,
    });

    submitStrategyOrder(ledger, {
      id: 'L1',
      direction: 'long',
      qty: 2,
      qtyType: 'fixed',
      qtyValue: 2,
      isEntry: true,
      barIndex: 0,
      time: 0,
    });
    fillPendingStrategyMarketOrders(ledger, 10, 1, 1);
    markStrategyLedgerToMarket(ledger, 12, 12, 12, { barIndex: 1, time: 1 });

    expect(validateStrategyLedgerInvariants(ledger)).toEqual([]);
  });

  it('reports internal contradictions without needing TradingView reference data', () => {
    const ledger = createStrategyLedger({ initialCapital: 1000 });
    ledger.equity = 1001;
    ledger.position.size = 1;
    ledger.position.avgPrice = 10;
    ledger.position.openProfit = 0;

    expect(validateStrategyLedgerInvariants(ledger).map((violation) => violation.invariant)).toEqual([
      'final-equity-arithmetic',
      'open-position-size',
      'flat-position-average-price',
    ]);
  });
});
