import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 1000 }, (_, index) => ({
  time: 1788134400000 + index * 120000,
  open: 1,
  high: 3,
  low: 1,
  close: 2,
  volume: 1,
}));
const source = `//@version=6
indicator("Repeated color parsing")
selected = bar_index % 2 == 0 ? #1234ab : #ff00cc80
float value = 0
for iteration = 0 to 999
    value += color.r(selected)
plot(value)`;

it('keeps repeated exact hex decoding within the execution CPU budget', () => {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  executeCompiled(compiled, bars);
  const started = process.cpuUsage();
  const result = executeCompiled(compiled, bars);
  const cpu = process.cpuUsage(started);
  process.stderr.write(`color-parse-execution-cpu-us ${cpu.user + cpu.system}\n`);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(bars.map((_, index) => (index % 2 === 0 ? 18000 : 255000)));
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(cpu.user + cpu.system).toBeLessThan(110000);
});

it('decodes repeated channels once while keeping exact spellings separate', () => {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const match = String.prototype.match;
  let decodings = 0;
  String.prototype.match = function (
    pattern: string | RegExp | { [Symbol.match](value: string): RegExpMatchArray | null },
  ) {
    if (pattern instanceof RegExp && pattern.source === '^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$') decodings++;
    return Reflect.apply(match, this, [pattern]) as RegExpMatchArray | null;
  };
  try {
    const result = executeCompiled(compiled, bars.slice(0, 10));
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(bars.slice(0, 10).map((_, index) => (index % 2 === 0 ? 18000 : 255000)));
    expect(decodings).toBeLessThanOrEqual(2);
  } finally {
    String.prototype.match = match;
  }
});

it('preserves channels and new transparency after cache turnover', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Color cache turnover")
selected = color.rgb(bar_index % 256, int(bar_index / 256), 204, 50)
converted = color.new(selected, 25)
plot(color.r(converted), "r")
plot(color.g(converted), "g")
plot(color.b(converted), "b")
plot(color.t(converted), "t")`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots.map((plot) => plot.values)).toEqual([
    bars.map((_, index) => index % 256),
    bars.map((_, index) => Math.trunc(index / 256)),
    bars.map(() => 204),
    bars.map(() => 25),
  ]);
});

it('keeps failed parses missing and accepts each exact input spelling', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Color parser inputs")
selected = input.color(#abcdef, "selected")
plot(color.r(selected))
plot(color.g(selected))
plot(color.b(selected))
plot(color.t(color.new(selected, 25)))`),
  );
  expect(compiled.success).toBe(true);
  const initial = executeCompiled(compiled, bars.slice(0, 1));
  const inputId = initial!.inputs[0].id;
  for (const value of ['#abcdef', '#ABCDEF', '#abcdef00', '#ABCDEF80']) {
    const result = executeCompiled(compiled, bars.slice(0, 2), new Map([[inputId, value]]));
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map((plot) => plot.values)).toEqual([
      [171, 171],
      [205, 205],
      [239, 239],
      [25, 25],
    ]);
  }
  for (const value of ['#abc', '#abcdefxx', 'bad']) {
    const result = executeCompiled(compiled, bars.slice(0, 2), new Map([[inputId, value]]));
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map((plot) => plot.values)).toEqual([
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ]);
  }
});

it('bounds retained successful parses during unique-color turnover', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Bounded color decoding")
plot(color.r(color.rgb(bar_index % 256, int(bar_index / 256), 199)))`),
  );
  expect(compiled.success).toBe(true);
  const set = Map.prototype.set;
  let maxRetained = 0;
  Map.prototype.set = function (key: unknown, value: unknown) {
    const result = set.call(this, key, value);
    if (
      typeof key === 'string' &&
      value &&
      typeof value === 'object' &&
      Object.isFrozen(value) &&
      Object.keys(value).join(',') === 'red,green,blue,alpha'
    )
      maxRetained = Math.max(maxRetained, this.size);
    return result;
  };
  try {
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(bars.map((_, index) => index % 256));
    expect(maxRetained).toBeGreaterThan(0);
    expect(maxRetained).toBeLessThanOrEqual(512);
  } finally {
    Map.prototype.set = set;
  }
});
