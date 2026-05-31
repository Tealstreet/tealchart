import { describe, expect, it } from 'vitest';
import { createDefaultStrategySettings, createStrategyLedger, createStrategyPosition } from './strategy';

describe('strategy ledger model', () => {
  it('creates Pine-like default strategy settings with overrides', () => {
    const settings = createDefaultStrategySettings({
      title: 'Breakout',
      initialCapital: 25_000,
      defaultQtyType: 'percent_of_equity',
      defaultQtyValue: 10,
      pyramiding: 2,
      commissionValue: 0.05,
    });

    expect(settings).toMatchObject({
      title: 'Breakout',
      initialCapital: 25_000,
      currency: 'USD',
      defaultQtyType: 'percent_of_equity',
      defaultQtyValue: 10,
      pyramiding: 2,
      commissionType: 'percent',
      commissionValue: 0.05,
      slippageTicks: 0,
      processOrdersOnClose: false,
    });
  });

  it('initializes an empty ledger from resolved settings', () => {
    const ledger = createStrategyLedger({
      title: 'Mean reversion',
      initialCapital: 50_000,
      currency: 'EUR',
    });

    expect(ledger.settings.title).toBe('Mean reversion');
    expect(ledger.initialCapital).toBe(50_000);
    expect(ledger.equity).toBe(50_000);
    expect(ledger.settings.currency).toBe('EUR');
    expect(ledger.orders).toEqual([]);
    expect(ledger.fills).toEqual([]);
    expect(ledger.openTrades).toEqual([]);
    expect(ledger.closedTrades).toEqual([]);
    expect(ledger.position).toEqual(createStrategyPosition());
  });

  it('supports explicit flat and open position snapshots', () => {
    expect(createStrategyPosition()).toMatchObject({
      direction: null,
      size: 0,
      avgPrice: null,
      openProfit: 0,
    });

    expect(createStrategyPosition({
      direction: 'long',
      size: 2,
      avgPrice: 100.5,
      openProfit: 12,
    })).toMatchObject({
      direction: 'long',
      size: 2,
      avgPrice: 100.5,
      openProfit: 12,
    });
  });
});
