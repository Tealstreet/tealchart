import { describe, expect, it } from 'vitest';
import {
  SMA, EMA, RMA, RSI, BarsSince, ValueWhen, Cross, Crossover, Crossunder, Change,
  Highest, Lowest, HighestBars, LowestBars, PivotHigh, PivotLow, Range, Rising, Falling, Max, Min,
  MACD, ATR, DMI, ADX, Supertrend, SAR, Stoch, StdDev, Variance, Dev, Covariance, Correlation, COG, Median, Mode,
  PercentileNearestRank, PercentileLinearInterpolation, PercentRank, LinReg, TrueRange, MFI, TSI, BBW, KC, KCW, KST, VWAP, RCI, BB,
  DEMA, TEMA, Cum, HMA, Mom, ROC, VWMA, SWMA, ALMA, CCI, CMO, WPR,
  AccumulationDistribution, IntradayIntensityIndex, NegativeVolumeIndex, PositiveVolumeIndex, PriceVolumeTrend,
  WilliamsAccumulationDistribution, WilliamsVariableAccumulationDistribution, BarIndex,
} from './ta-classes';
import { parse } from '../../parser';
import { executeScript } from '../engine';
import type { Bar } from '../context';

function makeBars(closes: number[]): Bar[] {
  return closes.map((close, i) => ({
    time: (i + 1) * 60000,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}

function getInterpreterPlot(pine: string, bars: Bar[]): (number | null)[] {
  const ast = parse(pine);
  const result = executeScript(ast, bars);
  return result.plots[0]?.values ?? [];
}

function approxEqual(a: number | null, b: number | null, tol = 1e-10): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < tol;
}

function assertParity(classValues: (number | null)[], interpValues: (number | null)[], label: string) {
  expect(classValues.length).toBe(interpValues.length);
  for (let i = 0; i < classValues.length; i++) {
    if (!approxEqual(classValues[i], interpValues[i])) {
      throw new Error(
        `${label} mismatch at bar ${i}: class=${classValues[i]}, interp=${interpValues[i]}`
      );
    }
  }
}

describe('TA Classes vs Interpreter Parity', () => {
  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = makeBars(closes);

  describe('Event helpers', () => {
    it('matches interpreter for barssince and valuewhen occurrences', () => {
      const barsSince = new BarsSince();
      const currentValue = new ValueWhen(0);
      const previousValue = new ValueWhen(1);
      const barsSinceValues: (number | null)[] = [];
      const currentValues: (number | null)[] = [];
      const previousValues: (number | null)[] = [];

      for (const bar of bars) {
        const condition = bar.close > bar.open;
        const barsSinceValue = barsSince.compute(condition);
        const current = currentValue.compute(condition, bar.close);
        const previous = previousValue.compute(condition, bar.close);
        barsSinceValues.push(barsSinceValue !== barsSinceValue ? null : barsSinceValue);
        currentValues.push(current !== current ? null : current);
        previousValues.push(previous !== previous ? null : previous);
      }

      const barsSinceInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\ncondition = close > open\nplot(ta.barssince(condition))`,
        bars
      );
      const currentInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\ncondition = close > open\nplot(ta.valuewhen(condition, close, 0))`,
        bars
      );
      const previousInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\ncondition = close > open\nplot(ta.valuewhen(condition, close, 1))`,
        bars
      );

      assertParity(barsSinceValues, barsSinceInterpValues, 'BarsSince');
      assertParity(currentValues, currentInterpValues, 'ValueWhen(0)');
      assertParity(previousValues, previousInterpValues, 'ValueWhen(1)');
    });
  });

  describe('SMA', () => {
    it('matches interpreter for length=5', () => {
      const sma = new SMA(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = sma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.sma(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'SMA(5)');
    });

    it('matches interpreter for length=1', () => {
      const sma = new SMA(1);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = sma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.sma(close, 1))`,
        bars
      );

      assertParity(classValues, interpValues, 'SMA(1)');
    });
  });

  describe('EMA', () => {
    it('matches interpreter for length=5', () => {
      const ema = new EMA(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = ema.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.ema(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'EMA(5)');
    });
  });

  describe('RSI', () => {
    it('matches interpreter for length=14', () => {
      const rsi = new RSI(14);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = rsi.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.rsi(close, 14))`,
        bars
      );

      assertParity(classValues, interpValues, 'RSI(14)');
    });
  });

  describe('Crossover', () => {
    it('matches interpreter', () => {
      const cross = new Crossover();
      const sma3 = new SMA(3);
      const sma5 = new SMA(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const a = sma3.compute(c);
        const b = sma5.compute(c);
        return cross.compute(a, b) ? 1 : 0;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.crossover(ta.sma(close, 3), ta.sma(close, 5)) ? 1 : 0)`,
        bars
      );

      assertParity(classValues, interpValues, 'Crossover');
    });
  });

  describe('Crossunder', () => {
    it('matches interpreter', () => {
      const cross = new Crossunder();
      const sma3 = new SMA(3);
      const sma5 = new SMA(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const a = sma3.compute(c);
        const b = sma5.compute(c);
        return cross.compute(a, b) ? 1 : 0;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.crossunder(ta.sma(close, 3), ta.sma(close, 5)) ? 1 : 0)`,
        bars
      );

      assertParity(classValues, interpValues, 'Crossunder');
    });
  });

  describe('Cross', () => {
    it('matches interpreter for either-direction crosses', () => {
      const cross = new Cross();
      const classValues: (number | null)[] = bars.map((bar) => (
        cross.compute(bar.close, 104) ? 1 : 0
      ));

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cross(close, 104) ? 1 : 0)`,
        bars
      );

      assertParity(classValues, interpValues, 'Cross');
    });
  });

  describe('Range/Rising/Falling', () => {
    it('matches interpreter for available-window range', () => {
      const range = new Range(4);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = range.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.range(close, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'Range(4)');
    });

    it('matches interpreter for rising and falling lookbacks', () => {
      const rising = new Rising(2);
      const falling = new Falling(2);
      const risingValues: (number | null)[] = [];
      const fallingValues: (number | null)[] = [];

      for (const close of closes) {
        risingValues.push(rising.compute(close) ? 1 : 0);
        fallingValues.push(falling.compute(close) ? 1 : 0);
      }

      const risingInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.rising(close, 2) ? 1 : 0)`,
        bars
      );
      const fallingInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.falling(close, 2) ? 1 : 0)`,
        bars
      );

      assertParity(risingValues, risingInterpValues, 'Rising(2)');
      assertParity(fallingValues, fallingInterpValues, 'Falling(2)');
    });
  });

  describe('Max/Min', () => {
    it('matches interpreter for element-wise series comparisons', () => {
      const max = new Max();
      const min = new Min();
      const maxValues: (number | null)[] = [];
      const minValues: (number | null)[] = [];

      for (const bar of bars) {
        const maxValue = max.compute(bar.close, bar.open);
        const minValue = min.compute(bar.close, bar.open);
        maxValues.push(maxValue !== maxValue ? null : maxValue);
        minValues.push(minValue !== minValue ? null : minValue);
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
plot(ta.max(close, open))
plot(ta.min(close, open))`), bars);

      assertParity(maxValues, result.plots[0]?.values ?? [], 'Max');
      assertParity(minValues, result.plots[1]?.values ?? [], 'Min');
    });
  });

  describe('HighestBars/LowestBars', () => {
    it('matches interpreter for explicit sources', () => {
      const highestBars = new HighestBars(4);
      const lowestBars = new LowestBars(4);
      const highestValues: (number | null)[] = [];
      const lowestValues: (number | null)[] = [];

      for (const bar of bars) {
        const highest = highestBars.compute(bar.high);
        const lowest = lowestBars.compute(bar.low);
        highestValues.push(highest !== highest ? null : highest);
        lowestValues.push(lowest !== lowest ? null : lowest);
      }

      const highestInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.highestbars(high, 4))`,
        bars
      );
      const lowestInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.lowestbars(low, 4))`,
        bars
      );

      assertParity(highestValues, highestInterpValues, 'HighestBars(4)');
      assertParity(lowestValues, lowestInterpValues, 'LowestBars(4)');
    });
  });

  describe('Variance/Dev', () => {
    it('matches interpreter for biased and unbiased variance', () => {
      const biased = new Variance(4);
      const unbiased = new Variance(4, false);
      const biasedValues: (number | null)[] = [];
      const unbiasedValues: (number | null)[] = [];

      for (const close of closes) {
        const biasedValue = biased.compute(close);
        const unbiasedValue = unbiased.compute(close);
        biasedValues.push(biasedValue !== biasedValue ? null : biasedValue);
        unbiasedValues.push(unbiasedValue !== unbiasedValue ? null : unbiasedValue);
      }

      const biasedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.variance(close, 4))`,
        bars
      );
      const unbiasedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.variance(close, 4, false))`,
        bars
      );

      assertParity(biasedValues, biasedInterpValues, 'Variance(4)');
      assertParity(unbiasedValues, unbiasedInterpValues, 'Variance(4, false)');
    });

    it('matches interpreter for mean absolute deviation', () => {
      const dev = new Dev(4);
      const classValues: (number | null)[] = closes.map((close) => {
        const value = dev.compute(close);
        return value !== value ? null : value;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.dev(close, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'Dev(4)');
    });
  });

  describe('Covariance/Correlation', () => {
    it('matches interpreter for paired covariance and correlation windows', () => {
      const covariance = new Covariance(4);
      const correlation = new Correlation(4);
      const covarianceValues: (number | null)[] = [];
      const correlationValues: (number | null)[] = [];

      for (const bar of bars) {
        const covarianceValue = covariance.compute(bar.close, bar.open);
        const correlationValue = correlation.compute(bar.close, bar.open);
        covarianceValues.push(covarianceValue !== covarianceValue ? null : covarianceValue);
        correlationValues.push(correlationValue !== correlationValue ? null : correlationValue);
      }

      const covarianceInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.covariance(close, open, 4))`,
        bars
      );
      const correlationInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.correlation(close, open, 4))`,
        bars
      );

      assertParity(covarianceValues, covarianceInterpValues, 'Covariance(4)');
      assertParity(correlationValues, correlationInterpValues, 'Correlation(4)');
    });

    it('matches interpreter for flat correlation denominator', () => {
      const correlation = new Correlation(4);
      const classValues: (number | null)[] = bars.map((bar) => {
        const value = correlation.compute(bar.close, 1);
        return value !== value ? null : value;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.correlation(close, 1, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'Correlation flat denominator');
    });
  });

  describe('COG', () => {
    it('matches interpreter for center of gravity', () => {
      const cog = new COG(4);
      const classValues: (number | null)[] = closes.map((close) => {
        const value = cog.compute(close);
        return value !== value ? null : value;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cog(close, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'COG(4)');
    });
  });

  describe('Median/Mode', () => {
    it('matches interpreter for odd and even median windows', () => {
      const odd = new Median(3);
      const even = new Median(4);
      const oddValues: (number | null)[] = [];
      const evenValues: (number | null)[] = [];

      for (const close of closes) {
        const oddValue = odd.compute(close);
        const evenValue = even.compute(close);
        oddValues.push(oddValue !== oddValue ? null : oddValue);
        evenValues.push(evenValue !== evenValue ? null : evenValue);
      }

      const oddInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.median(close, 3))`,
        bars
      );
      const evenInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.median(close, 4))`,
        bars
      );

      assertParity(oddValues, oddInterpValues, 'Median(3)');
      assertParity(evenValues, evenInterpValues, 'Median(4)');
    });

    it('matches interpreter for mode tie behavior', () => {
      const values = [3, 1, 3, 1, 2, 2, 1, 3];
      const mode = new Mode(4);
      const classValues: (number | null)[] = values.map((value) => {
        const result = mode.compute(value);
        return result !== result ? null : result;
      });
      const modeBars = makeBars(values);

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.mode(close, 4))`,
        modeBars
      );

      assertParity(classValues, interpValues, 'Mode(4)');
    });
  });

  describe('Percentiles', () => {
    it('matches interpreter for percentile and percent-rank helpers', () => {
      const nearest = new PercentileNearestRank(4, 75);
      const linear = new PercentileLinearInterpolation(4, 75);
      const rank = new PercentRank(4);
      const nearestValues: (number | null)[] = [];
      const linearValues: (number | null)[] = [];
      const rankValues: (number | null)[] = [];

      for (const close of closes) {
        const nearestValue = nearest.compute(close);
        const linearValue = linear.compute(close);
        const rankValue = rank.compute(close);
        nearestValues.push(nearestValue !== nearestValue ? null : nearestValue);
        linearValues.push(linearValue !== linearValue ? null : linearValue);
        rankValues.push(rankValue !== rankValue ? null : rankValue);
      }

      const nearestInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.percentile_nearest_rank(close, 4, 75))`,
        bars
      );
      const linearInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.percentile_linear_interpolation(close, 4, 75))`,
        bars
      );
      const rankInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.percentrank(close, 4))`,
        bars
      );

      assertParity(nearestValues, nearestInterpValues, 'PercentileNearestRank(4,75)');
      assertParity(linearValues, linearInterpValues, 'PercentileLinearInterpolation(4,75)');
      assertParity(rankValues, rankInterpValues, 'PercentRank(4)');
    });
  });

  describe('LinReg', () => {
    it('matches interpreter for offset and derived-source regression', () => {
      const current = new LinReg(3, 0);
      const offset = new LinReg(3, 1);
      const derived = new LinReg(3, 0);
      const currentValues: (number | null)[] = [];
      const offsetValues: (number | null)[] = [];
      const derivedValues: (number | null)[] = [];

      for (const bar of bars) {
        const currentValue = current.compute(bar.close);
        const offsetValue = offset.compute(bar.close);
        const derivedValue = derived.compute(bar.close - bar.open);
        currentValues.push(currentValue !== currentValue ? null : currentValue);
        offsetValues.push(offsetValue !== offsetValue ? null : offsetValue);
        derivedValues.push(derivedValue !== derivedValue ? null : derivedValue);
      }

      const currentInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.linreg(close, 3, 0))`,
        bars
      );
      const offsetInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.linreg(close, 3, 1))`,
        bars
      );
      const derivedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.linreg(close - open, 3, 0))`,
        bars
      );

      assertParity(currentValues, currentInterpValues, 'LinReg(3,0)');
      assertParity(offsetValues, offsetInterpValues, 'LinReg(3,1)');
      assertParity(derivedValues, derivedInterpValues, 'LinReg(3,0 derived)');
    });
  });

  describe('TrueRange', () => {
    it('matches interpreter handle_na behavior', () => {
      const handle = new TrueRange(true);
      const strict = new TrueRange(false);
      const handleValues: (number | null)[] = [];
      const strictValues: (number | null)[] = [];

      for (const bar of bars) {
        const handleValue = handle.compute(bar.high, bar.low, bar.close);
        const strictValue = strict.compute(bar.high, bar.low, bar.close);
        handleValues.push(handleValue !== handleValue ? null : handleValue);
        strictValues.push(strictValue !== strictValue ? null : strictValue);
      }

      const handleInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.tr(true))`,
        bars
      );
      const strictInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.tr(false))`,
        bars
      );

      assertParity(handleValues, handleInterpValues, 'TrueRange(true)');
      assertParity(strictValues, strictInterpValues, 'TrueRange(false)');
    });
  });

  describe('MFI', () => {
    it('matches interpreter for source and derived-source money flow', () => {
      const typical = new MFI(3);
      const derived = new MFI(3);
      const typicalValues: (number | null)[] = [];
      const derivedValues: (number | null)[] = [];

      for (const bar of bars) {
        const typicalValue = typical.compute((bar.high + bar.low + bar.close) / 3, bar.volume);
        const derivedValue = derived.compute(bar.close - bar.open, bar.volume);
        typicalValues.push(typicalValue !== typicalValue ? null : typicalValue);
        derivedValues.push(derivedValue !== derivedValue ? null : derivedValue);
      }

      const typicalInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.mfi(hlc3, 3))`,
        bars
      );
      const derivedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.mfi(close - open, 3))`,
        bars
      );

      assertParity(typicalValues, typicalInterpValues, 'MFI(3)');
      assertParity(derivedValues, derivedInterpValues, 'MFI(3 derived)');
    });
  });

  describe('TSI', () => {
    it('matches interpreter for source and derived-source double smoothing', () => {
      const closeTsi = new TSI(2, 3);
      const derivedTsi = new TSI(2, 3);
      const closeValues: (number | null)[] = [];
      const derivedValues: (number | null)[] = [];

      for (const bar of bars) {
        const closeValue = closeTsi.compute(bar.close);
        const derivedValue = derivedTsi.compute(bar.close - bar.open);
        closeValues.push(closeValue !== closeValue ? null : closeValue);
        derivedValues.push(derivedValue !== derivedValue ? null : derivedValue);
      }

      const closeInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.tsi(close, 2, 3))`,
        bars
      );
      const derivedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.tsi(close - open, 2, 3))`,
        bars
      );

      assertParity(closeValues, closeInterpValues, 'TSI(2,3)');
      assertParity(derivedValues, derivedInterpValues, 'TSI(2,3 derived)');
    });
  });

  describe('BBW', () => {
    it('matches interpreter for Bollinger Band width', () => {
      const bbw = new BBW(3, 2);
      const classValues: (number | null)[] = [];

      for (const close of closes) {
        const value = bbw.compute(close);
        classValues.push(value !== value ? null : value);
      }

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.bbw(close, 3, 2))`,
        bars
      );

      assertParity(classValues, interpValues, 'BBW(3,2)');
    });
  });

  describe('KC/KCW', () => {
    it('matches interpreter for Keltner channel and width', () => {
      const kc = new KC(3, 1.25);
      const kcw = new KCW(3, 1.25);
      const basisValues: (number | null)[] = [];
      const upperValues: (number | null)[] = [];
      const lowerValues: (number | null)[] = [];
      const widthValues: (number | null)[] = [];

      for (const bar of bars) {
        const [basis, upper, lower] = kc.compute(bar.close, bar.high, bar.low, bar.close);
        const width = kcw.compute(bar.close, bar.high, bar.low, bar.close);
        basisValues.push(basis !== basis ? null : basis);
        upperValues.push(upper !== upper ? null : upper);
        lowerValues.push(lower !== lower ? null : lower);
        widthValues.push(width !== width ? null : width);
      }

      const ast = parse(`//@version=6
indicator("test")
[basis, upper, lower] = ta.kc(close, 3, 1.25)
plot(basis)
plot(upper)
plot(lower)
plot(ta.kcw(close, 3, 1.25))`);
      const result = executeScript(ast, bars);

      assertParity(basisValues, result.plots[0]?.values ?? [], 'KC(3,1.25) basis');
      assertParity(upperValues, result.plots[1]?.values ?? [], 'KC(3,1.25) upper');
      assertParity(lowerValues, result.plots[2]?.values ?? [], 'KC(3,1.25) lower');
      assertParity(widthValues, result.plots[3]?.values ?? [], 'KCW(3,1.25)');
    });
  });

  describe('DMI/ADX', () => {
    it('matches interpreter for directional movement tuple and scalar ADX', () => {
      const dmi = new DMI(5, 4);
      const adx = new ADX(5, 4);
      const plusValues: (number | null)[] = [];
      const minusValues: (number | null)[] = [];
      const dmiAdxValues: (number | null)[] = [];
      const adxValues: (number | null)[] = [];

      for (const bar of bars) {
        const [plus, minus, dmiAdx] = dmi.compute(bar.high, bar.low, bar.close);
        const adxValue = adx.compute(bar.high, bar.low, bar.close);
        plusValues.push(plus !== plus ? null : plus);
        minusValues.push(minus !== minus ? null : minus);
        dmiAdxValues.push(dmiAdx !== dmiAdx ? null : dmiAdx);
        adxValues.push(adxValue !== adxValue ? null : adxValue);
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
[plus, minus, adx] = ta.dmi(5, 4)
plot(plus)
plot(minus)
plot(adx)
plot(ta.adx(5, 4))`), bars);

      assertParity(plusValues, result.plots[0]?.values ?? [], 'DMI(5,4) plus');
      assertParity(minusValues, result.plots[1]?.values ?? [], 'DMI(5,4) minus');
      assertParity(dmiAdxValues, result.plots[2]?.values ?? [], 'DMI(5,4) adx');
      assertParity(adxValues, result.plots[3]?.values ?? [], 'ADX(5,4)');
    });
  });

  describe('Supertrend', () => {
    it('matches interpreter for ATR-seeded trend bands', () => {
      const supertrend = new Supertrend(2, 3);
      const trendValues: (number | null)[] = [];
      const directionValues: (number | null)[] = [];

      for (const bar of bars) {
        const [trend, direction] = supertrend.compute(bar.high, bar.low, bar.close);
        trendValues.push(trend !== trend ? null : trend);
        directionValues.push(direction !== direction ? null : direction);
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
[trend, direction] = ta.supertrend(2, 3)
plot(trend)
plot(direction)`), bars);

      assertParity(trendValues, result.plots[0]?.values ?? [], 'Supertrend(2,3) trend');
      assertParity(directionValues, result.plots[1]?.values ?? [], 'Supertrend(2,3) direction');
    });
  });

  describe('SAR', () => {
    it('matches interpreter for parabolic stop-and-reverse state', () => {
      const sar = new SAR(0.02, 0.02, 0.2);
      const sarValues: (number | null)[] = [];

      for (const bar of bars) {
        const value = sar.compute(bar.high, bar.low);
        sarValues.push(value !== value ? null : value);
      }

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.sar(0.02, 0.02, 0.2))`,
        bars
      );

      assertParity(sarValues, interpValues, 'SAR(0.02,0.02,0.2)');
    });
  });

  describe('KST', () => {
    it('matches interpreter for smoothed ROC tuple output', () => {
      const kst = new KST(2, 3, 4, 5, 2, 2, 2, 3, 2);
      const kstValues: (number | null)[] = [];
      const signalValues: (number | null)[] = [];

      for (const bar of bars) {
        const [line, signal] = kst.compute(bar.close);
        kstValues.push(line !== line ? null : line);
        signalValues.push(signal !== signal ? null : signal);
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
[kst, signal] = ta.kst(close, 2, 3, 4, 5, 2, 2, 2, 3, 2)
plot(kst)
plot(signal)`), bars);

      assertParity(kstValues, result.plots[0]?.values ?? [], 'KST line');
      assertParity(signalValues, result.plots[1]?.values ?? [], 'KST signal');
    });
  });

  describe('VWAP', () => {
    it('matches interpreter for anchored scalar and band output', () => {
      const scalar = new VWAP(false, NaN);
      const bands = new VWAP(true, 1.5);
      const scalarValues: (number | null)[] = [];
      const middleValues: (number | null)[] = [];
      const upperValues: (number | null)[] = [];
      const lowerValues: (number | null)[] = [];

      for (const [index, bar] of bars.entries()) {
        const anchor = index === 0 || index === 6;
        const scalarValue = scalar.compute(bar.close, anchor, bar.volume);
        const [middle, upper, lower] = bands.compute(bar.close, anchor, bar.volume) as [number, number, number];
        scalarValues.push(scalarValue !== scalarValue ? null : scalarValue as number);
        middleValues.push(middle !== middle ? null : middle);
        upperValues.push(upper !== upper ? null : upper);
        lowerValues.push(lower !== lower ? null : lower);
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
anchor = bar_index == 0 or bar_index == 6
plot(ta.vwap(close, anchor))
[middle, upper, lower] = ta.vwap(close, anchor, 1.5)
plot(middle)
plot(upper)
plot(lower)`), bars);

      assertParity(scalarValues, result.plots[0]?.values ?? [], 'VWAP scalar');
      assertParity(middleValues, result.plots[1]?.values ?? [], 'VWAP middle');
      assertParity(upperValues, result.plots[2]?.values ?? [], 'VWAP upper');
      assertParity(lowerValues, result.plots[3]?.values ?? [], 'VWAP lower');
    });
  });

  describe('TA volume variables', () => {
    it('match interpreter values for accumulation and volume index series', () => {
      const volumeBars = bars.map((bar, index) => ({
        ...bar,
        volume: [100, 80, 120, 90, 140, 130, 160, 110, 180, 150][index % 10],
      }));
      const accdist = new AccumulationDistribution();
      const iii = new IntradayIntensityIndex();
      const nvi = new NegativeVolumeIndex();
      const pvi = new PositiveVolumeIndex();
      const pvt = new PriceVolumeTrend();
      const wad = new WilliamsAccumulationDistribution();
      const wvad = new WilliamsVariableAccumulationDistribution();
      const classValues = [accdist, iii, nvi, pvi, pvt, wad, wvad].map(() => [] as (number | null)[]);

      for (const bar of volumeBars) {
        const values = [
          accdist.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          iii.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          nvi.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          pvi.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          pvt.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          wad.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
          wvad.compute(bar.open, bar.high, bar.low, bar.close, bar.volume),
        ];
        for (const [index, value] of values.entries()) {
          classValues[index].push(value !== value ? null : value);
        }
      }

      const result = executeScript(parse(`//@version=6
indicator("test")
plot(ta.accdist)
plot(ta.iii)
plot(ta.nvi)
plot(ta.pvi)
plot(ta.pvt)
plot(ta.wad)
plot(ta.wvad)`), volumeBars);

      for (const [index, label] of ['III', 'NVI', 'PVI', 'PVT', 'WAD', 'WVAD'].entries()) {
        assertParity(classValues[index], result.plots[index]?.values ?? [], label);
      }
    });
  });

  describe('BarIndex', () => {
    it('matches interpreter for the last non-na source bar', () => {
      const barIndex = new BarIndex();
      const classValues: (number | null)[] = [];

      for (const [index, bar] of bars.entries()) {
        const source = index % 4 === 0 ? NaN : bar.close;
        const value = barIndex.compute(source, index);
        classValues.push(value !== value ? null : value);
      }

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nsource = bar_index % 4 == 0 ? na : close\nplot(ta.bar_index(source))`,
        bars
      );

      assertParity(classValues, interpValues, 'ta.bar_index(source)');
    });
  });

  describe('RCI', () => {
    it('matches interpreter for rank correlation windows', () => {
      const rci = new RCI(5);
      const derivedRci = new RCI(5);
      const rciValues: (number | null)[] = [];
      const derivedValues: (number | null)[] = [];

      for (const bar of bars) {
        const value = rci.compute(bar.close);
        const derived = derivedRci.compute(bar.close - bar.open);
        rciValues.push(value !== value ? null : value);
        derivedValues.push(derived !== derived ? null : derived);
      }

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.rci(close, 5))`,
        bars
      );
      const derivedInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.rci(close - open, 5))`,
        bars
      );

      assertParity(rciValues, interpValues, 'RCI(5)');
      assertParity(derivedValues, derivedInterpValues, 'RCI(5 derived)');
    });
  });

  describe('Pivots', () => {
    it('matches interpreter for confirmed high and low pivots', () => {
      const high = new PivotHigh(2, 2);
      const low = new PivotLow(1, 1);
      const highValues: (number | null)[] = [];
      const lowValues: (number | null)[] = [];

      for (const bar of bars) {
        const highValue = high.compute(bar.high);
        const lowValue = low.compute(bar.low);
        highValues.push(highValue !== highValue ? null : highValue);
        lowValues.push(lowValue !== lowValue ? null : lowValue);
      }

      const highInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.pivothigh(high, 2, 2))`,
        bars
      );
      const lowInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.pivotlow(low, 1, 1))`,
        bars
      );

      assertParity(highValues, highInterpValues, 'PivotHigh(2,2)');
      assertParity(lowValues, lowInterpValues, 'PivotLow(1,1)');
    });
  });

  describe('Momentum helpers', () => {
    it('matches interpreter default lengths for momentum and rate of change', () => {
      const mom = new Mom(10);
      const roc = new ROC(1);
      const momValues: (number | null)[] = [];
      const rocValues: (number | null)[] = [];

      for (const close of closes) {
        const momValue = mom.compute(close);
        const rocValue = roc.compute(close);
        momValues.push(momValue !== momValue ? null : momValue);
        rocValues.push(rocValue !== rocValue ? null : rocValue);
      }

      const momInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.mom(close))`,
        bars
      );
      const rocInterpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.roc(close))`,
        bars
      );

      assertParity(momValues, momInterpValues, 'Mom(10)');
      assertParity(rocValues, rocInterpValues, 'ROC(1)');
    });
  });

  describe('MACD', () => {
    it('MACD line matches interpreter', () => {
      const macd = new MACD(12, 26, 9);
      const classValues: (number | null)[] = closes.map((c) => {
        const r = macd.compute(c);
        return r[0] !== r[0] ? null : r[0];
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\n[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)\nplot(macdLine)`,
        bars
      );

      assertParity(classValues, interpValues, 'MACD line');
    });
  });

  describe('ATR', () => {
    it('matches interpreter for length=5', () => {
      const atr = new ATR(5);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = atr.compute(bar.high, bar.low, bar.close);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.atr(5))`,
        bars
      );

      assertParity(classValues, interpValues, 'ATR(5)');
    });
  });

  describe('Highest', () => {
    it('matches interpreter for length=5', () => {
      const h = new Highest(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = h.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.highest(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'Highest(5)');
    });

    it('matches interpreter for default-source length=5', () => {
      const h = new Highest(5);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = h.compute(bar.high);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.highest(5))`,
        bars
      );

      assertParity(classValues, interpValues, 'Highest(5 high)');
    });
  });

  describe('Lowest', () => {
    it('matches interpreter for length=5', () => {
      const l = new Lowest(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = l.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.lowest(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'Lowest(5)');
    });

    it('matches interpreter for default-source length=5', () => {
      const l = new Lowest(5);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = l.compute(bar.low);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.lowest(5))`,
        bars
      );

      assertParity(classValues, interpValues, 'Lowest(5 low)');
    });
  });

  describe('Change', () => {
    it('matches interpreter for length=1', () => {
      const ch = new Change(1);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = ch.compute(c, 1);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.change(close))`,
        bars
      );

      assertParity(classValues, interpValues, 'Change(1)');
    });

    it('matches interpreter for explicit length=4', () => {
      const ch = new Change(4);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = ch.compute(c, 4);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.change(close, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'Change(4)');
    });
  });

  describe('Stoch', () => {
    it('matches interpreter full-window output for length=4', () => {
      const stoch = new Stoch(4);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = stoch.compute(bar.close, bar.high, bar.low);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.stoch(close, high, low, 4))`,
        bars
      );

      assertParity(classValues, interpValues, 'Stoch(4)');
    });
  });

  describe('HMA', () => {
    it('matches interpreter for length=7', () => {
      const hma = new HMA(7);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = hma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.hma(close, 7))`,
        bars
      );

      assertParity(classValues, interpValues, 'HMA(7)');
    });
  });

  describe('SMMA/VWMA', () => {
    it('matches interpreter SMMA through RMA state', () => {
      const rma = new RMA(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = rma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.smma(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'SMMA(5)');
    });

    it('matches interpreter VWMA for length=5', () => {
      const vwma = new VWMA(5);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = vwma.compute(bar.close, bar.volume);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.vwma(close, 5))`,
        bars
      );

      assertParity(classValues, interpValues, 'VWMA(5)');
    });
  });

  describe('SWMA', () => {
    it('matches interpreter', () => {
      const swma = new SWMA();
      const classValues: (number | null)[] = closes.map((c) => {
        const v = swma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.swma(close))`,
        bars
      );

      assertParity(classValues, interpValues, 'SWMA');
    });
  });

  describe('ALMA', () => {
    it('matches interpreter for default floor behavior', () => {
      const alma = new ALMA(5, 0.85, 6);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = alma.compute(c);
        return v !== v ? null : v;
      });

      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.alma(close, 5, 0.85, 6))`,
        bars
      );

      assertParity(classValues, interpValues, 'ALMA');
    });
  });

  describe('CCI/CMO/WPR', () => {
    it('matches interpreter for CCI length=5', () => {
      const cci = new CCI(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = cci.compute(c);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cci(close, 5))`,
        bars
      );
      assertParity(classValues, interpValues, 'CCI(5)');
    });

    it('matches interpreter for CCI default length', () => {
      const cci = new CCI(20);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = cci.compute(c);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cci(close))`,
        bars
      );
      assertParity(classValues, interpValues, 'CCI(20)');
    });

    it('matches interpreter for CMO length=5', () => {
      const cmo = new CMO(5);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = cmo.compute(c);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cmo(close, 5))`,
        bars
      );
      assertParity(classValues, interpValues, 'CMO(5)');
    });

    it('matches interpreter for CMO default length', () => {
      const cmo = new CMO(14);
      const classValues: (number | null)[] = closes.map((c) => {
        const v = cmo.compute(c);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.cmo(close))`,
        bars
      );
      assertParity(classValues, interpValues, 'CMO(14)');
    });

    it('matches interpreter for WPR length=5', () => {
      const wpr = new WPR(5);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = wpr.compute(bar.high, bar.low, bar.close);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.wpr(5))`,
        bars
      );
      assertParity(classValues, interpValues, 'WPR(5)');
    });

    it('matches interpreter for WPR default length', () => {
      const wpr = new WPR(14);
      const classValues: (number | null)[] = bars.map((bar) => {
        const v = wpr.compute(bar.high, bar.low, bar.close);
        return v !== v ? null : v;
      });
      const interpValues = getInterpreterPlot(
        `//@version=6\nindicator("test")\nplot(ta.wpr())`,
        bars
      );
      assertParity(classValues, interpValues, 'WPR(14)');
    });
  });
});

describe('TA Classes — Unit Tests', () => {
  describe('SMA', () => {
    it('save/restore works', () => {
      const sma = new SMA(3);
      sma.compute(1);
      sma.compute(2);
      const snap = sma.save();
      sma.compute(3);
      expect(sma.compute(4)).toBeCloseTo(3); // (2+3+4)/3
      sma.restore(snap);
      expect(sma.compute(3)).toBe(2); // (1+2+3)/3
    });

    it('recompute restores before computing', () => {
      const sma = new SMA(3);
      sma.compute(1);
      sma.compute(2);
      sma.compute(3); // stores snap internally
      const v1 = sma.recompute(4); // should restore to pre-3 state, then compute with 4
      expect(v1).toBeCloseTo((1 + 2 + 4) / 3);
    });
  });

  describe('EMA', () => {
    it('first value is the source itself', () => {
      const ema = new EMA(10);
      expect(ema.compute(5)).toBe(5);
    });

    it('converges toward source', () => {
      const ema = new EMA(3);
      let v = NaN;
      for (let i = 0; i < 100; i++) {
        v = ema.compute(10);
      }
      expect(v).toBeCloseTo(10, 5);
    });
  });

  describe('RMA', () => {
    it('returns NaN before seed period', () => {
      const rma = new RMA(3);
      expect(rma.compute(1)).toBeNaN();
      expect(rma.compute(2)).toBeNaN();
      expect(rma.compute(3)).toBeCloseTo(2); // (1+2+3)/3
    });
  });

  describe('Cum', () => {
    it('accumulates', () => {
      const cum = new Cum();
      expect(cum.compute(1)).toBe(1);
      expect(cum.compute(2)).toBe(3);
      expect(cum.compute(3)).toBe(6);
    });

    it('returns NaN without advancing on NaN input', () => {
      const cum = new Cum();
      cum.compute(1);
      expect(cum.compute(NaN)).toBeNaN();
      expect(cum.compute(2)).toBe(3);
    });
  });
});
