import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// Authority: native TradingView packages/tealscript/oracle-probes/captures/v1/volume-vwap-v1.csv
// SHA256 0b12395f0c3417a3ad9b4ee1c392064e2fc14ea1702e7b44c20a7faad096f974; rows719-723 cross the observed UTC daily boundary at720.
// The truncated prefix at719 is excluded; expected values720-723 are native CSV cells.
const capture = {
  bars: [
    { open: 78565.26, high: 78581.3, low: 78564.0, close: 78581.29, time: 1788220680000, volume: 14.90362 },
    { open: 78581.3, high: 78581.99, low: 78562.0, close: 78581.98, time: 1788220800000, volume: 14.36791 },
    { open: 78581.99, high: 78630.3, low: 78581.98, close: 78625.99, time: 1788220920000, volume: 19.27006 },
    { open: 78625.99, high: 78695.35, low: 78619.61, close: 78685.96, time: 1788221040000, volume: 12.9965 },
    { open: 78685.97, high: 78685.97, low: 78625.98, close: 78656.53, time: 1788221160000, volume: 16.96003 },
  ],
  native: [null, 78575.32333333332, 78596.76762914943, 78616.33316585279, 78626.95459226453],
};

describe('Native adjudication VWAP daily default', () => {
  it.each([4, 5, 6])('matches the captured v%i variable daily boundary and retains history', (version) => {
    const name = version === 4 ? 'vwap' : 'ta.vwap';
    const result = runCompatScript(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Native variable VWAP")
plot(${name}, "Variable")
plot(${name}[1], "Previous")`, { bars: capture.bars, engineOptions: {
      runtime: { syminfo: { timezone: 'Etc/UTC' }, timeframe: { period: '2' } },
    } });
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'Variable').values;
    const previous = getPlot(result, 'Previous').values;
    expect(previous[0]).toBeNull();
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index], `row${719 + index}`).toBeCloseTo(capture.native[index]!, 8);
      expect(previous[index]).toBe(values[index - 1]);
    }
  });

  it('matches native one-source VWAP after a daily reset and preserves explicit anchors', () => {
    const result = runCompatScript(`//@version=6
indicator("Native daily VWAP")
plot(ta.vwap(hlc3), "Omitted")
plot(ta.vwap(source=hlc3), "Named")
plot(ta.vwap(), "No source")
plot(ta.vwap(hlc3, timeframe.change("1D")), "Daily")
plot(ta.vwap(hlc3, false), "Explicit false")`, { bars: capture.bars, engineOptions: {
      runtime: { syminfo: { timezone: 'Etc/UTC' }, timeframe: { period: '2' } },
    } });
    expect(result.errors).toEqual([]);
    for (const title of ['Omitted', 'Named', 'No source', 'Daily']) {
      const values = getPlot(result, title).values;
      expect(values).toHaveLength(capture.bars.length);
      for (let index = 1; index < values.length; index += 1) {
        expect(values[index], `${title} row${719 + index}`).toBeCloseTo(capture.native[index]!, 8);
      }
    }
    // Native v1 vwap_close_never_anchor stays unavailable until a first true anchor.
    expect(getPlot(result, 'Explicit false').values).toEqual(capture.bars.map(() => null));
  });
});
