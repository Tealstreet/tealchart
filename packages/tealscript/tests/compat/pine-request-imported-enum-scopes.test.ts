import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars = (values: number[]) =>
  values.map((close, i) => ({
    time: Date.UTC(2026, 9, 1) + i * 60000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 20,
  }));
const lib = (title: string) =>
  parse(`//@version=6
library("${title}")
export enum Direction
    up = "${title} up"
    down = "${title} down"
export type Side
    float up
export choose(float value) =>
    value > 0 ? Direction.up : Direction.down
export value(Side Direction) =>
    Direction.up
`);
for (const requested of [false, true]) {
  it(`keeps defining libraries separate from chart collisions with request ${requested}`, () => {
    const call = (alias: string) =>
      requested ? `request.security("REMOTE", "1", ${alias}.choose(close))` : `${alias}.choose(close)`;
    const result = runCompatScript(
      `//@version=6
indicator("Separate libraries")
import Owner/A/1 as a
import Owner/B/1 as b
enum Direction
    up = "chart up"
    down = "chart down"
x = ${call('a')}
y = ${call('b')}
plot(x == a.Direction.up ? 1 : -1, "A identity")
plot(y == b.Direction.up ? 1 : -1, "B identity")
plot(str.tostring(x) == "A up" ? 1 : str.tostring(x) == "A down" ? -1 : 99, "A title")
plot(str.tostring(y) == "B up" ? 1 : str.tostring(y) == "B down" ? -1 : 99, "B title")`,
      {
        bars: bars([8, 9]),
        engineOptions: {
          libraries: new Map([
            ['Owner/A/1', lib('A')],
            ['Owner/B/1', lib('B')],
          ]),
          runtime: { timeframe: { period: '1' } },
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE', timeframe: '1', bars: bars([-5, 6]) }]),
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    for (const name of ['A identity', 'B identity', 'A title', 'B title'])
      expect(getPlot(result, name).values).toEqual(requested ? [-1, 1] : [1, 1]);
  });
  it(`preserves caller UDT parameter shadow with request ${requested}`, () => {
    const expression = 'observe(a.Side.new(close))';
    const result = runCompatScript(
      `//@version=6
indicator("Caller shadow")
import Owner/A/1 as a
observe(a.Side Direction) =>
    str.tostring(a.choose(Direction.up)) == "A up" ? 1 : str.tostring(a.choose(Direction.up)) == "A down" ? -1 : 99
plot(${requested ? `request.security("REMOTE", "1", ${expression})` : expression}, "Observed")
plot(a.value(a.Side.new(close)), "Field")`,
      {
        bars: bars([8, 9]),
        engineOptions: {
          libraries: new Map([['Owner/A/1', lib('A')]]),
          runtime: { timeframe: { period: '1' } },
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE', timeframe: '1', bars: bars([-5, 6]) }]),
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    expect(getPlot(result, 'Observed').values).toEqual(requested ? [-1, 1] : [1, 1]);
    expect(getPlot(result, 'Field').values).toEqual([8, 9]);
  });
}
