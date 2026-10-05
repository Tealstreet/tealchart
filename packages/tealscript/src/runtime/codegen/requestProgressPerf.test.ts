import { expect, it } from 'vitest';
import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

function bars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    time: (i + 1) * 60_000, open: i, high: i + 1, low: i - 1, close: i, volume: 100,
  }));
}

it('advances independent scalar requests through the selected chart time', () => {
  const requested = bars(20_000);
  const compiled = tryCompile(parse(`//@version=6
indicator("requested progress")
previous = request.security("OTHER", "1", ta.valuewhen(true, close, 1))
plot(previous)`));
  expect(compiled.success).toBe(true);
  const script = [...compiled.securityScripts.values()][0]!;
  const Original = script.ScriptClass;
  let evaluated = 0;
  script.ScriptClass = class extends Original {
    onBar(ctx: Parameters<InstanceType<typeof Original>['onBar']>[0]) {
      evaluated += 1;
      super.onBar(ctx);
    }
  };
  const start = process.cpuUsage();
  const result = executeCompiled(compiled, requested.slice(0, 2), undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '1', bars: requested }]),
  })!;
  const cpu = process.cpuUsage(start);
  expect(result.errors).toEqual([]);
  expect(result.plots[0]!.values).toEqual([null, 0]);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(150);
    expect(evaluated).toBe(2);
  }
});

it('retains requested tuple state, duplicate selection and full last-bar metadata', () => {
  const requested = bars(5);
  requested[2]!.time = requested[1]!.time;
  const chart = [0, 1, 2, 3, 4, 2, 5].map((time) => ({ ...requested[0]!, time: time * 60_000 }));
  const compiled = tryCompile(parse(`//@version=6
indicator("requested tuple")
state() =>
    var float total = 0
    total += close
    [total, last_bar_index, barstate.islast ? 1 : 0, close[1]]
[total, last, ending, previous] = request.security("OTHER", "1", state())
plot(total)
plot(last)
plot(ending)
plot(previous)`));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, chart, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '1', bars: requested }]),
  })!;
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([
    [null, 0, 3, 3, 6, 3, 10],
    [null, 4, 4, 4, 4, 4, 4],
    [null, 0, 0, 0, 0, 0, 1],
    [null, null, 1, 1, 2, 1, 3],
  ]);
});

it('restarts a requested cursor when dynamic history sizing grows', () => {
  const requested = bars(620);
  const compiled = tryCompile(parse(`//@version=6
indicator("requested resizing")
offset = bar_index > 600 ? 600 : 1
value = request.security("OTHER", "1", close[offset])
plot(value)`));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, requested, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '1', bars: requested }]),
  })!;
  expect(result.errors).toEqual([]);
  expect(result.plots[0]!.values).toEqual(requested.map((_, i) => i === 0 ? null : i - (i > 600 ? 600 : 1)));
});

it('keeps eager evaluation for reference programs and higher timeframes', () => {
  const requested = bars(6);
  for (const [expression, timeframe] of [['array.from(close)', '1'], ['close', '2'], ['timenow', '1'], ['math.random(0, 1, 7)', '1']]) {
    const compiled = tryCompile(parse(`//@version=6
indicator("eager control")
value = request.security("OTHER", "${timeframe}", ${expression})
plot(close)`));
    expect(compiled.success).toBe(true);
    const script = [...compiled.securityScripts.values()][0]!;
    const Original = script.ScriptClass;
    let evaluated = 0;
    script.ScriptClass = class extends Original {
      onBar(ctx: Parameters<InstanceType<typeof Original>['onBar']>[0]) {
        evaluated += 1;
        super.onBar(ctx);
      }
    };
    const result = executeCompiled(compiled, requested.slice(0, 1), undefined, {
      runtime: { timeframe: { period: '1' } },
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: timeframe!, bars: requested }]),
    })!;
    expect(result.errors).toEqual([]);
    expect(evaluated).toBe(requested.length);
    expect(result.plots[0]!.values).toEqual([0]);
  }
});
