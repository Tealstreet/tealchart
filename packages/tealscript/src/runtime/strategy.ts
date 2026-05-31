export type StrategyDirection = 'long' | 'short';
export type StrategyOrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type StrategyOrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type StrategyOcaType = 'cancel' | 'reduce' | 'none';
export type StrategyQuantityType = StrategyLedgerSettings['defaultQtyType'];

export interface StrategyLedgerSettings {
  title: string;
  initialCapital: number;
  currency: string;
  defaultQtyType: 'fixed' | 'cash' | 'percent_of_equity';
  defaultQtyValue: number;
  pyramiding: number;
  commissionType: 'percent' | 'cash_per_order' | 'cash_per_contract';
  commissionValue: number;
  slippageTicks: number;
  marginLong: number;
  marginShort: number;
  calcOnOrderFills: boolean;
  calcOnEveryTick: boolean;
  processOrdersOnClose: boolean;
}

export interface StrategyOrder {
  id: string;
  direction: StrategyDirection;
  type: StrategyOrderType;
  status: StrategyOrderStatus;
  qty: number | null;
  qtyType: StrategyQuantityType;
  qtyValue: number;
  isEntry: boolean;
  requestedQty: number | null;
  filledQty: number;
  avgFillPrice: number | null;
  limitPrice?: number;
  stopPrice?: number;
  fromEntry?: string;
  ocaName?: string;
  ocaType?: StrategyOcaType;
  comment?: string;
  alertMessage?: string;
  createdBarIndex: number;
  createdTime: number;
  activationBarIndex: number;
  activationTime: number;
  updatedBarIndex: number;
  updatedTime: number;
}

export interface StrategyOrderInput {
  id: string;
  direction: StrategyDirection;
  qty: number | null;
  qtyType: StrategyQuantityType;
  qtyValue: number;
  isEntry?: boolean;
  requestedQty?: number | null;
  limitPrice?: number;
  stopPrice?: number;
  fromEntry?: string;
  ocaName?: string;
  ocaType?: StrategyOcaType;
  comment?: string;
  alertMessage?: string;
  barIndex: number;
  time: number;
}

export interface StrategyFill {
  id: string;
  orderId: string;
  entryId?: string;
  direction: StrategyDirection;
  qty: number;
  price: number;
  commission: number;
  slippage: number;
  barIndex: number;
  time: number;
  alertMessage?: string;
}

export interface StrategyPosition {
  direction: StrategyDirection | null;
  size: number;
  avgPrice: number | null;
  openProfit: number;
  maxRunup: number;
  maxDrawdown: number;
}

export interface StrategyTrade {
  id: string;
  entryOrderId: string;
  exitOrderId?: string;
  direction: StrategyDirection;
  qty: number;
  entryPrice: number;
  entryBarIndex: number;
  entryTime: number;
  exitPrice?: number;
  exitBarIndex?: number;
  exitTime?: number;
  profit: number;
  commission: number;
  maxRunup: number;
  maxDrawdown: number;
}

export interface StrategyEquityPoint {
  barIndex: number;
  time: number;
  equity: number;
  openProfit: number;
  netProfit: number;
  drawdown: number;
  runup: number;
}

export interface StrategyLedger {
  settings: StrategyLedgerSettings;
  orders: StrategyOrder[];
  fills: StrategyFill[];
  openTrades: StrategyTrade[];
  closedTrades: StrategyTrade[];
  position: StrategyPosition;
  equityCurve: StrategyEquityPoint[];
  initialCapital: number;
  equity: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  maxRunup: number;
  maxDrawdown: number;
}

export function createDefaultStrategySettings(settings: Partial<StrategyLedgerSettings> = {}): StrategyLedgerSettings {
  return {
    title: 'Untitled strategy',
    initialCapital: 100_000,
    currency: 'USD',
    defaultQtyType: 'fixed',
    defaultQtyValue: 1,
    pyramiding: 0,
    commissionType: 'percent',
    commissionValue: 0,
    slippageTicks: 0,
    marginLong: 100,
    marginShort: 100,
    calcOnOrderFills: false,
    calcOnEveryTick: false,
    processOrdersOnClose: false,
    ...settings,
  };
}

export function createStrategyPosition(position: Partial<StrategyPosition> = {}): StrategyPosition {
  return {
    direction: null,
    size: 0,
    avgPrice: null,
    openProfit: 0,
    maxRunup: 0,
    maxDrawdown: 0,
    ...position,
  };
}

export function createStrategyLedger(settings: Partial<StrategyLedgerSettings> = {}): StrategyLedger {
  const resolvedSettings = createDefaultStrategySettings(settings);
  return {
    settings: resolvedSettings,
    orders: [],
    fills: [],
    openTrades: [],
    closedTrades: [],
    position: createStrategyPosition(),
    equityCurve: [],
    initialCapital: resolvedSettings.initialCapital,
    equity: resolvedSettings.initialCapital,
    netProfit: 0,
    grossProfit: 0,
    grossLoss: 0,
    maxRunup: 0,
    maxDrawdown: 0,
  };
}

export function cloneStrategyLedger(ledger: StrategyLedger): StrategyLedger {
  return {
    settings: { ...ledger.settings },
    orders: ledger.orders.map((order) => ({ ...order })),
    fills: ledger.fills.map((fill) => ({ ...fill })),
    openTrades: ledger.openTrades.map((trade) => ({ ...trade })),
    closedTrades: ledger.closedTrades.map((trade) => ({ ...trade })),
    position: { ...ledger.position },
    equityCurve: ledger.equityCurve.map((point) => ({ ...point })),
    initialCapital: ledger.initialCapital,
    equity: ledger.equity,
    netProfit: ledger.netProfit,
    grossProfit: ledger.grossProfit,
    grossLoss: ledger.grossLoss,
    maxRunup: ledger.maxRunup,
    maxDrawdown: ledger.maxDrawdown,
  };
}

export function createStrategyOrder(input: StrategyOrderInput): StrategyOrder {
  validateStrategyOrderInput(input);
  return {
    id: input.id,
    direction: input.direction,
    type: inferStrategyOrderType(input.limitPrice, input.stopPrice),
    status: 'pending',
    qty: input.qty,
    qtyType: input.qtyType,
    qtyValue: input.qtyValue,
    isEntry: input.isEntry ?? false,
    requestedQty: input.requestedQty ?? input.qty,
    filledQty: 0,
    avgFillPrice: null,
    limitPrice: input.limitPrice,
    stopPrice: input.stopPrice,
    fromEntry: input.fromEntry,
    ocaName: input.ocaName,
    ocaType: input.ocaType,
    comment: input.comment,
    alertMessage: input.alertMessage,
    createdBarIndex: input.barIndex,
    createdTime: input.time,
    activationBarIndex: input.barIndex,
    activationTime: input.time,
    updatedBarIndex: input.barIndex,
    updatedTime: input.time,
  };
}

export function submitStrategyOrder(ledger: StrategyLedger, input: StrategyOrderInput): StrategyOrder {
  const order = createStrategyOrder(input);
  ledger.orders.push(order);
  return order;
}

export function fillStrategyMarketOrder(
  ledger: StrategyLedger,
  order: StrategyOrder,
  price: number,
  barIndex: number,
  time: number,
): StrategyFill | null {
  if (order.status !== 'pending' || order.type !== 'market' || order.qty === null) {
    return null;
  }
  return fillStrategyOrder(ledger, order, price, barIndex, time);
}

export function fillPendingStrategyOrders(
  ledger: StrategyLedger,
  high: number,
  low: number,
  barIndex: number,
  time: number,
): StrategyFill[] {
  const fills: StrategyFill[] = [];
  for (const order of ledger.orders) {
    const price = getPendingOrderFillPrice(order, high, low, barIndex);
    if (price === null) {
      continue;
    }

    const fill = fillStrategyOrder(ledger, order, price, barIndex, time);
    if (fill) {
      fills.push(fill);
      cancelOcaOrders(ledger, order, barIndex, time);
    }
  }
  return fills;
}

function fillStrategyOrder(
  ledger: StrategyLedger,
  order: StrategyOrder,
  price: number,
  barIndex: number,
  time: number,
): StrategyFill | null {
  if (order.status !== 'pending' || order.qty === null) {
    return null;
  }
  if (!Number.isFinite(price)) {
    throw new Error('strategy fill price must be finite');
  }
  const fillQty = resolveStrategyFillQty(ledger, order);

  order.status = 'filled';
  order.filledQty = fillQty;
  order.avgFillPrice = price;
  order.updatedBarIndex = barIndex;
  order.updatedTime = time;

  const fill: StrategyFill = {
    id: `${order.id}:${ledger.fills.length}`,
    orderId: order.id,
    entryId: order.fromEntry,
    direction: order.direction,
    qty: fillQty,
    price,
    commission: 0,
    slippage: 0,
    barIndex,
    time,
    alertMessage: order.alertMessage,
  };
  ledger.fills.push(fill);
  applyStrategyFillToTrades(ledger, fill);
  applyStrategyFillToPosition(ledger, fill);
  return fill;
}

function resolveStrategyFillQty(ledger: StrategyLedger, order: StrategyOrder): number {
  if (!order.isEntry) {
    return order.qty ?? 0;
  }

  const requestedQty = order.requestedQty ?? order.qty ?? 0;
  const position = ledger.position;
  if (position.direction === null || position.direction === order.direction) {
    return requestedQty;
  }
  return Math.abs(position.size) + requestedQty;
}

function getPendingOrderFillPrice(order: StrategyOrder, high: number, low: number, barIndex: number): number | null {
  if (order.status !== 'pending' || order.qty === null || order.activationBarIndex >= barIndex) {
    return null;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return null;
  }

  if (order.type === 'limit' && order.limitPrice !== undefined) {
    if (order.direction === 'long' && low <= order.limitPrice) {
      return order.limitPrice;
    }
    if (order.direction === 'short' && high >= order.limitPrice) {
      return order.limitPrice;
    }
  }

  if (order.type === 'stop' && order.stopPrice !== undefined) {
    if (order.direction === 'long' && high >= order.stopPrice) {
      return order.stopPrice;
    }
    if (order.direction === 'short' && low <= order.stopPrice) {
      return order.stopPrice;
    }
  }

  return null;
}

function cancelOcaOrders(ledger: StrategyLedger, filledOrder: StrategyOrder, barIndex: number, time: number): void {
  if (filledOrder.ocaName === undefined || filledOrder.ocaType !== 'cancel') {
    return;
  }

  for (const order of ledger.orders) {
    if (
      order.status !== 'pending'
      || order === filledOrder
      || order.ocaName !== filledOrder.ocaName
      || order.ocaType !== 'cancel'
    ) {
      continue;
    }

    order.status = 'cancelled';
    order.updatedBarIndex = barIndex;
    order.updatedTime = time;
  }
}

export function cancelStrategyOrder(ledger: StrategyLedger, id: string, barIndex: number, time: number): boolean {
  let cancelled = false;
  for (let index = ledger.orders.length - 1; index >= 0; index--) {
    const order = ledger.orders[index];
    if (!order || order.id !== id || order.status !== 'pending') {
      continue;
    }

    order.status = 'cancelled';
    order.updatedBarIndex = barIndex;
    order.updatedTime = time;
    cancelled = true;
  }
  return cancelled;
}

export function cancelAllStrategyOrders(ledger: StrategyLedger, barIndex: number, time: number): number {
  let cancelled = 0;
  for (const order of ledger.orders) {
    if (order.status !== 'pending') {
      continue;
    }

    order.status = 'cancelled';
    order.updatedBarIndex = barIndex;
    order.updatedTime = time;
    cancelled++;
  }
  return cancelled;
}

function inferStrategyOrderType(limitPrice: number | undefined, stopPrice: number | undefined): StrategyOrderType {
  if (limitPrice !== undefined && stopPrice !== undefined) {
    return 'stop_limit';
  }
  if (limitPrice !== undefined) {
    return 'limit';
  }
  if (stopPrice !== undefined) {
    return 'stop';
  }
  return 'market';
}

function validateStrategyOrderInput(input: StrategyOrderInput): void {
  if (input.id.trim() === '') {
    throw new Error('strategy order id must not be empty');
  }
  if (input.qty !== null && (!Number.isFinite(input.qty) || input.qty <= 0)) {
    throw new Error('strategy order qty must be a positive number');
  }
  if (
    input.requestedQty !== undefined
    && input.requestedQty !== null
    && (!Number.isFinite(input.requestedQty) || input.requestedQty <= 0)
  ) {
    throw new Error('strategy order requestedQty must be a positive number');
  }
  if (!Number.isFinite(input.qtyValue) || input.qtyValue <= 0) {
    throw new Error('strategy order qtyValue must be a positive number');
  }
  validateOptionalPrice(input.limitPrice, 'limitPrice');
  validateOptionalPrice(input.stopPrice, 'stopPrice');
}

function validateOptionalPrice(value: number | undefined, name: string): void {
  if (value !== undefined && !Number.isFinite(value)) {
    throw new Error(`strategy order ${name} must be finite`);
  }
}

function applyStrategyFillToPosition(ledger: StrategyLedger, fill: StrategyFill): void {
  const signedQty = fill.direction === 'long' ? fill.qty : -fill.qty;
  const currentSize = ledger.position.size;
  const nextSize = currentSize + signedQty;

  if (currentSize === 0 || Math.sign(currentSize) === Math.sign(signedQty)) {
    const currentAbs = Math.abs(currentSize);
    const nextAbs = Math.abs(nextSize);
    const currentAvg = ledger.position.avgPrice ?? fill.price;
    ledger.position.avgPrice = nextAbs === 0 ? null : ((currentAvg * currentAbs) + (fill.price * fill.qty)) / nextAbs;
  } else if (nextSize === 0) {
    ledger.position.avgPrice = null;
  } else if (Math.sign(nextSize) !== Math.sign(currentSize)) {
    ledger.position.avgPrice = fill.price;
  }

  ledger.position.size = nextSize;
  ledger.position.direction = nextSize > 0 ? 'long' : nextSize < 0 ? 'short' : null;
}

function applyStrategyFillToTrades(ledger: StrategyLedger, fill: StrategyFill): void {
  let remainingQty = fill.qty;
  const oppositeDirection: StrategyDirection = fill.direction === 'long' ? 'short' : 'long';

  while (remainingQty > 0) {
    const tradeIndex = ledger.openTrades.findIndex((trade) => trade.direction === oppositeDirection);
    if (tradeIndex === -1) {
      break;
    }

    const trade = ledger.openTrades[tradeIndex];
    if (!trade) {
      break;
    }

    const closedQty = Math.min(remainingQty, trade.qty);
    const sign = trade.direction === 'long' ? 1 : -1;
    const profit = (fill.price - trade.entryPrice) * closedQty * sign;

    ledger.closedTrades.push({
      ...trade,
      id: `${trade.id}:closed:${ledger.closedTrades.length}`,
      exitOrderId: fill.orderId,
      qty: closedQty,
      exitPrice: fill.price,
      exitBarIndex: fill.barIndex,
      exitTime: fill.time,
      profit,
      commission: trade.commission + fill.commission,
    });

    if (closedQty === trade.qty) {
      ledger.openTrades.splice(tradeIndex, 1);
    } else {
      trade.qty -= closedQty;
    }

    if (profit >= 0) {
      ledger.grossProfit += profit;
    } else {
      ledger.grossLoss += profit;
    }
    ledger.netProfit += profit;
    ledger.equity = ledger.initialCapital + ledger.netProfit;
    remainingQty -= closedQty;
  }

  if (remainingQty > 0) {
    ledger.openTrades.push({
      id: fill.id,
      entryOrderId: fill.orderId,
      direction: fill.direction,
      qty: remainingQty,
      entryPrice: fill.price,
      entryBarIndex: fill.barIndex,
      entryTime: fill.time,
      profit: 0,
      commission: fill.commission,
      maxRunup: 0,
      maxDrawdown: 0,
    });
  }
}
