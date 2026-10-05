import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 0, 1);
const minute = 60_000;
const chart: Bar[] = Array.from({ length: 6 }, (_, i) => ({
  time: start + i * 2 * minute,
  open: 100 + i,
  high: 150 + i,
  low: 50 + i,
  close: 100 + i,
  volume: 1,
}));
const requested: Bar[] = [11, 21, 31].map((high, i) => ({
  time: start + i * 4 * minute,
  open: high - 1,
  high,
  low: high - 2,
  close: high - 1,
  volume: 1,
}));
const expected = [null, null, 11, 11, 21, 21];

function run(version: number, body: string) {
  return runCompatScript(
    `//@version=${version}
indicator("Requested local history", dynamic_requests=true)
${body}`,
    {
      bars: chart,
      engineOptions: {
        runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'UTC' } },
        requestDatafeed: new InMemoryRequestDatafeed([
          { symbol: 'TEST', timeframe: '2', bars: chart },
          { symbol: 'TEST', timeframe: '4', bars: requested },
        ]),
      },
    },
  );
}

function assertPlot(result: ReturnType<typeof run>, title: string, values = expected) {
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors ?? 0).toBe(0);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expect(getPlot(result, title).values.map((value) => (value === null || Number.isNaN(value) ? null : value))).toEqual(
    values,
  );
}

// TradingView Other timeframes and data: declared-variable requests duplicate
// preceding code that determines the variable, in the requested context.
describe('UDF local history in requested expressions', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains inline and global-alias controls`, () => {
      const result = run(
        version,
        `
globalSource = high
plot(request.security("TEST", "4", high[1], lookahead=barmerge.lookahead_on), "Inline")
plot(request.security("TEST", "4", globalSource[1], lookahead=barmerge.lookahead_on), "Global")`,
      );
      assertPlot(result, 'Inline');
      assertPlot(result, 'Global');
    });

    for (const declaration of [
      'localSource = high',
      'var float localSource = na\n    localSource := high',
      'varip float localSource = na\n    localSource := high',
    ]) {
      it(`v${version} replays ${declaration.startsWith('varip') ? 'reassigned varip' : declaration.startsWith('var') ? 'reassigned persistent' : 'regular'} local history`, () => {
        const result = run(
          version,
          `
requestedHigh(string resolution) =>
    ${declaration}
    request.security("TEST", resolution, localSource[1], lookahead=barmerge.lookahead_on)
plot(requestedHigh("4"), "Local")`,
        );
        assertPlot(result, 'Local');
      });
    }

    for (const chooseHigh of [true, false]) {
      it(`v${version} preserves conditional writes with chooseHigh=${chooseHigh}`, () => {
        const result = run(
          version,
          `
requestedHigh(string resolution, bool chooseHigh) =>
    var float localSource = na
    if chooseHigh
        localSource := high
    else
        localSource := high + 100
    request.security("TEST", resolution, localSource[1], lookahead=barmerge.lookahead_on)
plot(requestedHigh("4", ${chooseHigh}), "Local")`,
        );
        assertPlot(
          result,
          'Local',
          expected.map((value) => (value === null ? null : value + (chooseHigh ? 0 : 100))),
        );
      });
    }

    it(`v${version} preserves dependency assignment order`, () => {
      const result = run(
        version,
        `
requestedHigh(string resolution) =>
    first = high
    second = first + 100
    first := first + 10
    localSource = second - first + high
    request.security("TEST", resolution, localSource[1], lookahead=barmerge.lookahead_on)
plot(requestedHigh("4"), "Local")`,
      );
      assertPlot(
        result,
        'Local',
        expected.map((value) => (value === null ? null : value + 90)),
      );
    });

    it(`v${version} excludes writes after the request`, () => {
      const result = run(
        version,
        `
requestedHigh(string resolution) =>
    localSource = high
    answer = request.security("TEST", resolution, localSource[1], lookahead=barmerge.lookahead_on)
    localSource := 0
    answer
plot(requestedHigh("4"), "Local")`,
      );
      assertPlot(result, 'Local');
    });
  }
});
