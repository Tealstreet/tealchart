import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  { slot: 'indicator:title', bad: 'indicator(7)', good: 'indicator("Title")', tail: 'plot(close)' },
  { slot: 'indicator:shorttitle', bad: 'indicator("Title", shorttitle=7)', good: 'indicator("Title", shorttitle="T")', tail: 'plot(close)' },
  { slot: 'indicator:timeframe', bad: 'indicator("Title", timeframe=7)', good: 'indicator("Title", timeframe="60")', tail: 'plot(close)' },
  { slot: 'library:title', bad: 'library(7)', good: 'library("Title")', tail: 'export identity(float x) => x' },
];

describe('documented declaration string option kinds', () => {
  for (const testCase of cases) {
    it(`refuses a numeric ${testCase.slot}`, () => {
      const checked = checkProgram(parse(`//@version=6\n${testCase.bad}\n${testCase.tail}`));
      expect(checked.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });
    it(`accepts a string ${testCase.slot}`, () => {
      const checked = checkProgram(parse(`//@version=6\n${testCase.good}\n${testCase.tail}`));
      expect(checked.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }
});
