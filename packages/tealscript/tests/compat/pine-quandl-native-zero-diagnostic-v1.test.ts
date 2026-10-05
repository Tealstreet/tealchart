import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const nativeText = 'Invalid symbol: QUANDL:INVALID/__ARG_AUDIT__|0.0';
const previousText = 'request.quandl is deprecated: QUANDL requests are no longer valid';
const provider = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: 'D', bars: compatibilityBars }]);
const nativeSource = `//@version=6
indicator("V3-REQUEST-02", max_bars_back=256)
plot(request.quandl("INVALID/__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
`;

// V3 source890fad / request-02: observed default-index0 text, false ignore flag.
// Other index wording is unobserved; J145b's explicit ignore=true policy stays.
describe('native Quandl index-zero diagnostic', () => {
  it.each([
    ['unchanged native source', nativeSource],
    ['positional zero', 'request.quandl("INVALID/__ARG_AUDIT__", barmerge.gaps_off, 0, false)'],
    ['named zero', 'request.quandl(ticker="INVALID/__ARG_AUDIT__", index=0, ignore_invalid_symbol=false)'],
    [
      'nested zero',
      'request.security("TEST", "D", request.quandl("INVALID/__ARG_AUDIT__", ignore_invalid_symbol=false))',
    ],
  ])('retains the captured error identity for %s', (_, expression) => {
    const source =
      expression === nativeSource ? expression : `//@version=6\nindicator("Quandl identity")\nplot(${expression})`;
    const result = runCompatScript(source, { engineOptions: { requestDatafeed: provider } });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: nativeText,
        code: 'runtime.error',
        runtimeError: expect.objectContaining({ code: 'runtime.error', message: nativeText }),
      }),
    ]);
  });

  it('retains the prefix and stops before the following output', () => {
    const result = runCompatScript(`//@version=6
indicator("Quandl halt prefix")
plot(close, "Before")
plot(request.quandl("INVALID/__ARG_AUDIT__", index=0), "Fault")
plot(close+1, "After")`);
    expect(result.errors[0]?.message).toBe(nativeText);
    expect(getPlot(result, 'Before').values).toEqual([compatibilityBars[0]!.close]);
    expect(result.plots.some((plot) => plot.title === 'After')).toBe(false);
  });

  it.each([
    'request.quandl("INVALID/__ARG_AUDIT__", index=0, ignore_invalid_symbol=true)',
    'request.quandl("INVALID/__ARG_AUDIT__", index=1, ignore_invalid_symbol=true)',
    'request.security("TEST", "D", request.quandl("INVALID/__ARG_AUDIT__", ignore_invalid_symbol=true))',
  ])('keeps missing-and-continue when ignored: %s', (expression) => {
    const result = runCompatScript(
      `//@version=6
indicator("Ignored Quandl")
plot(na(${expression}) ? 1 : 0, "Missing")
plot(close, "After")`,
      { engineOptions: { requestDatafeed: provider } },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual(compatibilityBars.map(() => 1));
    expect(getPlot(result, 'After').values).toEqual(compatibilityBars.map((bar) => bar.close));
  });

  it.each([1, 2])('retains the held wording for unobserved index %s', (index) => {
    const result = runCompatScript(`//@version=6
indicator("Held nonzero Quandl")
plot(request.quandl("INVALID/__ARG_AUDIT__", index=${index}))`);
    expect(result.errors[0]?.message).toBe(previousText);
  });

  it('does not reach a lazy unavailable request', () => {
    const result = runCompatScript(`//@version=6
indicator("Lazy Quandl")
plot(false ? request.quandl("INVALID/__ARG_AUDIT__") : close, "Lazy")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Lazy').values).toEqual(compatibilityBars.map((bar) => bar.close));
  });
});
