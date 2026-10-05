import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const source = (body: string, version = 6) => `//@version=${version}\nindicator("Documented loop boundaries")\n${body}`;
const bars = Array.from({ length: 3 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 100,
}));

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#dynamic-for-loop-boundaries
// The end expression is evaluated once before each v6 iteration, once in total in v5.
describe('TOP20 job19 documented loop boundaries', () => {
  it.each([
    [6, 2],
    [5, 4],
  ])('v%s follows its documented mutable-bound rule', (version, count) => {
    const result = runCompatScript(
      source(
        `bound = 3
count = 0
for i = 0 to bound
    bound -= 1
    count += 1
plot(count, "count")
plot(bound, "bound")`,
        version,
      ),
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'count').values).toEqual([count, count, count]);
    expect(getPlot(result, 'bound').values).toEqual([3 - count, 3 - count, 3 - count]);
  });

  it.each([
    [6, 3],
    [5, 1],
  ])('v%s evaluates side-effecting end expressions exactly once per boundary check', (version, count) => {
    const result = runCompatScript(
      source(
        `data = array.new<float>()
queue(array<float> values) =>
    values.push(close)
    values.size()
count = 0
for i = 0 to queue(data) - 1
    count += 1
    if count == 3
        break
plot(count, "count")
plot(data.size(), "calls")`,
        version,
      ),
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'count').values).toEqual([count, count, count]);
    expect(getPlot(result, 'calls').values).toEqual([count, count, count]);
  });

  // https://www.tradingview.com/pine-script-docs/language/loops/#scope
  it('keeps the counter local while preserving outer reassignments', () => {
    const result = runCompatScript(
      source(`i = 99
count = 0
for i = 1 to 3
    count += i
plot(i, "outer")
plot(count, "count")`),
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'outer').values).toEqual([99, 99, 99]);
    expect(getPlot(result, 'count').values).toEqual([6, 6, 6]);
    const diagnostics = checkProgram(parse(source('for j = 0 to 1\n    count = j\nplot(j)'))).diagnostics;
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'unknown-identifier' }));
  });

  // https://www.tradingview.com/pine-script-docs/language/loops/#common-characteristics
  it('returns the last evaluated tail across break and continue, and missing values for no iterations', () => {
    const result = runCompatScript(
      source(`broken = for i = 1 to 4
    if i == 3
        break
    i * 10
continued = for i = 1 to 3
    if i == 3
        continue
    i * 10
empty = for i = 0 to int(na)
    i
emptyBool = for i = 0 to int(na)
    true
plot(broken, "broken")
plot(continued, "continued")
plot(empty, "empty")
plot(emptyBool ? 1 : 0, "emptyBool")`),
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'broken').values).toEqual([20, 20, 20]);
    expect(getPlot(result, 'continued').values).toEqual([20, 20, 20]);
    expect(getPlot(result, 'empty').values).toEqual([null, null, null]);
    expect(getPlot(result, 'emptyBool').values).toEqual([0, 0, 0]);
  });
});
