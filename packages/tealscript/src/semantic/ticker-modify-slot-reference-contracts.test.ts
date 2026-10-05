import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function check(setup: string, call: string) {
  return checkProgram(parse(`//@version=6
indicator("Ticker modify slots")
${setup}
modified = ${call}`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

// fun_ticker.modify overload params: tickerid/session/adjustment accept series strings; futures enums cap at simple.
describe('ticker.modify documented parameter slots', () => {
  it.each(['tickerid', 'session', 'adjustment'])('accepts every string qualifier for %s', (slot) => {
    const value = slot === 'tickerid' ? 'TEST' : slot === 'session' ? 'regular' : 'none';
    for (const declaration of [`const string choice = "${value}"`, `choice = input.string("${value}")`,
      `simple string choice = "${value}"`, `series string choice = "${value}"`]) {
      const call = slot === 'tickerid' ? 'ticker.modify(choice)' : `ticker.modify("TEST", ${slot}=choice)`;
      expect(check(declaration, call)).toEqual([]);
    }
  });

  it.each(['tickerid', 'session', 'adjustment'])('rejects numeric and bool values for %s', (slot) => {
    for (const value of ['17', 'true']) {
      const call = slot === 'tickerid' ? `ticker.modify(${value})` : `ticker.modify("TEST", ${slot}=${value})`;
      expect(check('', call)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(slot) }),
      ]));
    }
  });

  it.each(['backadjustment', 'settlement_as_close'])('accepts const and simple %s selectors', (slot) => {
    expect(check('', `ticker.modify("TEST", ${slot}=${slot}.on)`)).toEqual([]);
    expect(check('enabled = input.bool(true)', `ticker.modify("TEST", ${slot}=enabled ? ${slot}.on : ${slot}.off)`)).toEqual([]);
    expect(check('simple bool enabled = true', `ticker.modify("TEST", ${slot}=enabled ? ${slot}.on : ${slot}.off)`)).toEqual([]);
  });

  it.each(['backadjustment', 'settlement_as_close'])('rejects a series %s selector', (slot) => {
    expect(check('', `ticker.modify("TEST", ${slot}=bar_index % 2 == 0 ? ${slot}.on : ${slot}.off)`))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(slot) }),
      ]));
  });

  it.each(['backadjustment', 'settlement_as_close'])('rejects wrong primitive and foreign enum %s selectors', (slot) => {
    const foreign = slot === 'backadjustment' ? 'settlement_as_close' : 'backadjustment';
    for (const value of ['17', 'true', '"on"', `${foreign}.on`]) {
      expect(check('', `ticker.modify("TEST", ${slot}=${value})`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ severity: 'error' }),
      ]));
    }
  });
});
