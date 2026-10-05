import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ranks1844-1846/1874: v6 migration, history-referencing operator section.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#history-referencing-operator
const record = 'type Record\n    float price\nobject = Record.new(close)\n';
function errors(body: string, version: number) {
  return checkProgram(parse(`//@version=${version}\nindicator("History syntax")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

describe('ledger47 versioned history syntax', () => {
  for (const value of ['6', '1.5', '"text"', 'true', '#ff0000', 'color.red', 'math.pi', 'plot.style_line', 'barmerge.gaps_on']) {
    it(`v6 refuses history directly on ${value}`, () => {
      expect(errors(`value = ${value}[1]`, 6).some((d) => d.code === 'invalid-history-reference')).toBe(true);
    });
    it(`v5 retains history on ${value}`, () => {
      expect(errors(`value = ${value}[1]`, 5)).toEqual([]);
    });
  }
  it('v6 refuses direct UDT field history', () => {
    expect(errors(record + 'value = object.price[1]', 6).some((d) => d.code === 'invalid-history-reference')).toBe(
      true,
    );
  });
  it('v5 admits direct UDT field history', () => {
    expect(errors(record + 'value = object.price[1]', 5)).toEqual([]);
  });
  for (const body of [
    record + 'value = (object[1]).price',
    record + 'price = object.price\nvalue = price[1]',
    'constant = 7\nvalue = constant[1]',
    'value = close[1]',
    'value = barstate.isfirst[1]',
    'value = timeframe.period[1]',
  ]) {
    it(`v6 retains legal history ${body.split('\n').at(-1)}`, () => {
      expect(errors(body, 6).map((d) => d.message)).toEqual([]);
    });
  }
});
