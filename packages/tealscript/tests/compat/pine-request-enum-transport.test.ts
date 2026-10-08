import type { Bar, ExecutionResult } from '../../src/runtime';

import { beforeAll, describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const minute = 60_000;
const declarations = `enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"`;
const direction = 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat';

function bars(points: Array<[number, number]>): Bar[] {
  return points.map(([offset, close]) => ({
    time: start + offset * minute,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
}

function code(value: string) {
  return `${value} == Direction.up ? 7 : ${value} == Direction.down ? -4 : ${value} == Direction.flat ? 2 : 99`;
}

function titleCode(value: string) {
  return `str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`;
}

function requestArguments(expression: string, binding: string) {
  return binding === 'named'
    ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
    : `"REMOTE:ALT", "1", ${expression}`;
}

// fun_request.security and fun_request.security_lower_tf expression/returns explicitly permit enum values.
// https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
// The enum entry defines str.tostring titles; three signs reject coercion, chart reuse and fixed-member returns.
describe('requested enum value transport', () => {
  for (const binding of ['positional', 'named']) {
    for (const shape of ['scalar', 'tuple']) {
      const expression = shape === 'tuple' ? `[${direction}, close]` : direction;

      describe(`${shape} enums in security with ${binding} arguments`, () => {
        let result: ExecutionResult;
        beforeAll(() => {
          const target = shape === 'tuple' ? '[value, requestedClose]' : 'value';
          result = runCompatScript(
            `//@version=6
indicator("Requested enum identity")
${declarations}
${target} = request.security(${requestArguments(expression, binding)})
plot(${code('value')}, "Code")
plot(${titleCode('value')}, "Title")
${shape === 'tuple' ? 'plot(requestedClose, "Requested close")' : ''}`,
            {
              bars: bars([
                [0, 900],
                [1, 901],
                [2, 902],
                [3, 903],
              ]),
              engineOptions: {
                requestDatafeed: new InMemoryRequestDatafeed([
                  {
                    symbol: 'REMOTE:ALT',
                    timeframe: '1',
                    bars: bars([
                      [0, -7],
                      [1, 13],
                      [2, 0],
                      [3, -11],
                    ]),
                  },
                ]),
                runtime: { timeframe: { period: '1' } },
              },
            },
          );

          expect(result.errors).toEqual([]);
        });
        it('preserves requested enum identity', () => {
          expect(getPlot(result, 'Code').values).toEqual([-4, 7, 2, -4]);
          if (shape === 'tuple') expect(getPlot(result, 'Requested close').values).toEqual([-7, 13, 0, -11]);
        });
        describe('enum titles after requests', () => {
          it('preserves documented enum titles', () => {
            expect(getPlot(result, 'Title').values).toEqual([-4, 7, 2, -4]);
          });
        });
      });

      describe(`${shape} enums in lower_tf with ${binding} arguments`, () => {
        let result: ExecutionResult;
        beforeAll(() => {
          const target = shape === 'tuple' ? '[values, closes]' : 'values';
          const source = `//@version=6
indicator("Intrabar enum identity")
${declarations}
${target} = request.security_lower_tf(${requestArguments(expression, binding)})
plot(array.size(values), "Count")
${[0, 1, 2]
  .map(
    (index) => `plot(array.size(values) > ${index} ? (${code(`array.get(values, ${index})`)}) : na, "Code ${index}")
plot(array.size(values) > ${index} ? (${titleCode(`array.get(values, ${index})`)}) : na, "Title ${index}")`,
  )
  .join('\n')}
${shape === 'tuple' ? 'plot(array.size(closes) > 0 ? array.get(closes, 0) : na, "Requested close")' : ''}`;
          result = runCompatScript(source, {
            bars: bars([
              [0, 900],
              [3, 901],
              [6, 902],
            ]),
            engineOptions: {
              requestDatafeed: new InMemoryRequestDatafeed([
                {
                  symbol: 'REMOTE:ALT',
                  timeframe: '1',
                  bars: bars([
                    [0, -7],
                    [1, 13],
                    [2, 0],
                    [6, 0],
                    [8, -11],
                    [9, 17],
                  ]),
                },
              ]),
              runtime: { timeframe: { period: '3' } },
            },
          });

          expect(result.errors).toEqual([]);
        });
        it('preserves requested enum identity and intrabar slots', () => {
          expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          [
            [-4, null, 2],
            [7, null, -4],
            [2, null, null],
          ].forEach((values, index) => {
            expect(getPlot(result, `Code ${index}`).values).toEqual(values);
          });
          if (shape === 'tuple') expect(getPlot(result, 'Requested close').values).toEqual([-7, null, 0]);
        });
        describe('enum titles after requests', () => {
          it('preserves documented enum titles', () => {
            [
              [-4, null, 2],
              [7, null, -4],
              [2, null, null],
            ].forEach((values, index) => {
              expect(getPlot(result, `Title ${index}`).values).toEqual(values);
            });
          });
        });
      });
    }
  }
});
