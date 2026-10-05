import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const header = `//@version=6
indicator("Constructor receiver identity")
type Holder
    string name
    string detail
method new(Holder this, string prefix, string symbol) => "method"`;

describe('UDT constructors and ticker receiver identity', () => {
  it('keeps a UDT constructor distinct from a same-named receiver method', () => {
    const check = checkProgram(
      parse(`${header}
holder = Holder.new("custom", "detail")`),
    );
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(check.symbols.find((s) => s.name === 'holder')?.type).toMatchObject({
      kind: 'udt',
      name: 'Holder',
      qualifier: 'series',
    });
  });
  for (const binding of ['holder']) {
    it(`resolves the constant-return receiver method on ${binding}`, () => {
      const check = checkProgram(
        parse(`${header}
${binding} = Holder.new("custom", "detail")
series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"
result = ${binding}.new(prefix, "AAPL")
simple string accepted = result`),
      );
      expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(check.symbols.find((s) => s.name === 'result')?.type).toMatchObject({
        kind: 'string',
        qualifier: 'const',
      });
    });
  }
  it('executes constructor fields and a non-namespace receiver method', () => {
    const result = runCompatScript(
      `${header}
holder = Holder.new("custom", "detail")
series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"
value = holder.new(prefix, "AAPL")
plot(holder.name == "custom" ? 1 : 0, title="Name")
plot(holder.detail == "detail" ? 1 : 0, title="Detail")
plot(value == "method" ? 1 : 0, title="Method")`,
      { bars: compatibilityBars.slice(0, 3) },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['Name', 'Detail', 'Method']) expect(getPlot(result, title).values, title).toEqual([1, 1, 1]);
  });
  it('retains the independently verified drawing namespace refusal', () => {
    const check = checkProgram(
      parse(`${header}
box = Holder.new("custom", "detail")`),
    );
    expect(check.diagnostics).toContainEqual(expect.objectContaining({ code: 'namespace-obscuring' }));
  });
});
