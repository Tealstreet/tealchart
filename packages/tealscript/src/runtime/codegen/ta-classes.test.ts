import { describe, expect, it } from 'vitest';
import {
  SMA, EMA, RMA, RSI, Crossover, Crossunder, Change,
  Highest, Lowest, MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
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

    it('ignores NaN', () => {
      const cum = new Cum();
      cum.compute(1);
      expect(cum.compute(NaN)).toBe(1);
      expect(cum.compute(2)).toBe(3);
    });
  });
});
