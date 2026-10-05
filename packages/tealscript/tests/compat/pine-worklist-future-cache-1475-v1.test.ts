import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [1000, 3000, 5000].map((time) => ({ time, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
const member = 'earnings.future_revenue';
const field = 'earnings_future_revenue';
const source = `//@version=6
indicator("Synthetic forecast cache")
plot(${member}, "First")
plot(${member}, "Second")`;

// Synthetic host values certify caching only; no native provider-value credit.
describe('worklist 1475: earnings.future_revenue initial cache', () => {
  it('reads once across bars and usages, keeps the value, and refreshes on recalculation', () => {
    let reads = 0;
    let available = 1250.5;
    const provider = Object.defineProperty({}, field, {
      enumerable: true,
      get: () => {
        reads += 1;
        const snapshot = available;
        available = 2300.25;
        return snapshot;
      },
    });
    const options = { bars, engineOptions: { runtime: { syminfo: provider } } };
    const first = runCompatScript(source, options);
    expect(first.errors).toEqual([]);
    expect(reads).toBe(1);
    for (const title of ['First', 'Second']) expect(getPlot(first, title).values).toEqual([1250.5, 1250.5, 1250.5]);
    const recalculated = runCompatScript(source, options);
    expect(recalculated.errors).toEqual([]);
    expect(reads).toBe(2);
    for (const title of ['First', 'Second'])
      expect(getPlot(recalculated, title).values).toEqual([2300.25, 2300.25, 2300.25]);
    expect(getPlot(first, 'First').values).toEqual([1250.5, 1250.5, 1250.5]);
  });

  it('keeps an initially unavailable value until a new calculation', () => {
    let reads = 0;
    const provider = Object.defineProperty({}, field, {
      enumerable: true,
      get: () => (++reads === 1 ? Number.NaN : 2300.25),
    });
    const options = { bars, engineOptions: { runtime: { syminfo: provider } } };
    const missingSource = `//@version=6
indicator("Synthetic unavailable cache")
plot(na(${member}) ? 1 : 0, "Unavailable")`;
    const first = runCompatScript(missingSource, options);
    expect(first.errors).toEqual([]);
    expect(getPlot(first, 'Unavailable').values).toEqual([1, 1, 1]);
    expect(reads).toBe(1);
    const recalculated = runCompatScript(missingSource, options);
    expect(recalculated.errors).toEqual([]);
    expect(getPlot(recalculated, 'Unavailable').values).toEqual([0, 0, 0]);
    expect(reads).toBe(2);
    expect(getPlot(first, 'Unavailable').values).toEqual([1, 1, 1]);
  });
});
