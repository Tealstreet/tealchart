import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// https://www.tradingview.com/pine-script-docs/language/execution-model/#time-series-in-scopes
// Parameters and locals retain per-call history; conditionally calling their UDF warrants a consistency warning.
describe('conditional UDF history consistency warning', () => {
  const check = (body: string, version = 6) => checkProgram(parse(`//@version=${version}
indicator("Conditional function history")
${body}`)).diagnostics;

  it.each([
    'plot(bar_index % 5 == 0 ? float(na) : previous(close))',
    'plot(bar_index % 5 == 0 ? previous(close) : float(na))',
    'if bar_index % 5 == 0\n    value = previous(close)',
    'for i = 0 to (bar_index % 5 == 0 ? 1 : int(na))\n    value = previous(close)',
    'value = switch\n    bar_index % 5 == 0 => previous(close)\n    => float(na)',
  ])('warns at the conditional parameter-history call in %s', (call) => {
    const diagnostics = check(`previous(float src) => src[1]\n${call}`);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: 'inconsistent-function-history', severity: 'warning' });
    expect(diagnostics[0]?.message).toContain("'previous'");
  });

  it('warns about a conditional call reading its own local history', () => {
    expect(check(`previous() =>
    basis = close + 7
    basis[1]
plot(bar_index % 5 == 0 ? previous() : float(na))`)).toEqual([
      expect.objectContaining({ code: 'inconsistent-function-history', severity: 'warning', line: 6 }),
    ]);
  });

  it('warns only at the conditional call when the same UDF is also hoisted', () => {
    expect(check(`previous(float src) => src[1]
hoisted = previous(close)
plot(bar_index % 5 == 0 ? hoisted : previous(open))`)).toEqual([
      expect.objectContaining({ code: 'inconsistent-function-history', severity: 'warning', line: 5 }),
    ]);
  });

  it('distinguishes lazy v6 and eager v5 logical operands', () => {
    const body = `rising(float src) => src > src[1]
plot(bar_index % 5 == 0 and rising(close) ? 1 : 0)`;
    expect(check(body)).toEqual([expect.objectContaining({ code: 'inconsistent-function-history', severity: 'warning' })]);
    expect(check(body, 5)).toEqual([]);
  });

  it.each([
    'previous(float src) => src[1]\nplot(previous(close))',
    'previous(float src) => src[1]\nvalue = previous(close)\nplot(bar_index % 5 == 0 ? float(na) : value)',
    'current(float src) => src + 1\nplot(bar_index % 5 == 0 ? float(na) : current(close))',
    'previous(float src) => close[1]\nplot(bar_index % 5 == 0 ? float(na) : previous(close))',
    'previous(float src) => src[1]\nprevious(string src) => src\nlabel.new(bar_index, close, bar_index % 5 == 0 ? previous("text") : "other")',
    'previous(float src) => src[1]\ntype Holder\n    float value\nmethod previous(Holder self) => self.value\nholder = Holder.new(close)\nplot(bar_index % 5 == 0 ? holder.previous() : float(na))',
  ])('keeps the unconditional, no-history, global-history or shadowed callable control silent: %s', (body) => {
    expect(check(body)).toEqual([]);
  });

  it('distinguishes a parameter from the same-named global series', () => {
    expect(check(`src = close
previous(float src) => src[1]
plot(bar_index % 5 == 0 ? previous(src) : float(na))`)).toEqual([
      expect.objectContaining({ code: 'inconsistent-function-history', severity: 'warning' }),
    ]);
  });
});
