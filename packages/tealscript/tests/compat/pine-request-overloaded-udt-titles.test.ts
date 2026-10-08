import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (points: Array<[number, number]>): Bar[] =>
  points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
const leaf = (version: number) => `//@version=${version}
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
export type EnumPayload
    Direction choice
    float price
export type TextPayload
    string choice
    float price
export choose(float value, float price) =>
    chosen = value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat
    EnumPayload.new(chosen, price)
export choose(string value, float price) =>
    TextPayload.new(value, price)`;
const facade = (version: number) => `//@version=${version}
library("Facade")
import Test/Directions/1 as dep
export choose(float value, float price) =>
    dep.choose(value, price)
export choose(string value, float price) =>
    dep.choose(value, price)`;
const options = (version: number, lower: boolean) => ({
  bars: lower
    ? bars([
        [0, 900],
        [3, 700],
        [6, 800],
      ])
    : bars([
        [0, 900],
        [1, 901],
        [2, 902],
        [3, 903],
      ]),
  engineOptions: {
    libraries: new Map([
      ['Test/Directions/1', parse(leaf(version))],
      ['Test/Facade/1', parse(facade(version))],
    ]),
    requestDatafeed: new InMemoryRequestDatafeed([
      {
        symbol: 'REMOTE:ALT',
        timeframe: '1',
        bars: lower
          ? bars([
              [0, -7],
              [1, 13],
              [2, 0],
              [6, 12],
              [8, -11],
              [9, 17],
            ])
          : bars([
              [0, -7],
              [1, 13],
              [2, 0],
              [3, -11],
            ]),
      },
    ]),
    runtime: { timeframe: { period: lower ? '3' : '1' } },
  },
});

// Selected overloads retain their own UDT fields across request contexts.
// Authority: Function overloading, Libraries and Enums manual entries.
describe('requested overloaded imported UDT titles', () => {
  for (const version of [5, 6]) {
    for (const library of ['Directions', 'Facade']) {
      for (const request of ['security', 'security_lower_tf']) {
        for (const plain of [false, true]) {
          it(`v${version} ${library} ${plain ? 'string' : 'enum'} overload through ${request}`, () => {
            const lower = request === 'security_lower_tf';
            const extract = lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested';
            const title = plain
              ? 'str.tostring(extracted.choice) == "Test/Directions/1.Direction.up" ? 7 : 99'
              : 'str.tostring(extracted.choice) == "rising" ? 7 : str.tostring(extracted.choice) == "dip" ? -4 : str.tostring(extracted.choice) == "stillness" ? 2 : 99';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested overloaded UDT titles")
import Test/${library}/1 as lib
requested = request.${request}("REMOTE:ALT", "1", lib.choose(${plain ? '"Test/Directions/1.Direction.up"' : 'close'}, close))
extracted = ${extract}
plot(na(extracted) ? na : ${title}, "Title")
plot(na(extracted) ? na : extracted.price, "Price")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            expect(getPlot(result, 'Title').values).toEqual(
              plain ? (lower ? [7, null, 7] : [7, 7, 7, 7]) : lower ? [-4, null, 7] : [-4, 7, 2, -4],
            );
            expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
    }
  }
});
