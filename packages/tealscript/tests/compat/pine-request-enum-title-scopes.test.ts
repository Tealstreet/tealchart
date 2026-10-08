import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const declarations = `enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"`;
const direction = 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat';
const start = Date.UTC(2026, 9, 1);

function bars(closes: number[], step: number): Bar[] {
  return closes.map((close, index) => ({
    time: start + index * step * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
}

// request.security/security_lower_tf expression and returns preserve enum types, including UDF tuples.
// The enum reference entry requires str.tostring to retrieve the explicit field title.
// Exact title comparisons and enum-spelled string controls reject untyped runtime string replacement.
describe('requested enum title scopes', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const shape of ['tuple UDF expression', 'local tuple with shadow']) {
      it(`preserves titles through ${method} with ${shape}`, () => {
        const target = lower ? '[values, prices]' : '[value, price]';
        const enumValue = lower ? 'array.get(values, 0)' : 'value';
        const requestedPrice = lower ? 'array.get(prices, 0)' : 'price';
        const tupleRequest = `${target} = request.${method}("REMOTE:ALT", "1", [${direction}, close])`;
        let setup: string;
        if (shape === 'tuple UDF expression') {
          setup = `${declarations}
choose() => [${direction}, close]
${target} = request.${method}("REMOTE:ALT", "1", choose())
title = str.tostring(${enumValue})
requestedPrice = ${requestedPrice}`;
        } else {
          setup = `${declarations}
value = "Direction.up"
fetch() =>
    ${tupleRequest}
    [str.tostring(${enumValue}), ${requestedPrice}]
[title, requestedPrice] = fetch()
plot(str.tostring(value) == "Direction.up" ? 1 : 0, "Shadow string")`;
        }
        const result = runCompatScript(`//@version=6
indicator("Requested enum scope")
${setup}
plot(title == "rising" ? 7 : title == "dip" ? -4 : title == "stillness" ? 2 : 99, "Title")
plot(requestedPrice, "Price")
plot(str.tostring("Direction.up") == "Direction.up" ? 1 : 0, "Plain string")`, {
          bars: bars(lower ? [900, 901, 902] : [900, 901, 902, 903], lower ? 2 : 1),
          engineOptions: {
            requestDatafeed: new InMemoryRequestDatafeed([
              { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, 0, -11, 12, 0], 1) },
            ]),
            runtime: { timeframe: { period: lower ? '2' : '1' } },
          },
        });

        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Title').values).toEqual(lower ? [-4, 2, 7] : [-4, 7, 2, -4]);
        expect(getPlot(result, 'Plain string').values).toEqual(lower ? [1, 1, 1] : [1, 1, 1, 1]);
        expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, 0, 12] : [-7, 13, 0, -11]);
        if (shape === 'local tuple with shadow') {
          expect(getPlot(result, 'Shadow string').values).toEqual(lower ? [1, 1, 1] : [1, 1, 1, 1]);
        }
      });
    }
  }
});
