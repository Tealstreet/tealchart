import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const capture = fs.readFileSync(new URL('../../oracle-probes/v2/captures/v2/mfi-flat-flows-v2.csv', import.meta.url), 'utf8').trim().split(/\r?\n/);
const headers = capture[0].split(',');
const rows = capture.slice(1, -1).map((row) => row.split(','));
const column = (name: string) => headers.indexOf(name);
const bars = rows.map((row) => ({
  time: Number(row[column('input_time')]), open: Number(row[column('input_open')]), high: Number(row[column('input_high')]),
  low: Number(row[column('input_low')]), close: Number(row[column('input_close')]), volume: Number(row[column('input_volume')]),
}));
const setup = `//@version=6
indicator("Native compound association")
change = ta.change(close)
up = volume * (change <= 0.0 ? 0.0 : close)
down = volume * (change >= 0.0 ? 0.0 : close)
`;
const udf = `rolling(src) =>
    var float older = na
    var float newest = na
    var float total = 0.0
    var int count = 0
    if not na(src)
        removed = count >= 2 ? older : 0.0
        total += src - removed
        older := newest
        newest := src
        count += 1
    count >= 2 ? total : na
plot(rolling(up), "up")
plot(rolling(down), "down")
`;
const root = ['up', 'down'].map((name) => `var float ${name}Older = na
var float ${name}Newest = na
var float ${name}Total = 0.0
var int ${name}Count = 0
if not na(${name})
    removed = ${name}Count >= 2 ? ${name}Older : 0.0
    ${name}Total += ${name} - removed
    ${name}Older := ${name}Newest
    ${name}Newest := ${name}
    ${name}Count += 1
plot(${name}Count >= 2 ? ${name}Total : na, "${name}")
`).join('\n');

describe('native compound addition with a subtraction RHS', () => {
  const results = new Map<string, ReturnType<typeof executeScript>>();
  beforeAll(() => {
    for (const [scope, body] of [['UDF', udf], ['root', root]]) results.set(scope, executeScript(parse(setup + body), bars));
  });
  for (const scope of ['UDF', 'root']) {
    for (const flow of ['up', 'down']) {
      it(`${scope} ${flow} follows all 24133 historical native values`, () => {
        const result = results.get(scope)!;
        expect(result.errors).toEqual([]);
        expect(rows).toHaveLength(24133);
        const expected = rows.map((row) => row[column(`rolling_difference_${flow}`)] === '' ? null : Number(row[column(`rolling_difference_${flow}`)]));
        const actual = result.plots.find((plot) => plot.title === flow)?.values;
        expect(actual).toHaveLength(expected.length);
        const firstMismatch = expected.findIndex((value, index) => !Object.is(actual?.[index], value));
        expect(firstMismatch, `${scope} ${flow} first differing historical bar`).toBe(-1);
      });
    }
  }
});
