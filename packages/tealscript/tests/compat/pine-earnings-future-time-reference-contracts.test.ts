import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

const bars = [1_000, 3_000, 5_000].map(time => ({ time, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
const source = '//@version=6\nindicator("Expected earnings")\nvalue = earnings.future_time\nplot(value, "Expected")';

// var_earnings.future_time: initial fetch stays unchanged until recalculation, including after the expected date.
describe('earnings.future_time initial metadata', () => {
  it('infers a series int timestamp', () => {
    const result = checkProgram(parse(source));
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find(symbol => symbol.name === 'value')?.type).toEqual({ kind: 'int', qualifier: 'series' });
  });

  it('preserves milliseconds supplied by the host', () => {
    const syminfo = Object.defineProperty({}, 'earnings_future_time', { enumerable: true, value: 2_000 });
    const result = runCompatScript(source, { bars, engineOptions: { runtime: { syminfo } } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Expected').values).toEqual([2_000, 2_000, 2_000]);
  });

  it('returns na when no expected earnings date is available', () => {
    const result = runCompatScript('//@version=6\nindicator("Missing earnings")\nplot(na(earnings.future_time) ? 1 : 0, "Missing")', { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
  });

  it('fetches once, retains the date after it passes, and fetches anew on recalculation', () => {
    let reads = 0;
    const syminfo = Object.defineProperty({}, 'earnings_future_time', {
      enumerable: true, get: () => (++reads === 1 ? 2_000 : 7_000),
    });
    const options = { bars, engineOptions: { runtime: { syminfo } } };
    const first = runCompatScript(source, options);
    expect(first.errors).toEqual([]);
    expect(getPlot(first, 'Expected').values).toEqual([2_000, 2_000, 2_000]);
    expect(reads).toBe(1);
    const recalculated = runCompatScript(source, options);
    expect(recalculated.errors).toEqual([]);
    expect(getPlot(recalculated, 'Expected').values).toEqual([7_000, 7_000, 7_000]);
    expect(reads).toBe(2);
  });
});
