import type { SymInfo } from './runtime/context';

export const CORPORATE_FORECAST_MEMBERS: Record<string, { field: keyof SymInfo; kind: 'float' | 'int' }> = {
  'dividends.future_amount': { field: 'dividends_future_amount', kind: 'float' },
  'dividends.future_ex_date': { field: 'dividends_future_ex_date', kind: 'int' },
  'dividends.future_pay_date': { field: 'dividends_future_pay_date', kind: 'int' },
  'earnings.future_eps': { field: 'earnings_future_eps', kind: 'float' },
  'earnings.future_period_end_time': { field: 'earnings_future_period_end_time', kind: 'int' },
  'earnings.future_revenue': { field: 'earnings_future_revenue', kind: 'float' },
  'earnings.future_time': { field: 'earnings_future_time', kind: 'int' },
};
