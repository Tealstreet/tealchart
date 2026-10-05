import { describe, expect, it } from 'vitest';

import { formatIndicatorOutputAxisValue } from './indicatorOutputAxisLabels';

// Local official indicator.precision: omitted precision inherits chart settings.
describe('ledger779: format.price default and explicit precision', () => {
  it.each(['main', 'indicator'] as const)('%s price outputs inherit chart precision when omitted', (paneType) => {
    expect(formatIndicatorOutputAxisValue(1.23456, 300, undefined, 'price', { paneType, pricePrecision: 0.001 })).toBe(
      '1.235',
    );
    expect(formatIndicatorOutputAxisValue(1.23456, 0.001, undefined, 'price', { paneType, pricePrecision: 0.01 })).toBe(
      '1.23',
    );
  });
  it.each(['main', 'indicator'] as const)('%s explicit precision overrides chart precision', (paneType) => {
    expect(formatIndicatorOutputAxisValue(1.23456, 300, 2, 'price', { paneType, pricePrecision: 0.001 })).toBe('1.23');
  });
  it('generic pane formatting and volume formatting retain their own controls', () => {
    expect(
      formatIndicatorOutputAxisValue(1.23456, 300, undefined, undefined, {
        paneType: 'indicator',
        pricePrecision: 0.001,
      }),
    ).toBe('1.2');
    expect(
      formatIndicatorOutputAxisValue(1234567, 300, 3, 'volume', { paneType: 'indicator', pricePrecision: 0.001 }),
    ).toBe('1.23M');
  });
});
