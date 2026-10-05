import { describe, expect, it } from 'vitest';

import { getOfficialTradingViewLibrary } from '../../src/officialTradingViewLibraries';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const taNotes = 'https://www.tradingview.com/script/BICzyhq0-ta/';
const taV4 =
  'allTimeHigh allTimeLow aroon cagr coppock dema dema2 dm donchian ema2 eom frama ft ht ichimoku ift kvo pzo rms rwi stc stochFull stochRsi supertrend szo t3 t3Alt tema tema2 trima trima2 trix uo vhf vi vzo williamsFractal wpo'.split(
    ' ',
  );
const taV7 =
  'ao aroon atr2 cagr changePercent coppock dema dema2 dm donchian ema2 eom frama ft highestSince ht ichimoku ift kvo lowestSince pzo relativeVolume rma2 rms rwi stc stochFull stochRsi supertrend supertrend2 szo t3 t3Alt tema tema2 trima trix uo vhf vi vStop vStop2 vzo williamsFractal wpo'.split(
    ' ',
  );
const taV8 = [...taV7, 'requestUpAndDownVolume', 'requestVolumeDelta'];
const taV12 = [...taV8, ...'chandelier chandelier2 er kama macd2 pmo ppo ppo2 specialK ulcerIndex'.split(' ')];
const zigZag = ['Settings', 'Pivot', 'ZigZag', 'newInstance', 'lastPivot', 'update'];
const surfaces: Array<{ path: string; names: string[]; authority: string }> = [
  { path: 'TradingView/ta/1', names: ['cagr'], authority: taNotes },
  { path: 'TradingView/ta/4', names: taV4, authority: taNotes },
  ...[7, 8, 9, 10, 12, 14].map((version) => ({
    path: `TradingView/ta/${version}`,
    names: version >= 12 ? taV12 : version >= 8 ? taV8 : taV7,
    authority: taNotes,
  })),
  ...[6, 7, 8, 9].map((version) => ({
    path: `TradingView/ZigZag/${version}`,
    names: version === 6 ? [...zigZag, 'Point'] : zigZag,
    authority: 'https://www.tradingview.com/script/bzIRuGXC-ZigZag/',
  })),
  {
    path: 'TradingView/Color/2',
    authority: 'https://www.tradingview.com/script/Fa4lStNd-Color/',
    names:
      'getRGB getHexString hexStringToRGB hexStringToColor getLRGB lrgbToRGB lrgbToColor getHSL hslToRGB hslToColor getHSV hsvToRGB hsvToColor getHWB hwbToRGB hwbToColor getXYZ xyzToRGB xyzToColor getXYY xyyToRGB xyyToColor getLAB labToRGB labToColor getLCH lchToRGB lchToColor getOKLAB oklabToRGB oklabToColor getOKLCH oklchToRGB oklchToColor contrastRatio isLightTheme grayscale negative complement analogousColors splitComplements triadicColors tetradicColors pentadicColors hexadicColors add overlay fromGradient fromMultiStepGradient gradientPalette monoPalette harmonyPalette'.split(
        ' ',
      ),
  },
  {
    path: 'TradingView/ValueAtTime/2',
    authority: 'https://www.tradingview.com/script/FjIfbP3i-ValueAtTime/',
    names:
      'Data getArrayFromString periodToTimestamp collectData valueAtTime valueAtTimeOffset valueAtPeriodOffset getDataAtTimes getDataAtTimeOffsets getDataAtPeriodOffsets'.split(
        ' ',
      ),
  },
  {
    path: 'TradingView/LibraryCOT/5',
    authority: 'https://www.tradingview.com/script/ysFf2OTq-LibraryCOT/',
    names: ['getCFTCCode', 'COTTickerid', 'requestCommitmentOfTraders'],
  },
  {
    path: 'TradingView/RelativeValue/3',
    authority: 'https://www.tradingview.com/script/cZnSLls2-RelativeValue/',
    names: ['calcCumulativeSeries', 'averageAtTime'],
  },
  {
    path: 'TradingView/TechnicalRating/1',
    authority: 'https://www.tradingview.com/script/jDWyb5PG-TechnicalRating/',
    names: ['calcRatingAll', 'countRising', 'ratingStatus'],
  },
];

describe('published TradingView library exports', () => {
  it.each(surfaces)('$path exposes exactly its published identifiers', ({ path, names, authority }) => {
    const library = getOfficialTradingViewLibrary(path);
    expect(library, authority).toBeDefined();
    const identifiers = new Set(library!.functions.keys());
    const programIdentifiers = new Set<string>();
    for (const statement of library!.program?.body ?? []) {
      if ('exported' in statement && statement.exported && 'name' in statement) {
        identifiers.add(statement.name.name);
        programIdentifiers.add(statement.name.name);
      }
    }
    expect([...identifiers].sort(), authority).toEqual([...names].sort());
    if (library!.library === 'ta') {
      expect([...programIdentifiers].sort(), authority).toEqual([...names].sort());
      expect([...library!.functions.keys()].sort(), authority).toEqual([...names].sort());
    }
  });

  it('rejects removed and not-yet-published TA exports through imported aliases', () => {
    // Official ta release notes: allTimeHigh/allTimeLow/trima2 removed in v7;
    // ao arrived in v5, relativeVolume in v6, vStop in v7, requests in v8, chandelier in v11.
    for (const version of [7, 8, 9, 10, 12, 14]) {
      for (const call of ['allTimeHigh(close)', 'allTimeLow(close)', 'trima2(close, 3)']) {
        const result = runCompatScript(
          `//@version=6\nindicator("removed export")\nimport TradingView/ta/${version} as tvta\nplot(tvta.${call})`,
        );
        expect(result.errors.some((error) => error.message.includes('Unknown library function'))).toBe(true);
        expect(result.plots).toEqual([]);
      }
    }
    for (const [version, call] of [
      [4, 'ao()'],
      [4, 'vStop(close, 3, 1)'],
      [4, 'relativeVolume(3)'],
      [7, 'requestUpAndDownVolume("1")'],
      [10, 'chandelier(3, 3, 2)'],
    ] as const) {
      const diagnostics = checkProgram(
        parse(`//@version=6\nindicator("future export")\nimport TradingView/ta/${version} as tvta\ntvta.${call}`),
      ).diagnostics;
      expect(diagnostics.some((diagnostic) => diagnostic.code === 'unknown-function')).toBe(true);
    }
  }, 60_000);

  it('retains the published all-time and trima2 functions in ta v4', () => {
    // Authority: official ta v2/v3 additions and v7 removals at BICzyhq0-ta.
    // Prefix maxima/minima of closes and a 3-bar triangular window are independently derived.
    const result = runCompatScript(`//@version=6
indicator("historical exports")
import TradingView/ta/4 as tvta
plot(tvta.allTimeHigh(close), "high")
plot(tvta.allTimeLow(close), "low")
plot(tvta.trima2(close, 3), "triangular")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'high').values.slice(0, 5)).toEqual([102, 105, 107, 107, 107]);
    expect(getPlot(result, 'low').values.slice(0, 5)).toEqual([102, 102, 102, 102, 99]);
    expect(getPlot(result, 'triangular').values.slice(0, 5)).toEqual([null, null, 104.75, 105.5, 103]);
  });
});
