import type { Bar } from '../context';
import type { CompiledBarContext } from './compile';

import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const requested: Bar[] = [1, 2, 3, 4].map((close, index) => ({
  time: index * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function run(
  expression: string,
  incremental: boolean,
  options: {
    gaps?: string;
    lookahead?: string;
    chart?: Bar[];
    tuple?: boolean;
  } = {},
) {
  const call = `request.security("OTHER", "1", ${expression}, gaps=barmerge.${options.gaps ?? 'gaps_off'}, lookahead=barmerge.${options.lookahead ?? 'lookahead_off'})`;
  const body = options.tuple ? `[a, b] = ${call}\nplot(a)\nplot(b)` : `plot(${call})`;
  const compiled = tryCompile(parse(`//@version=6\nindicator("Completed request cache")\n${body}`));
  expect(compiled.success).toBe(true);
  const child = [...compiled.securityScripts.values()][0]!;
  expect(child.independentScalarProgram).toBe(true);
  if (!incremental) child.independentScalarProgram = false;
  const onBar = child.ScriptClass.prototype.onBar;
  let completed = false;
  let completedLengthReads = 0;
  child.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    const result = onBar.call(this, ctx);
    if (ctx.barIndex === ctx.lastBarIndex) completed = true;
    return result;
  };
  const bars = new Proxy(requested, {
    get(target, key, receiver) {
      if (completed && key === 'length') completedLengthReads += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const chart = options.chart ?? requested;
  const result = executeCompiled(compiled, chart, undefined, {
    runtime: { syminfo: { tickerid: 'CHART', timezone: 'UTC' }, timeframe: { period: '1' } },
    requestDatafeed: {
      getBars: (query) => ({ ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars } }),
    },
  })!;
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return { plots: result.plots, completedLengthReads };
}

// Counts certify cache retirement, not CPU speed or a native retention rule.
it.each(
  [false, true].flatMap((incremental) =>
    ['gaps_on', 'gaps_off'].flatMap((gaps) =>
      ['lookahead_on', 'lookahead_off'].map((lookahead) => ({ incremental, gaps, lookahead })),
    ),
  ),
)('retires completed missing scalar bars: $incremental $gaps $lookahead', (options) => {
  const chart = Array.from({ length: 8 }, (_, index) => ({ ...requested[0]!, time: index * 60_000 }));
  const result = run('close * float(na)', options.incremental, { ...options, chart });
  expect(result.plots[0]!.values).toEqual(Array(8).fill(null));
  expect(result.completedLengthReads).toBeLessThanOrEqual(options.incremental ? 2 : 1);
});

it.each([false, true])('retains a missing prefix before finite results: incremental=%s', (incremental) => {
  expect(run('bar_index < 2 ? float(na) : close', incremental).plots[0]!.values).toEqual([null, null, 3, 4]);
});

it('retains earlier finite values when later requested values are missing', () => {
  const chart = [...requested, requested[0]!];
  expect(run('bar_index == 0 ? close : float(na)', true, { chart }).plots[0]!.values).toEqual([1, null, null, null, 1]);
});

it('retains all-missing tuple slots', () => {
  const result = run('[float(na), float(na)]', true, { tuple: true });
  expect(result.plots.map((plot) => plot.values)).toEqual([Array(4).fill(null), Array(4).fill(null)]);
});

it('retains a finite zero after missing values', () => {
  expect(run('bar_index < 3 ? float(na) : 0.0', true).plots[0]!.values).toEqual([null, null, null, 0]);
});
