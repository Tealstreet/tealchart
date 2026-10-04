import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTealchartApiLineRenderSnapshot, TealchartApi } from '../TealchartApi';
import { orderLineToPriceLine } from '../utils/tradingPriceLines';
import { OemsTradingRuntime } from './OemsTradingRuntime';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function setup() {
  const api = new TealchartApi('BTCUSDT', '15');
  const changed = vi.fn();
  const runtime = new OemsTradingRuntime({
    priceTolerance: () => 0.1,
    onChange: changed,
    onOrderMove: (id, price) => api.triggerOrderMove(id, price),
    onOrderCancel: (id) => api.triggerOrderCancel(id),
  });
  cleanups.push(() => {
    runtime.dispose();
    api.dispose();
  });
  const sync = () => {
    const snapshot = getTealchartApiLineRenderSnapshot(api);
    runtime.setOrderLines(snapshot.orderLines);
    runtime.setPositionLines(snapshot.positionLines);
  };
  return { api, runtime, sync, changed };
}

describe('shared OEMS trading runtime', () => {
  it('invokes the existing adapter callback once and confirms the same adapter after its venue ID changes', async () => {
    const { api, runtime, sync } = setup();
    let resolve: () => void = () => {};
    const move = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const adapter = await api.createOrderLine();
    adapter.setPrice(100).setOrderId('venue-before').onMove(move);
    sync();
    const id = runtime.getOrderLines()[0]!.id;
    runtime.handleOrderMove(id, 101);
    runtime.handleOrderMove(id, 102);
    expect(move).toHaveBeenCalledExactlyOnceWith(101, undefined);
    expect(runtime.getOrderLines()[0]).toMatchObject({ id, price: 101, actionState: { isAwaitingCallback: true } });
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    adapter.setOrderId('venue-after').setPrice(101.05);
    sync();
    expect(runtime.getOrderLines()[0]).toMatchObject({ id, orderId: 'venue-after', price: 101.05 });
    expect(runtime.oemsActions.getActions()).toHaveLength(0);
  });

  it('uses raw state for a superseding action and preserves callbacks through shared price-line assembly', async () => {
    const { api, runtime, sync } = setup();
    const move = vi.fn(() => Promise.resolve());
    const adapter = await api.createOrderLine();
    adapter.setPrice(100).onMove(move);
    sync();
    const id = runtime.getOrderLines()[0]!.id;
    runtime.handleOrderMove(id, 101);
    await Promise.resolve();
    await Promise.resolve();
    runtime.handleOrderMove(id, 102);
    expect(runtime.oemsActions.getAction('order', id)?.originalState.price).toBe(100);
    const line = orderLineToPriceLine(runtime.getOrderLines()[0]!, String, '#00ff00');
    expect(line).toMatchObject({ id, price: 102, actionState: { isAwaitingCallback: true } });
    expect(line.callbacks?.onMove).toBe(runtime.getOrderLines()[0]!.callbacks?.onMove);
  });

  it('settles bracket creation on the existing callback without an exchange bracket echo', async () => {
    const { api, runtime, sync } = setup();
    const adapter = await api.createPositionLine();
    let resolve: () => void = () => {};
    const end = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    adapter.setPrice(100).setBrackets({}).onTPMoveEnd(end);
    sync();
    const line = runtime.getPositionLines()[0]!;
    runtime.handleBracketMoveEnd(
      'tp',
      { lineId: line.id, type: 'position', price: line.price, callbacks: line.callbacks } as Parameters<
        OemsTradingRuntime['handleBracketMoveEnd']
      >[1],
      110,
      50,
    );
    expect(end).toHaveBeenCalledExactlyOnceWith(110, 50);
    expect(runtime.getPositionLines()[0]?.brackets?.takeProfit).toBe(110);
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(runtime.oemsActions.getActions()).toHaveLength(0);
  });
});
