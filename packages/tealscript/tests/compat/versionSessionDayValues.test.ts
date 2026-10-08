import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot } from './fixtures';

// Version ledger row23: omitted days changed from weekdays to all seven days.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#changed-the-default-session-days-for-time-and-time_close
const bars = [5, 6, 7, 8].map((day) => ({
  time: Date.UTC(2024, 0, day, 10), open: 10, high: 12, low: 9, close: 11, volume: 100,
}));

function values(version: number, sessionExpression: string, declarations = '') {
  const source = `//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Session version")
${declarations}
plot(time("60", ${sessionExpression}, "UTC"), "Open")
plot(time_close("60", ${sessionExpression}, "UTC"), "Close")`;
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success, compiled.unsupported.join(', ')).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '60' }, syminfo: { timezone: 'Etc/UTC' } },
  });
  expect(result).not.toBeNull();
  expect(result!.errors).toEqual([]);
  return [getPlot(result!, 'Open').values, getPlot(result!, 'Close').values];
}

function expected(allDays: boolean) {
  return [0, 3_600_000].map((offset) => bars.map((bar, index) => (
    allDays || index === 0 || index === 3 ? bar.time + offset : null
  )));
}

describe('versioned omitted session days: timestamps and session input', () => {
  for (const version of [4, 5, 6]) {
    it(`applies the omitted-day default to time and time_close in v${version}`, () => {
      expect(values(version, '"1000-1200"')).toEqual(expected(version >= 5));
    });

    it(`applies that default to a session input in v${version}`, () => {
      const input = version === 4
        ? 'input("1000-1200", "Hours", type=input.session)'
        : 'input.session("1000-1200", "Hours")';
      expect(values(version, 'hours', `hours = ${input}`)).toEqual(expected(version >= 5));
    });

    it(`keeps explicit weekday and all-day masks independent of v${version}`, () => {
      expect(values(version, '"1000-1200:23456"')).toEqual(expected(false));
      expect(values(version, '"1000-1200:1234567"')).toEqual(expected(true));
    });
  }
});
