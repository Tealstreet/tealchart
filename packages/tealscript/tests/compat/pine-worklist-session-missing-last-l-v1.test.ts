import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot } from './fixtures';

const source = `//@version=6
indicator("Missing final session bar")
plot(session.islastbar ? 1 : 0, "last")
plot(session.islastbar_regular ? 1 : 0, "regular")
plot(session.isfirstbar ? 1 : 0, "first")`;
const options = {
  runtime: {
    syminfo: { timezone: 'Etc/UTC' },
    timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true },
    session: { regular: '0930-1600:23456', timezone: 'Etc/UTC' },
  },
};
function run(minutes: number[]) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, barsAt(minutes), new Map(), options);
  expect(result).not.toBeNull();
  return result!;
}
const barsAt = (minutes: number[]) =>
  minutes.map((minute, index) => ({
    time: Date.UTC(2024, 0, 8, 0, minute),
    open: index + 10,
    high: index + 11,
    low: index + 9,
    close: index + 10,
    volume: 100,
  }));

// https://www.tradingview.com/pine-script-docs/concepts/sessions/#first-and-last-bars
it('does not promote the last available bar when the final session minute is missing', () => {
  const result = run([570, 958]);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'last').values).toEqual([0, 0]);
  expect(getPlot(result, 'regular').values).toEqual([0, 0]);
  expect(getPlot(result, 'first').values).toEqual([1, 0]);
});

it('recognizes the final scheduled minute when it actually exists', () => {
  const result = run([570, 958, 959]);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'last').values).toEqual([0, 0, 1]);
  expect(getPlot(result, 'regular').values).toEqual([0, 0, 1]);
  expect(getPlot(result, 'first').values).toEqual([1, 0, 0]);
});
