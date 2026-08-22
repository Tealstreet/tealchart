import { describe, expect, it, vi } from 'vitest';

import { createOemsStateEquals, OemsActionManager } from './oemsActionManager';

describe('createOemsStateEquals', () => {
  // We send the price the user dragged to; the exchange rounds it to its own
  // tick and confirms a fraction away. Comparing exactly, the confirmation
  // never lands and the optimistic overlay sits beside the real order until the
  // action times out 30s later.
  it('confirms a price the exchange rounded to its tick', () => {
    const equals = createOemsStateEquals<{ stopLoss?: number }>(() => 0.5);

    expect(equals({ stopLoss: 59_370.8 }, { stopLoss: 59_370.5 })).toBe(true);
  });

  it('still rejects a genuinely different price', () => {
    const equals = createOemsStateEquals<{ stopLoss?: number }>(() => 0.5);

    expect(equals({ stopLoss: 59_370.8 }, { stopLoss: 59_120.0 })).toBe(false);
  });

  it('scales the tolerance with the price when no tick is known', () => {
    const equals = createOemsStateEquals<{ price?: number }>();

    expect(equals({ price: 60_000 }, { price: 60_000.4 })).toBe(true);
    expect(equals({ price: 3.27 }, { price: 3.2701 })).toBe(false);
  });

  // The relative figure stands in for an unknown tick; it must not widen a
  // known one, or a nudge the exchange has not acted on yet reads as confirmed.
  it('does not widen a known tick with the relative fallback', () => {
    const equals = createOemsStateEquals<{ price?: number }>(() => 0.1);

    expect(equals({ price: 120_000 }, { price: 120_001.2 })).toBe(false);
    expect(equals({ price: 120_000 }, { price: 120_000.1 })).toBe(true);
  });

  // A missing or malformed tick must not silently disable confirmation.
  it('falls back to the relative figure when the tick is not a usable number', () => {
    const equals = createOemsStateEquals<{ price?: number }>(() => Number.NaN);

    expect(equals({ price: 60_000 }, { price: 60_000.4 })).toBe(true);
  });

  it('compares everything that is not a price exactly', () => {
    const equals = createOemsStateEquals<{ partialPercent?: number; visible?: boolean }>(() => 100);

    expect(equals({ visible: true }, { visible: false })).toBe(false);
    expect(equals({ partialPercent: 75 }, { partialPercent: 74 })).toBe(false);
  });

  it('ignores undefined expectations, as the exact comparison did', () => {
    const equals = createOemsStateEquals<{ price?: number; stopLoss?: number }>(() => 0.5);

    expect(equals({ price: undefined, stopLoss: 100 }, { price: 5, stopLoss: 100 })).toBe(true);
  });
});

describe('OemsActionManager price confirmation', () => {
  it('settles an action whose confirmation came back tick-rounded', () => {
    const settled: string[] = [];
    const manager = new OemsActionManager<{ stopLoss?: number }>({
      priceTolerance: () => 0.5,
      onSettle: (settlement) => settled.push(settlement.status),
    });

    manager.startAction({
      objectType: 'position',
      objectId: 'position-btc',
      kind: 'positionSlMove',
      originalState: { stopLoss: 58_000 },
      optimisticState: { stopLoss: 59_370.8 },
      callback: () => new Promise<never>(() => {}),
    });

    expect(manager.confirmState('position', 'position-btc', { stopLoss: 59_370.5 })).toBe(true);
    expect(settled).toEqual(['confirmed']);
  });
});

describe('OemsActionManager object ownership', () => {
  const start = (manager: OemsActionManager<{ price?: number }>, callback: () => Promise<void>) =>
    manager.startAction({
      objectType: 'order',
      objectId: 'line-1',
      kind: 'orderMove',
      originalState: { price: 100 },
      optimisticState: { price: 101 },
      callback,
    });

  it('refuses a second action while the first callback is still in flight', () => {
    const manager = new OemsActionManager<{ price?: number }>();
    start(manager, () => new Promise<never>(() => {}));

    const second = start(manager, () => new Promise<never>(() => {}));

    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('conflicting-action');
  });

  // The drag that used to do nothing: the venue had already answered, so the
  // object was held only by a confirmation that might never match.
  it('supersedes an action that is only waiting for the venue to echo', async () => {
    const settled: string[] = [];
    const manager = new OemsActionManager<{ price?: number }>({
      onSettle: (settlement) => settled.push(settlement.status),
    });
    start(manager, () => Promise.resolve());
    await Promise.resolve();
    await Promise.resolve();

    const second = start(manager, () => new Promise<never>(() => {}));

    expect(second.accepted).toBe(true);
    expect(settled).toEqual(['superseded']);
    expect(manager.getAction('order', 'line-1')?.optimisticState).toEqual({ price: 101 });
  });

  it('abandons an action whose object left the chart, but never one mid-callback', async () => {
    const settled: string[] = [];
    const manager = new OemsActionManager<{ price?: number }>({
      onSettle: (settlement) => settled.push(settlement.status),
    });
    start(manager, () => new Promise<never>(() => {}));

    expect(manager.abandon('order', 'line-1')).toBe(false);
    expect(settled).toEqual([]);

    const manager2 = new OemsActionManager<{ price?: number }>({
      onSettle: (settlement) => settled.push(settlement.status),
    });
    start(manager2, () => Promise.resolve());
    await Promise.resolve();
    await Promise.resolve();

    expect(manager2.abandon('order', 'line-1')).toBe(true);
    expect(settled).toEqual(['abandoned']);
    expect(manager2.getAction('order', 'line-1')).toBeNull();
  });
});

describe('OemsActionManager removal ownership', () => {
  // The click gates cannot be relied on here: native reads action state off the
  // raw snapshot, where it is never set, so the manager is the only guard.
  it('never supersedes a cancel, however long the venue takes to drop the line', async () => {
    const submitted = vi.fn(() => Promise.resolve());
    const manager = new OemsActionManager<{ price?: number }>();
    const args = {
      objectType: 'order' as const,
      objectId: 'line-1',
      kind: 'orderCancel' as const,
      originalState: { price: 100 },
      optimisticState: { price: 100 },
      confirmsRemoved: true,
      callback: submitted,
    };
    manager.startAction(args);
    await Promise.resolve();
    await Promise.resolve();

    const second = manager.startAction(args);

    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('conflicting-action');
    expect(submitted).toHaveBeenCalledTimes(1);
  });
});
