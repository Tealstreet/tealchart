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
      'Calculated outside TealScript from Pine v6 TA formulas and state-machine semantics on taValueBars; supertrend direction follows the Pine public direction < 0 uptrend idiom.',
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
      EMA: [102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957],
      RMA: [null, null, 104.666667, 104.111111, 102.407407, 101.604938, 102.403292, 104.602195, 105.734797, 107.489864, 108.326576, 109.551051],
      SMMA: [null, null, 104.666667, 104.111111, 102.407407, 101.604938, 102.403292, 104.602195, 105.734797, 107.489864, 108.326576, 109.551051],
      WMA: [null, null, 105.5, 104.666667, 101.666667, 100.166667, 101.833333, 105.833333, 107.666667, 109.666667, 110, 111.166667],
      VWMA: [null, null, 104.6, 104.784615, 102.43662, 100.635135, 101.013333, 104.962025, 107.121951, 109.418605, 109.777778, 111.023256],
      SWMA: [null, null, null, 104.833333, 104, 101.833333, 100.833333, 102.666667, 105.666667, 108.166667, 109.5, 110.333333],
      ALMA: [null, null, null, null, 103.054518, 100.423829, 100.807119, 104.100703, 107.305873, 108.841976, 109.980877, 110.662894],
      HMA: [null, null, null, null, null, 97.822222, 101.466667, 108.133333, 110.755556, 111.533333, 111.511111, 111.866667],
      DEMA: [102, 104.25, 106.5, 104.1875, 100.3125, 99.765625, 102.6875, 107.496094, 108.324219, 110.700195, 110.619141, 111.944092],
      TEMA: [102, 104.625, 106.9375, 103.8125, 99.46875, 99.460938, 103.191406, 108.5, 108.664063, 111.02002, 110.469482, 111.897217],
      ATR: [null, null, 5, 5.666667, 5.777778, 5.518519, 5.679012, 6.119342, 5.746228, 5.497485, 5.331657, 5.221105],
      RSI: [null, null, null, 55.555556, 33.333333, 42.028986, 67.479675, 82.162765, 72.361316, 82.015652, 69.821198, 79.13023],
      CCI: [null, null, 87.5, -100, -100, -28.571429, 100, 100, 33.333333, 100, 20, 100],
      MACD: [0, 0.642857, 1.209184, 0.38156, -0.825672, -0.924587, 0.029313, 1.437232, 1.520456, 1.975828, 1.641914, 1.716671],
      'MACD Signal': [0, 0.428571, 0.94898, 0.5707, -0.360214, -0.736463, -0.225946, 0.88284, 1.307917, 1.753191, 1.679006, 1.704116],
      'MACD Hist': [0, 0.214286, 0.260204, -0.18914, -0.465457, -0.188124, 0.255259, 0.554393, 0.212539, 0.222637, -0.037092, 0.012555],
      CMO: [null, null, null, 11.111111, -60, -77.777778, 11.111111, 100, 80, 77.777778, 20, 66.666667],
      TSI: [null, 1, 1, 0.551402, 0.09434, -0.009854, 0.178656, 0.437434, 0.443215, 0.538941, 0.478354, 0.525987],
      Stoch: [null, null, 88.888889, 25, 9.090909, 30.769231, 88.888889, 92.857143, 75, 88.888889, 50, 71.428571],
      MFI: [null, null, null, 62.19351, 26.481507, 28.199275, 63.410771, 100, 70.491803, 72.454835, 37.449393, 68.894009],
      WPR: [null, null, -11.111111, -75, -90.909091, -69.230769, -11.111111, -7.142857, -25, -11.111111, -50, -28.571429],
      'BB Basis': [null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111],
      'BB Upper': [null, null, 108.776276, 108.265986, 109.531973, 104.066013, 105.320494, 111.696907, 111.320494, 111.827772, 112.161105, 112.632993],
      'BB Lower': [null, null, 100.557057, 101.734014, 96.468027, 97.26732, 96.679506, 96.969759, 102.679506, 106.838895, 107.172228, 109.367007],
      BBW: [null, null, 0.078528, 0.062209, 0.126834, 0.067537, 0.085554, 0.141155, 0.080757, 0.04563, 0.045491, 0.029423],
      'KC Basis': [102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957],
      'KC Upper': [111, 111.75, 112.375, 112.9375, 110.46875, 108.984375, 110.992188, 115.246094, 115.373047, 116.936523, 117.218262, 118.359131],
      'KC Lower': [93, 95.25, 98.125, 95.3125, 92.65625, 92.578125, 93.789063, 96.144531, 98.322266, 100.911133, 101.705566, 103.102783],
      KCW: [0.176471, 0.15942, 0.135392, 0.169268, 0.175385, 0.162791, 0.168015, 0.180723, 0.15958, 0.147125, 0.141718, 0.137779],
      Supertrend: [null, null, 116, 116, 112.555556, 109.537037, 109.537037, 109.537037, 109.537037, 98.50503, 100.836686, 100.836686],
      'Supertrend Dir': [null, null, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1],
      'DI+': [null, null, null, 17.647059, 11.538462, 8.053691, 28.695652, 44.989913, 37.741704, 32.362971, 34.750293, 23.6574],
      'DI-': [null, null, null, 11.764706, 30.769231, 33.557047, 21.73913, 13.449899, 9.548818, 6.653913, 4.573912, 9.498185],
      ADX: [null, null, null, null, null, 42.248289, 32.763227, 39.832178, 46.426904, 52.915314, 60.856017, 54.805801],
      SAR: [105, 99, 99, 99.36, 109, 109, 108.48, 96, 96.28, 96.8688, 97.776672, 99.074538],
      VWAP: [102, 103.571429, 104.6, 104.129412, 102.858407, 102.410448, 102.66875, 103.723958, 104.199074, 105.028455, 105.520147, 106.142384],
      'VWAP Anchored': [102, 103.571429, 104.6, 104.129412, 102.858407, 102.410448, 104, 106.758621, 107.121951, 108.160714, 108.517986, 109.119048],
      'VWAP Upper': [102, 105.069727, 106.609975, 105.968774, 105.587689, 105.123635, 104, 109.245208, 109.288156, 110.687547, 110.90003, 111.654063],
      'VWAP Lower': [102, 102.07313, 102.590025, 102.29005, 100.129125, 99.697261, 104, 104.272034, 104.955746, 105.633881, 106.135941, 106.584032],
    },
  },
  {
    name: 'rolling, statistical, event, pivot, and volume helpers',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Calculated outside TealScript from Pine v6 rolling, statistical, event, pivot, and volume formulas on taValueBars.',
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
plot(ta.max(close, open), "Max")
plot(ta.min(close, open), "Min")
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
levels = ta.pivot_point_levels("Traditional", "Daily", false)
plot(array.get(levels, 0), "Pivot P")
plot(array.get(levels, 1), "Pivot S1")
plot(array.get(levels, 2), "Pivot R1")
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
      Highest: [102, 105, 107, 107, 107, 103, 104, 109, 109, 111, 111, 112],
      Lowest: [102, 102, 102, 103, 99, 99, 99, 100, 104, 108, 108, 110],
      'Highest Bars': [0, 0, 0, 1, 2, 2, 0, 0, 1, 0, 1, 0],
      'Lowest Bars': [0, 1, 2, 0, 0, 1, 2, 2, 2, 1, 2, 1],
      Range: [0, 3, 5, 4, 8, 4, 5, 9, 5, 3, 3, 2],
      Change: [null, null, 5, -2, -8, -3, 5, 9, 4, 2, 2, 1],
      Momentum: [null, null, 5, -2, -8, -3, 5, 9, 4, 2, 2, 1],
      ROC: [null, null, 4.901961, -1.904762, -7.476636, -2.912621, 5.050505, 9, 3.846154, 1.834862, 1.851852, 0.900901],
      Rising: [0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1],
      Falling: [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      Max: [102, 105, 107, 107, 103, 100, 104, 109, 109, 111, 111, 112],
      Min: [100, 102, 105, 103, 99, 99, 100, 104, 108, 108, 110, 110],
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
      'Percent Rank': [null, null, 100, 33.333333, 33.333333, 66.666667, 100, 100, 66.666667, 100, 66.666667, 100],
      LinReg: [null, null, 107.166667, 104, 99, 99.166667, 103.5, 108.833333, 109, 110.333333, 110.666667, 111.5],
      RCI: [null, null, 100, -50, -100, -50, 100, 100, 50, 50, 50, 50],
      TR: [6, 5, 4, 7, 6, 5, 6, 7, 5, 5, 5, 5],
      'Bars Since': [0, 0, 0, 1, 2, 0, 0, 0, 1, 0, 1, 0],
      'Value When': [null, 102, 105, 105, 105, 107, 100, 104, 104, 109, 109, 111],
      Cross: [0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1],
      Crossover: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      Crossunder: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
      'Pivot High': [null, null, null, null, 109, null, null, null, null, null, null, 114],
      'Pivot Low': [null, null, null, null, null, null, 96, null, null, null, null, null],
      'Pivot P': [102, 102, 104, 106.333333, 104.666667, 100.333333, 99, 102.666667, 107.333333, 108.333333, 110, 111],
      'Pivot S1': [99, 99, 102, 104.666667, 100.333333, 96.666667, 97, 100.333333, 104.666667, 105.666667, 108, 108],
      'Pivot R1': [105, 105, 107, 108.666667, 107.333333, 102.666667, 102, 106.333333, 111.666667, 110.666667, 113, 113],
      Cum: [102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270],
      'Cum Na': [null, 105, 212, 315, 414, 514, 618, 727, 835, 946, 1056, 1168],
      AccDist: [0, 660, 1110, 217.142857, -716.190476, -86.190476, 780.47619, 1923.333333, 1683.333333, 2583.333333, 1773.333333, 2643.333333],
      III: [0, 660, 450, -892.857143, -933.333333, 630, 866.666667, 1142.857143, -240, 900, -810, 870],
      NVI: [1, 1, 1.019048, 1.019048, 1.019048, 1.029341, 1.029341, 1.029341, 1.019898, 1.019898, 1.010709, 1.010709],
      PVI: [1, 1.029412, 1.029412, 0.990929, 0.952446, 0.952446, 0.990544, 1.038167, 1.038167, 1.067005, 1.067005, 1.086405],
      PVT: [0, 32.352941, 49.495798, 2.766826, -51.602106, -40.996045, 11.003955, 87.927032, 76.917858, 118.584524, 106.422362, 132.785998],
      WAD: [0, 4, 7, 1, -4, 0, 5, 11, 8, 12, 8, 12],
      WVAD: [333.333333, 660, 450, -714.285714, -933.333333, 210, 866.666667, 1142.857143, -240, 900, -270, 580],
      'Bar Index': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'ADX Scalar': [null, null, null, null, null, 42.248289, 32.763227, 39.832178, 46.426904, 52.915314, 60.856017, 54.805801],
      OBV: [0, 1100, 2000, 750, -650, 400, 1700, 3300, 2100, 3600, 2250, 3700],
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
