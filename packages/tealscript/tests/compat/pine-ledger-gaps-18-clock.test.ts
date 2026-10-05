import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { ExecutionContext } from '../../src/runtime/context';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

afterEach(() => vi.restoreAllMocks());

describe('ledger18 documented timenow observation clock', () => {
  it('samples historical executions instead of freezing the construction timestamp', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const context = new ExecutionContext();
    context.loadBars(compatibilityBars.slice(0, 2));
    context.advanceBar();
    expect(context.timenow.get(0)).toBe(10_000);
    clock.mockReturnValue(10_007);
    context.advanceBar();
    expect(context.timenow.get(0)).toBe(10_007);
    expect(context.timenow.get(1)).toBe(10_000);
  });
  it('updates on realtime executions, retaining confirmed timestamps and staying idle between executions', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(20_000);
    const context = new ExecutionContext();
    context.loadBars(compatibilityBars.slice(0, 1));
    context.advanceBar();
    context.commitBar();
    clock.mockReturnValue(20_010);
    context.startRealtimeBar(compatibilityBars[1]);
    expect(context.timenow.get(0)).toBe(20_010);
    expect(context.timenow.get(1)).toBe(20_000);
    clock.mockReturnValue(20_019);
    expect(context.timenow.get(0)).toBe(20_010);
    context.updateCurrentBar({ ...compatibilityBars[1], close: 108 });
    expect(context.timenow.get(0)).toBe(20_019);
    expect(context.timenow.get(1)).toBe(20_000);
  });
  it('retains the explicit fixed clock injection', () => {
    vi.spyOn(Date, 'now').mockReturnValue(999_999);
    const result = runCompatScript('//@version=6\nindicator("fixed clock")\nplot(timenow, title="clock")', { engineOptions: { runtime: { now: 12_345 } } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'clock').values).toEqual(Array(12).fill(12_345));
  });
  it('changes historical execution timestamps on an independent reload', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(30_000);
    const script = '//@version=6\nindicator("reload clock")\nplot(timenow, title="clock")';
    const first = runCompatScript(script);
    clock.mockReturnValue(40_000);
    const second = runCompatScript(script);
    expect(getPlot(first, 'clock').values).toEqual(Array(12).fill(30_000));
    expect(getPlot(second, 'clock').values).toEqual(Array(12).fill(40_000));
  });
  it('infers series int and rejects simple-only consumers', () => {
    const result = checkProgram(parse('//@version=6\nindicator("clock type")\nvalue = timenow\nf(simple int x) => x\nplot(f(timenow))'));
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]));
  });
});
