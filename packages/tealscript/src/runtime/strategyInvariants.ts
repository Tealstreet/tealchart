import type { StrategyLedger } from './strategy';
import { readStrategyHistoryProp } from './strategy';

export interface StrategyLedgerInvariantViolation {
  invariant: string;
  path: string;
  expected: number | string | null;
  actual: number | string | null;
  message: string;
}

export interface StrategyLedgerInvariantOptions {
  tolerance?: number;
}

const DEFAULT_TOLERANCE = 1e-7;

export function validateStrategyLedgerInvariants(
  ledger: StrategyLedger,
  options: StrategyLedgerInvariantOptions = {},
): StrategyLedgerInvariantViolation[] {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const violations: StrategyLedgerInvariantViolation[] = [];
  const pushNumber = (invariant: string, path: string, actual: number, expected: number, message: string): void => {
    if (!numbersEqual(actual, expected, tolerance)) {
      violations.push({
        invariant,
        path,
        expected: normalizeViolationNumber(expected),
        actual: normalizeViolationNumber(actual),
        message,
      });
    }
  };
  const pushExact = (
    invariant: string,
    path: string,
    actual: number | string | null,
    expected: number | string | null,
    message: string,
  ): void => {
    if (actual !== expected) {
      violations.push({ invariant, path, expected, actual, message });
    }
  };

  for (const [index, point] of ledger.equityCurve.entries()) {
    pushNumber(
      'equity-point-arithmetic',
      `equityCurve[${index}].equity`,
      point.equity,
      ledger.initialCapital + point.netProfit + point.openProfit,
      'Equity curve point must equal initial capital plus point net profit plus point open profit.',
    );
  }

  pushNumber(
    'final-equity-arithmetic',
    'equity',
    ledger.equity,
    ledger.initialCapital + ledger.netProfit + ledger.position.openProfit,
    'Final ledger equity must equal initial capital plus realized net profit plus current open profit.',
  );

  pushNumber(
    'open-position-size',
    'position.size',
    ledger.position.size,
    signedOpenTradeSize(ledger),
    'Open position size must equal the signed sum of open trade quantities.',
  );

  pushExact(
    'closed-trade-count',
    'strategy.closedtrades',
    readStrategyHistoryProp(ledger, 'closedtrades') as number,
    ledger.closedTrades.length,
    'strategy.closedtrades must equal the number of closed trade records.',
  );

  pushExact(
    'open-trade-count',
    'strategy.opentrades',
    readStrategyHistoryProp(ledger, 'opentrades') as number,
    ledger.openTrades.length,
    'strategy.opentrades must equal the number of open trade records.',
  );

  const closedProfit = ledger.closedTrades.reduce((total, trade) => total + trade.profit, 0);
  const fillCommission = ledger.fills.reduce((total, fill) => total + fill.commission, 0);
  pushNumber(
    'closed-profit-minus-commission',
    'netProfit',
    ledger.netProfit,
    closedProfit - fillCommission,
    'Realized net profit must equal closed trade price profit minus all fill commissions.',
  );

  const expectedAverage = positionAveragePriceFromOpenTrades(ledger);
  if (expectedAverage === null) {
    pushExact(
      'flat-position-average-price',
      'position.avgPrice',
      ledger.position.avgPrice,
      null,
      'Flat positions must not retain an average price.',
    );
  } else {
    pushNumber(
      'open-position-average-price',
      'position.avgPrice',
      ledger.position.avgPrice ?? Number.NaN,
      expectedAverage,
      'Position average price must equal the weighted average entry price of open trades.',
    );
  }

  if (ledger.position.size === 0) {
    pushExact(
      'flat-position-direction',
      'position.direction',
      ledger.position.direction,
      null,
      'Flat positions must report no direction.',
    );
    pushNumber(
      'flat-position-open-profit',
      'position.openProfit',
      ledger.position.openProfit,
      0,
      'Flat positions must report zero open profit.',
    );
  }

  return violations;
}

function signedOpenTradeSize(ledger: StrategyLedger): number {
  return ledger.openTrades.reduce((total, trade) => total + (trade.direction === 'long' ? trade.qty : -trade.qty), 0);
}

function positionAveragePriceFromOpenTrades(ledger: StrategyLedger): number | null {
  const absSize = ledger.openTrades.reduce((total, trade) => total + trade.qty, 0);
  if (absSize === 0) {
    return null;
  }
  return ledger.openTrades.reduce((total, trade) => total + trade.entryPrice * trade.qty, 0) / absSize;
}

function numbersEqual(left: number, right: number, tolerance: number): boolean {
  if (Number.isNaN(left) && Number.isNaN(right)) {
    return true;
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return left === right;
  }
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= tolerance * scale;
}

function normalizeViolationNumber(value: number): number | string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  return value;
}
