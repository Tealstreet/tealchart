import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [{ time: Date.UTC(2024, 0, 2), open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const ast = (body: string) => parse(`//@version=6\nindicator("timestamp overload")\n${body}`);

// Independent UTC calendar arithmetic from the documented timestamp overloads.
describe('timestamp overload with an inferred timezone parameter', () => {
  it('accepts timezone plus seconds inside an untyped chart helper', () => {
    const script = ast(`stamp(zone) => timestamp(zone, 2024, 1, 2, 3, 4, 5)
plot(stamp("UTC"))`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([Date.UTC(2024, 0, 2, 3, 4, 5)]);
  });

  it('preserves the numeric overload and direct timezone overload', () => {
    const script = ast(`plot(timestamp(2024, 1, 2, 3, 4, 5))
plot(timestamp("UTC", 2024, 1, 2, 3, 4, 5))`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars, undefined, { runtime: { syminfo: { timezone: 'UTC' } } });
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[Date.UTC(2024, 0, 2, 3, 4, 5)], [Date.UTC(2024, 0, 2, 3, 4, 5)]]);
  });

  it('retains the numeric ceiling inside a helper with a known int parameter', () => {
    const script = ast(`stamp(int zone) => timestamp(zone, 2024, 1, 2, 3, 4, 5)
plot(stamp(1))`);
    expect(checkProgram(script).diagnostics.some((item) => item.severity === 'error')).toBe(true);
  });

  it('retains the six-argument ceiling for a known numeric first argument', () => {
    expect(checkProgram(ast('plot(timestamp(2024, 1, 2, 3, 4, 5, 6))')).diagnostics.some((item) => /at most 6/.test(item.message))).toBe(true);
  });
});
