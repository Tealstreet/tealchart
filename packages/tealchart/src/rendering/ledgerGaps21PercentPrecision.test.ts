import { describe, expect, it } from 'vitest';

import { formatIndicatorOutputAxisValue } from './indicatorOutputAxisLabels';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// constants[44], format.percent remark 1: default precision 2; indicator precision overrides.
describe('ledger820: percent default precision', () => {
  it.each([
    ['main', { paneType: 'main', pricePrecision: 0.000001 }],
    ['indicator', { paneType: 'indicator', pricePrecision: 0.1 }],
    ['unspecified', undefined],
  ] as const)('%s uses two decimals when precision is omitted', (_name, context) => {
    expect(formatIndicatorOutputAxisValue(12.3456, 100, undefined, 'percent', context)).toBe('12.35%');
  });

  it('explicit precision overrides the percent default', () => {
    expect(formatIndicatorOutputAxisValue(12.3456, 100, 3, 'percent', {
      paneType: 'main', pricePrecision: 0.000001,
    })).toBe('12.346%');
  });
});
