import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const currencies = [
  [1601, 'THB', 136], [1602, 'TND', 137], [1603, 'TRY', 98], [1604, 'TWD', 138],
  [1605, 'USDT', 105], [1606, 'VES', 139], [1607, 'VND', 140], [1608, 'ZAR', 99],
] as const;

// Authority: https://www.tradingview.com/pine-script-reference/v6/ constants[index].
describe('ledger gaps41 currency values', () => {
  it.each(currencies)('rank%s currency.%s is its named currency code (constants[%s])', (_rank, code) => {
    const result = runCompatScript(`//@version=6\nindicator("currency code")\nplot(currency.${code} == "${code}" ? 1 : 0, "matching")\nplot(currency.${code} == "USD" ? 1 : 0, "distinct")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'matching').values).toEqual(Array(12).fill(1));
    expect(getPlot(result, 'distinct').values).toEqual(Array(12).fill(0));
  });
});
