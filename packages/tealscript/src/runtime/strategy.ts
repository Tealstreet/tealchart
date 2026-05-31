export type StrategyDirection = 'long' | 'short';
export type StrategyOrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type StrategyOrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type StrategyOcaType = 'cancel' | 'reduce' | 'none';

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
  qty: number;
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
