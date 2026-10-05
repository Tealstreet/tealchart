import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 0, 1);
const bar = (time: number, close: number): Bar => ({
  time,
  close,
  open: close,
  high: close + 1,
  low: close - 1,
  volume: 1,
});
const remoteCloses = [10, 20, 40, 80];
const requested = remoteCloses.map((close, index) => bar(start + index * 360_000, close));
const chart = Array.from({ length: 12 }, (_, index) => bar(start + index * 120_000, 100 + index));

function values(body: string, version = 5) {
  const script = `//@version=${version}\nindicator("Loop source replay")\n${body}`;
  expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = runCompatScript(script, {
    bars: chart,
    engineOptions: {
      runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '6', bars: requested }]),
    },
  });
  expect(result.errors).toEqual([]);
  expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  return getPlot(result, 'Result').values;
}

const getValue = `getValue(int offset) =>
    request.security("TEST", "6", close[offset], lookahead=barmerge.lookahead_on)`;
const repeated = (values: Array<number | null>) => values.flatMap((value) => [value, value, value]);

describe('Requested source replay retains caller loop bindings', () => {
  for (const version of [5, 6]) {
    it(`v${version} captures a numeric loop counter passed to a request UDF`, () => {
      expect(
        values(
          `${getValue}
float total = 0.0
for i = 0 to 1
    total += getValue(i)
plot(total, title="Result")`,
          version,
        ),
      ).toEqual(repeated([null, 30, 60, 120]));
    });
  }

  it('captures a loop-dependent arithmetic argument through a second UDF', () => {
    expect(
      values(`${getValue}
forward(int index) => getValue(index)
float total = 0.0
for i = 1 to 2
    total += forward(i - 1)
plot(total, title="Result")`),
    ).toEqual(repeated([null, 30, 60, 120]));
  });

  it('captures collection-loop values passed to a request UDF', () => {
    expect(
      values(`${getValue}
float total = 0.0
for offset in array.from(0, 1)
    total += getValue(offset)
plot(total, title="Result")`),
    ).toEqual(repeated([null, 30, 60, 120]));
  });

  it('retains a loop counter shadowing a global source alias', () => {
    expect(
      values(`${getValue}
i = 4
float total = 0.0
for i = 0 to 1
    total += getValue(i)
plot(total, title="Result")`),
    ).toEqual(repeated([null, 30, 60, 120]));
  });

  it('preserves the constant request argument control inside a loop', () => {
    expect(
      values(`${getValue}
float total = 0.0
for i = 0 to 1
    total += getValue(0)
plot(total, title="Result")`),
    ).toEqual(repeated(remoteCloses.map((close) => close * 2)));
  });

  it('keeps requested bar history when the caller argument contains both a counter and close', () => {
    expect(
      values(`getValue(float input) =>
    request.security("TEST", "6", input[1], lookahead=barmerge.lookahead_on)
float total = 0.0
for i = 0 to 1
    total += getValue(close + i)
plot(total, title="Result")`),
    ).toEqual(repeated([null, 21, 41, 81]));
  });

  it('still admits the reported string label user method', () => {
    const script = `//@version=5
indicator("Label method")
method label(string direction, int state, float price) => label.new(bar_index, price + state)
id = "bull".label(1, close)
plot(label.get_y(id))`;
    expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  for (const version of [5, 6]) {
    it(`v${version} retains refusal of a direct loop-dependent request expression`, () => {
      const compiled = compile(
        parse(`//@version=${version}
indicator("Direct loop", dynamic_requests=true)
float total = 0.0
for i = 0 to 1
    total += request.security("TEST", "6", close[i])
plot(total)`),
      );
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported).toContain(
        'request.* expression in loop scopes cannot depend on loop variables or loop-mutated values',
      );
    });
  }
});
