import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { parse } from '../../src/parser';
import type { Bar, ExecutionResult, PlotOutput } from '../../src/runtime';
import { executeScript } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import {
  addExpectedValueProvenanceCount,
  assertExpectedValueProvenanceDeclared,
  countExpectedPlotValues,
  emptyExpectedValueProvenanceCounts,
  type ExpectedValueProvenanceDeclaration,
  type ExpectedValueProvenanceCounts,
} from './behaviorProvenance';
import { getPlot, roundSeries } from './fixtures';

type ExpectedSeries = Array<number | null>;

interface TaValueCase extends ExpectedValueProvenanceDeclaration {
  name: string;
  covers: readonly string[];
  source: string;
  expectedPlots: Record<string, ExpectedSeries>;
}

const taValueBars: Bar[] = [
  [100, 105, 99, 102, 1000],
  [102, 106, 101, 105, 1100],
  [105, 108, 104, 107, 900],
  [107, 109, 102, 103, 1250],
  [103, 104, 98, 99, 1400],
  [99, 101, 96, 100, 1050],
  [100, 105, 99, 104, 1300],
  [104, 110, 103, 109, 1600],
  [109, 111, 106, 108, 1200],
  [108, 112, 107, 111, 1500],
  [111, 114, 109, 110, 1350],
  [110, 113, 108, 112, 1450],
].map(([open, high, low, close, volume], index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open,
  high,
  low,
  close,
  volume,
}));

const manualTaNames = [...new Set(Object.values(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX).flat())]
  .filter((name) => name.startsWith('ta.'))
  .sort();

const tealScriptTaExtensionNames = [
  'ta.adx',
  'ta.bar_index',
  'ta.covariance',
  'ta.dema',
  'ta.smma',
  'ta.tema',
] as const;

const taValueCases: TaValueCase[] = [
  {
    name: 'smoothing, oscillators, channels, and trend state machines',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Calculated outside TealScript from Pine v6 TA formulas and state-machine semantics on taValueBars; SAR initializes on bar 1 per the published helper and native coverage-ta-3-v1 capture; supertrend follows the public helper initialization nz(previous bands, 0), direction=1 while prior ATR is missing, and direction < 0 uptrend idiom. EMA SMA seeding and missing-input masking, percentage BBW and independent KC range use TradingView oscillator-capture policies and independently calculated nested EMA/true-range formulas; MFI startup, explicit VWAP anchor startup, and OBV/PVT availability use TradingView volume-capture policies with independently calculated arithmetic on these hand-built bars.',
    covers: [
      'ta.alma',
      'ta.atr',
      'ta.bb',
      'ta.bbw',
      'ta.cci',
      'ta.cmo',
      'ta.dema',
      'ta.dmi',
      'ta.ema',
      'ta.hma',
      'ta.kc',
      'ta.kcw',
      'ta.macd',
      'ta.mfi',
      'ta.rma',
      'ta.rsi',
      'ta.sar',
      'ta.sma',
      'ta.smma',
      'ta.stoch',
      'ta.supertrend',
      'ta.swma',
      'ta.tema',
      'ta.tsi',
      'ta.vwap',
      'ta.vwma',
      'ta.wma',
      'ta.wpr',
    ],
    source: `//@version=6
indicator("TA value state machines")
plot(ta.sma(close, 3), "SMA")
plot(ta.ema(close, 3), "EMA")
plot(ta.rma(close, 3), "RMA")
plot(ta.smma(close, 3), "SMMA")
plot(ta.wma(close, 3), "WMA")
plot(ta.vwma(close, 3), "VWMA")
plot(ta.swma(close), "SWMA")
plot(ta.alma(close, 5, 0.85, 6), "ALMA")
plot(ta.hma(close, 5), "HMA")
plot(ta.dema(close, 3), "DEMA")
plot(ta.tema(close, 3), "TEMA")
plot(ta.atr(3), "ATR")
plot(ta.rsi(close, 3), "RSI")
plot(ta.cci(close, 3), "CCI")
[m, s, h] = ta.macd(close, 3, 6, 2)
plot(m, "MACD")
plot(s, "MACD Signal")
plot(h, "MACD Hist")
plot(ta.cmo(close, 3), "CMO")
plot(ta.tsi(close, 3, 5), "TSI")
plot(ta.stoch(close, high, low, 3), "Stoch")
plot(ta.mfi(close, 3), "MFI")
plot(ta.wpr(3), "WPR")
[b, u, l] = ta.bb(close, 3, 2)
plot(b, "BB Basis")
plot(u, "BB Upper")
plot(l, "BB Lower")
plot(ta.bbw(close, 3, 2), "BBW")
[kb, ku, kl] = ta.kc(close, 3, 1.5)
plot(kb, "KC Basis")
plot(ku, "KC Upper")
plot(kl, "KC Lower")
plot(ta.kcw(close, 3, 1.5), "KCW")
[st, dir] = ta.supertrend(2, 3)
plot(st, "Supertrend")
plot(dir, "Supertrend Dir")
[dip, dim, adx] = ta.dmi(3, 3)
plot(dip, "DI+")
plot(dim, "DI-")
plot(adx, "ADX")
plot(ta.sar(0.02, 0.02, 0.2), "SAR")
plot(ta.vwap(close), "VWAP")
[vb, vu, vl] = ta.vwap(close, bar_index == 6, 1.0)
plot(vb, "VWAP Anchored")
plot(vu, "VWAP Upper")
plot(vl, "VWAP Lower")
`,
    expectedPlots: {
      SMA: [null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111],
      EMA: [null, null, 104.666667, 103.833333, 101.416667, 100.708333, 102.354167, 105.677083, 106.838542, 108.919271, 109.459635, 110.729818],
      RMA: [null, null, 104.666667, 104.111111, 102.407407, 101.604938, 102.403292, 104.602195, 105.734797, 107.489864, 108.326576, 109.551051],
      SMMA: [null, null, 104.666667, 104.111111, 102.407407, 101.604938, 102.403292, 104.602195, 105.734797, 107.489864, 108.326576, 109.551051],
      WMA: [null, null, 105.5, 104.666667, 101.666667, 100.166667, 101.833333, 105.833333, 107.666667, 109.666667, 110, 111.166667],
      VWMA: [null, null, 104.6, 104.784615, 102.43662, 100.635135, 101.013333, 104.962025, 107.121951, 109.418605, 109.777778, 111.023256],
      SWMA: [null, null, null, 104.833333, 104, 101.833333, 100.833333, 102.666667, 105.666667, 108.166667, 109.5, 110.333333],
      ALMA: [null, null, null, null, 101.918274, 99.97516, 101.504063, 105.458142, 107.88929, 109.296928, 110.200868, 110.912922],
      HMA: [null, null, null, null, null, 97.822222, 101.466667, 108.133333, 110.755556, 111.533333, 111.511111, 111.866667],
      DEMA: [null, null, null, null, 99.527778, 99.409722, 102.527778, 107.425347, 108.293403, 110.687066, 110.613715, 111.941949],
      TEMA: [null, null, null, null, null, null, 103.018519, 108.458044, 108.66305, 111.028356, 110.477503, 111.902868],
      ATR: [null, null, 5, 5.666667, 5.777778, 5.518519, 5.679012, 6.119342, 5.746228, 5.497485, 5.331657, 5.221105],
      RSI: [null, null, null, 55.555556, 33.333333, 42.028986, 67.479675, 82.162765, 72.361316, 82.015652, 69.821198, 79.13023],
      CCI: [null, null, 87.5, -100, -100, -28.571429, 100, 100, 33.333333, 100, 20, 100],
      // SMA-seeded child EMAs; exact-rational 3/6/2 recurrence, rounded to six decimals.
      MACD: [null, null, null, null, null, -1.958333, -0.693452, 0.928784, 1.161185, 1.721159, 1.460984, 1.587924],
      'MACD Signal': [null, null, null, null, null, null, -1.325893, 0.177225, 0.833198, 1.425172, 1.449047, 1.541631],
      'MACD Hist': [null, null, null, null, null, null, 0.63244, 0.751559, 0.327987, 0.295987, 0.011937, 0.046292],
      CMO: [null, null, null, 11.111111, -60, -77.777778, 11.111111, 100, 80, 77.777778, 20, 66.666667],
      TSI: [null, null, null, null, null, null, null, 0.310658, 0.369565, 0.496489, 0.451013, 0.508213],
      Stoch: [null, null, 88.888889, 25, 9.090909, 30.769231, 88.888889, 92.857143, 75, 88.888889, 50, 71.428571],
      MFI: [null, null, 75.468975, 62.19351, 26.481507, 28.199275, 63.410771, 100, 70.491803, 72.454835, 37.449393, 68.894009],
      WPR: [null, null, -11.111111, -75, -90.909091, -69.230769, -11.111111, -7.142857, -25, -11.111111, -50, -28.571429],
      'BB Basis': [null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111],
      'BB Upper': [null, null, 108.776276, 108.265986, 109.531973, 104.066013, 105.320494, 111.696907, 111.320494, 111.827772, 112.161105, 112.632993],
      'BB Lower': [null, null, 100.557057, 101.734014, 96.468027, 97.26732, 96.679506, 96.969759, 102.679506, 106.838895, 107.172228, 109.367007],
      // Re-derived independently from unrounded bands and SMA-seeded EMA
      // recurrences: BBW is percent; KC uses three valid samples for its seed.
      BBW: [null, null, 7.852757, 6.220926, 12.683442, 6.753668, 8.555433, 14.115477, 8.075689, 4.562997, 4.549128, 2.94233],
      'KC Basis': [null, null, 104.666667, 103.833333, 101.416667, 100.708333, 102.354167, 105.677083, 106.838542, 108.919271, 109.459635, 110.729818],
      'KC Upper': [null, null, null, 111.833333, 109.916667, 108.708333, 110.854167, 115.177083, 115.338542, 116.919271, 117.209635, 118.354818],
      'KC Lower': [null, null, null, 95.833333, 92.916667, 92.708333, 93.854167, 96.177083, 98.338542, 100.919271, 101.709635, 103.104818],
      KCW: [null, null, null, 0.154093, 0.167625, 0.158875, 0.16609, 0.179793, 0.159119, 0.146898, 0.141605, 0.137723],
      // Lane D's verified public helper: nz(previous bands, 0) and missing previous ATR.
      Supertrend: [0, null, 116, 116, 112.555556, 109.537037, 109.537037, 109.537037, 109.537037, 98.50503, 100.836686, 100.836686],
      'Supertrend Dir': [1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1],
      // Verified e6bb97364a / native coverage-register-ta-1 DMI seed.
      // Only the TR seed predicate changes this bounded clean control; ADX
      // and every unrelated expected row retain their prior values.
      'DI+': [null, null, null, 18.75, 12.0, 8.275862, 29.20354, 45.479266, 38.032235, 32.536165, 34.877916, 23.716479],
      'DI-': [null, null, null, 12.5, 32.0, 34.482759, 22.123894, 13.596193, 9.622324, 6.689523, 4.59071, 9.521905],
      ADX: [null, null, null, null, null, 42.248289, 32.763227, 39.832178, 46.426904, 52.915314, 60.856017, 54.805801],
      // Published SAR helper initializes at bar 1; subsequent recurrence unchanged.
      SAR: [null, 99, 99, 99.36, 109, 109, 108.48, 96, 96.28, 96.8688, 97.776672, 99.074538],
      VWAP: [102, 103.571429, 104.6, 104.129412, 102.858407, 102.410448, 102.66875, 103.723958, 104.199074, 105.028455, 105.520147, 106.142384],
      'VWAP Anchored': [null, null, null, null, null, null, 104, 106.758621, 107.121951, 108.160714, 108.517986, 109.119048],
      'VWAP Upper': [null, null, null, null, null, null, 104, 109.245208, 109.288156, 110.687547, 110.90003, 111.654063],
      'VWAP Lower': [null, null, null, null, null, null, 104, 104.272034, 104.955746, 105.633881, 106.135941, 106.584032],
    },
  },
  {
    name: 'rolling, statistical, event, pivot, and volume helpers',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Calculated outside TealScript from Pine v6 rolling, statistical, event, pivot, and volume formulas on taValueBars; rising/falling require consecutive strict adjacent changes as established by the TradingView crosses capture. Native register/TA1 captures and original caae3364f3/28cc18d4d1 establish PercentRank prior-bar comparisons and RCI startup after length preceding bars; these arithmetic values are independently derived on the listed closes.',
    covers: [
      'ta.accdist',
      'ta.adx',
      'ta.bar_index',
      'ta.barssince',
      'ta.change',
      'ta.cog',
      'ta.correlation',
      'ta.covariance',
      'ta.cross',
      'ta.crossover',
      'ta.crossunder',
      'ta.cum',
      'ta.dev',
      'ta.falling',
      'ta.highest',
      'ta.highestbars',
      'ta.iii',
      'ta.linreg',
      'ta.lowest',
      'ta.lowestbars',
      'ta.max',
      'ta.median',
      'ta.min',
      'ta.mode',
      'ta.mom',
      'ta.nvi',
      'ta.obv',
      'ta.percentile_linear_interpolation',
      'ta.percentile_nearest_rank',
      'ta.percentrank',
      'ta.pivot_point_levels',
      'ta.pivothigh',
      'ta.pivotlow',
      'ta.pvi',
      'ta.pvt',
      'ta.range',
      'ta.rci',
      'ta.rising',
      'ta.roc',
      'ta.stdev',
      'ta.tr',
      'ta.valuewhen',
      'ta.variance',
      'ta.wad',
      'ta.wvad',
    ],
    source: `//@version=6
indicator("TA value rolling helpers")
plot(ta.highest(close, 3), "Highest")
plot(ta.lowest(close, 3), "Lowest")
plot(ta.highestbars(close, 3), "Highest Bars")
plot(ta.lowestbars(close, 3), "Lowest Bars")
plot(ta.range(close, 3), "Range")
plot(ta.change(close, 2), "Change")
plot(ta.mom(close, 2), "Momentum")
plot(ta.roc(close, 2), "ROC")
plot(ta.rising(close, 2) ? 1 : 0, "Rising")
plot(ta.falling(close, 2) ? 1 : 0, "Falling")
plot(ta.max(close), "Max")
plot(ta.min(close), "Min")
plot(ta.stdev(close, 3), "Stdev")
plot(ta.variance(close, 3), "Variance")
plot(ta.dev(close, 3), "Dev")
plot(ta.covariance(close, open, 3), "Covariance")
plot(ta.correlation(close, open, 3), "Correlation")
plot(ta.cog(close, 3), "COG")
plot(ta.median(close, 3), "Median")
plot(ta.mode(close, 3), "Mode")
plot(ta.percentile_nearest_rank(close, 3, 50), "Nearest Rank")
plot(ta.percentile_linear_interpolation(close, 3, 50), "Linear Percentile")
plot(ta.percentrank(close, 3), "Percent Rank")
plot(ta.linreg(close, 3, 0), "LinReg")
plot(ta.rci(close, 3), "RCI")
plot(ta.tr(true), "TR")
plot(ta.barssince(close > open), "Bars Since")
plot(ta.valuewhen(close > open, close, 1), "Value When")
plot(ta.cross(close, open) ? 1 : 0, "Cross")
plot(ta.crossover(close, open) ? 1 : 0, "Crossover")
plot(ta.crossunder(close, open) ? 1 : 0, "Crossunder")
plot(ta.pivothigh(high, 1, 1), "Pivot High")
plot(ta.pivotlow(low, 1, 1), "Pivot Low")
levels = ta.pivot_point_levels("Traditional", true, false)
plot(array.get(levels, 0), "Pivot P")
plot(array.get(levels, 2), "Pivot S1")
plot(array.get(levels, 1), "Pivot R1")
plot(ta.cum(close), "Cum")
plot(ta.cum(bar_index == 0 ? na : close), "Cum Na")
plot(ta.accdist, "AccDist")
plot(ta.iii, "III")
plot(ta.nvi, "NVI")
plot(ta.pvi, "PVI")
plot(ta.pvt, "PVT")
plot(ta.wad, "WAD")
plot(ta.wvad, "WVAD")
plot(ta.bar_index(close), "Bar Index")
plot(ta.adx(3, 3), "ADX Scalar")
plot(ta.obv(close, volume), "OBV")
`,
    expectedPlots: {
      Highest: [null, null, 107, 107, 107, 103, 104, 109, 109, 111, 111, 112],
      Lowest: [null, null, 102, 103, 99, 99, 99, 100, 104, 108, 108, 110],
      'Highest Bars': [null, null, 0, -1, -2, -2, 0, 0, -1, 0, -1, 0],
      'Lowest Bars': [null, null, -2, 0, 0, -1, -2, -2, -2, -1, -2, -1],
      Range: [null, null, 5, 4, 8, 4, 5, 9, 5, 3, 3, 2],
      Change: [null, null, 5, -2, -8, -3, 5, 9, 4, 2, 2, 1],
      Momentum: [null, null, 5, -2, -8, -3, 5, 9, 4, 2, 2, 1],
      ROC: [null, null, 4.901961, -1.904762, -7.476636, -2.912621, 5.050505, 9, 3.846154, 1.834862, 1.851852, 0.900901],
      // Native na-holes-crosses-v1 establishes adjacent-direction streaks.
      // At9/11 the preceding change fell, and at3 it rose: only one change in
      // the new direction has occurred, short of the requested two changes.
      Rising: [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      Falling: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      Max: [102, 105, 107, 107, 107, 107, 107, 109, 109, 111, 111, 112],
      Min: [102, 102, 102, 102, 99, 99, 99, 99, 99, 99, 99, 99],
      Stdev: [null, null, 2.054805, 1.632993, 3.265986, 1.699673, 2.160247, 3.681787, 2.160247, 1.247219, 1.247219, 0.816497],
      Variance: [null, null, 4.222222, 2.666667, 10.666667, 2.888889, 4.666667, 13.555556, 4.666667, 1.555556, 1.555556, 0.666667],
      Dev: [null, null, 1.777778, 1.333333, 2.666667, 1.555556, 2, 3.111111, 2, 1.111111, 1.111111, 0.666667],
      Covariance: [null, null, 4.111111, -1.333333, 2.666667, 4, -1.666667, 7.666667, 5.666667, 0, -0.222222, -0.333333],
      Correlation: [null, null, 0.973684, -0.39736, 0.5, 0.720577, -0.453921, 0.963928, 0.712468, 0, -0.142857, -0.327327],
      COG: [null, null, -1.984076, -2.006349, -2.02589, -2.009934, -1.983498, -1.971246, -1.987539, -1.993902, -1.993921, -1.996997],
      Median: [null, null, 105, 105, 103, 100, 100, 104, 108, 109, 110, 111],
      Mode: [null, null, 102, 103, 99, 99, 99, 100, 104, 108, 108, 110],
      'Nearest Rank': [null, null, 105, 105, 103, 100, 100, 104, 108, 109, 110, 111],
      'Linear Percentile': [null, null, 105, 105, 103, 100, 100, 104, 108, 109, 110, 111],
      // Native rank_clean_builtin / 18ace021d3: preceding-three population and length+1 startup.
      'Percent Rank': [null, null, null, 33.333333, 0, 33.333333, 100, 100, 66.666667, 100, 66.666667, 100],
      LinReg: [null, null, 107.166667, 104, 99, 99.166667, 103.5, 108.833333, 109, 110.333333, 110.666667, 111.5],
      // Native RCI startup / d9e0a1aaa0: one more physical observation before publication.
      RCI: [null, null, null, -50, -100, -50, 100, 100, 50, 50, 50, 50],
      TR: [6, 5, 4, 7, 6, 5, 6, 7, 5, 5, 5, 5],
      'Bars Since': [0, 0, 0, 1, 2, 0, 0, 0, 1, 0, 1, 0],
      'Value When': [null, 102, 105, 105, 105, 107, 100, 104, 104, 109, 109, 111],
      Cross: [0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1],
      Crossover: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      Crossunder: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
      'Pivot High': [null, null, null, null, 109, null, null, null, null, null, null, 114],
      'Pivot Low': [null, null, null, null, null, null, 96, null, null, null, null, null],
      'Pivot P': [null, 102, 104, 106.333333, 104.666667, 100.333333, 99, 102.666667, 107.333333, 108.333333, 110, 111],
      'Pivot S1': [null, 99, 102, 104.666667, 100.333333, 96.666667, 97, 100.333333, 104.666667, 105.666667, 108, 108],
      'Pivot R1': [null, 105, 107, 108.666667, 107.333333, 102.666667, 102, 106.333333, 111.666667, 110.666667, 113, 113],
      Cum: [102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270],
      'Cum Na': [null, 105, 212, 315, 414, 514, 618, 727, 835, 946, 1056, 1168],
      AccDist: [0, 660, 1110, 217.142857, -716.190476, -86.190476, 780.47619, 1923.333333, 1683.333333, 2583.333333, 1773.333333, 2643.333333],
      III: [0, 660, 450, -892.857143, -933.333333, 630, 866.666667, 1142.857143, -240, 900, -810, 870],
      NVI: [1, 1, 1.019048, 1.019048, 1.019048, 1.029341, 1.029341, 1.029341, 1.019898, 1.019898, 1.010709, 1.010709],
      PVI: [1, 1.029412, 1.029412, 0.990929, 0.952446, 0.952446, 0.990544, 1.038167, 1.038167, 1.067005, 1.067005, 1.086405],
      PVT: [null, 32.352941, 49.495798, 2.766826, -51.602106, -40.996045, 11.003955, 87.927032, 76.917858, 118.584524, 106.422362, 132.785998],
      WAD: [0, 4, 7, 1, -4, 0, 5, 11, 8, 12, 8, 12],
      WVAD: [333.333333, 660, 450, -714.285714, -933.333333, 210, 866.666667, 1142.857143, -240, 900, -270, 580],
      'Bar Index': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'ADX Scalar': [null, null, null, null, null, 42.248289, 32.763227, 39.832178, 46.426904, 52.915314, 60.856017, 54.805801],
      OBV: [null, 1100, 2000, 750, -650, 400, 1700, 3300, 2100, 3600, 2250, 3700],
    },
  },
];

function expectExpectedPlots(result: ExecutionResult, expectedPlots: Record<string, ExpectedSeries>): void {
  for (const [title, expected] of Object.entries(expectedPlots)) {
    expect(roundSeries(getPlot(result, title).values)).toEqual(expected);
  }
}

function compileAndRun(source: string): ExecutionResult {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed for TA value behavior script: ${compiled.unsupported.join(', ')}`);
  }

  const result = executeCompiled(compiled, taValueBars);
  if (!result) {
    throw new Error('Compiled TA value behavior script returned null');
  }
  return result;
}

function expectPlotParity(left: PlotOutput[], right: PlotOutput[]): void {
  expect(left.map((plot) => plot.title)).toEqual(right.map((plot) => plot.title));
  for (let index = 0; index < left.length; index++) {
    expect(roundSeries(left[index]!.values)).toEqual(roundSeries(right[index]!.values));
  }
}

function expectedValueProvenanceCounts(): ExpectedValueProvenanceCounts {
  const counts = emptyExpectedValueProvenanceCounts();
  for (const entry of taValueCases) {
    assertExpectedValueProvenanceDeclared(entry);
    addExpectedValueProvenanceCount(counts, entry.expectedValueProvenance, countExpectedPlotValues(entry.expectedPlots));
  }
  return counts;
}

describe('Pine v6 TA value behavior', () => {
  it('has a value assertion for every official ta.* manual-index name', () => {
    const covered = [...new Set(taValueCases.flatMap((entry) => entry.covers))].sort();
    const manualTaNameSet = new Set<string>(manualTaNames);
    const coveredOfficial = covered.filter((name) => manualTaNameSet.has(name));
    const coveredExtensions = covered.filter((name) => !manualTaNameSet.has(name));
    expect(coveredOfficial).toEqual(manualTaNames);
    expect(coveredExtensions).toEqual([...tealScriptTaExtensionNames].sort());
  });

  it('declares provenance for every literal expected value', () => {
    expect(expectedValueProvenanceCounts()).toEqual({
      'independently-derived': 1056,
      'published-worked-example': 0,
      'tealscript-regression-pin': 0,
    });
  });

  for (const entry of taValueCases) {
    it(`matches fixed v6 value references for ${entry.name}`, () => {
      const interpreted = executeScript(parse(entry.source), taValueBars);
      expect(interpreted.errors).toEqual([]);
      expectExpectedPlots(interpreted, entry.expectedPlots);

      const compiled = compileAndRun(entry.source);
      expect(compiled.errors).toEqual([]);
      expectExpectedPlots(compiled, entry.expectedPlots);
      expectPlotParity(compiled.plots, interpreted.plots);
    });
  }
});
