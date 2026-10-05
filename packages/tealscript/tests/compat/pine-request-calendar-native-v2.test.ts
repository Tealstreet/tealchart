import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import fixture from './fixtures/request-calendar-native-v2.json';

// Native TradingView CSV: packages/tealscript/oracle-probes/v2/captures/v2/
// coverage-request-1-v1.csv, chart bars0..8; native requested6m bars0..4.
// Full archive CSV path and SHA are pinned in the fixture; expectations come
// from those CSV cells, not from an engine-generated control.
const modes = [
  ['goff_loff', 'gaps_off', 'lookahead_off'],
  ['goff_lon', 'gaps_off', 'lookahead_on'],
  ['gon_loff', 'gaps_on', 'lookahead_off'],
  ['gon_lon', 'gaps_on', 'lookahead_on'],
] as const;
const source = `//@version=6
indicator("Native requested calendar")
pack() =>
    [dayofweek, time("1D")]
${modes
  .map(
    ([
      mode,
      gaps,
      lookahead,
    ]) => `[day_${mode}, open_${mode}] = request.security(syminfo.tickerid, "6", pack(), gaps=barmerge.${gaps}, lookahead=barmerge.${lookahead})
plot(day_${mode}, title="htf6_${mode}_dayofweek")
plot(open_${mode}, title="htf6_${mode}_daily_open")`,
  )
  .join('\n')}`;

describe('native v2 requested calendar/session context', () => {
  const execution = executeCompiledScript(parse(source), fixture.chartBars, undefined, {
    runtime: { ...fixture.runtime, chart: { type: 'standard' } },
    requestDatafeed: new InMemoryRequestDatafeed([fixture.requestedContext]),
  });
  for (const [title, expected] of Object.entries(fixture.expected)) {
    it(`${title}: native CSV chart bars0..8`, () => {
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') return;
      expect(execution.result.errors).toEqual([]);
      const plot = execution.result.plots.find((p) => p.title === title);
      expect(plot).toBeDefined();
      expect(plot?.values.map((v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v))).toEqual(expected);
    });
  }
});
