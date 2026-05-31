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
  updatedBarIndex: number;
  updatedTime: number;
}

export interface StrategyOrderInput {
  id: string;
  direction: StrategyDirection;
  qty: number | null;
  qtyType: StrategyQuantityType;
  qtyValue: number;
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
  if (!Number.isFinite(price)) {
    throw new Error('strategy fill price must be finite');
  }

  order.status = 'filled';
  order.filledQty = order.qty;
  order.avgFillPrice = price;
  order.updatedBarIndex = barIndex;
  order.updatedTime = time;

  const fill: StrategyFill = {
    id: `${order.id}:${ledger.fills.length}`,
    orderId: order.id,
    entryId: order.fromEntry,
    direction: order.direction,
    qty: order.qty,
    price,
    commission: 0,
    slippage: 0,
    barIndex,
    time,
    alertMessage: order.alertMessage,
  };
  ledger.fills.push(fill);
  applyStrategyFillToPosition(ledger, fill);
  return fill;
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
