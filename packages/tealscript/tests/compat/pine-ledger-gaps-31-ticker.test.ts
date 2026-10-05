import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const diagnostics = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Ledger31 ticker")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );

describe('ledger31 ticker slots', () => {
  for (const [member, slot, call] of [
    ['ticker.new', 'adjustment', 'ticker.new("NASDAQ", "AAPL", adjustment=VALUE)'],
    ['ticker.modify', 'tickerid', 'ticker.modify(tickerid=VALUE)'],
    ['ticker.modify', 'session', 'ticker.modify("NASDAQ:AAPL", session=VALUE)'],
  ]) {
    for (const bad of ['17', 'input.int(17)', 'close']) {
      it(`${member} ${slot} refuses numeric ${bad}, ranks1201/1239/1240`, () => {
        expect(
          diagnostics(call!.replace('VALUE', bad)).some(
            (d) => d.message.includes(`${member} ${slot}`) && d.code === 'type-mismatch',
          ),
        ).toBe(true);
      });
    }
  }
  for (const [slot, namespace] of [
    ['backadjustment', 'backadjustment'],
    ['settlement_as_close', 'settlement_as_close'],
  ]) {
    it(`ticker.new ${slot} refuses series context, ranks1202/1203`, () => {
      const body = `value = bar_index % 2 == 0 ? ${namespace}.on : ${namespace}.off\nticker.new("NASDAQ", "AAPL", ${slot}=value)`;
      expect(diagnostics(body).some((d) => d.code === 'qualifier-mismatch' && d.message.includes(slot!))).toBe(true);
    });
    for (const flag of ['on', 'off', 'inherit']) {
      it(`ticker.new ${slot} accepts ${flag}, ranks1202/1203`, () => {
        expect(diagnostics(`ticker.new("NASDAQ", "AAPL", ${slot}=${namespace}.${flag})`)).toEqual([]);
      });
    }
  }
  for (const qualifier of ['const', 'input', 'simple', 'series']) {
    for (const [slot, value] of [
      ['adjustment', '"splits"'],
      ['tickerid', '"NASDAQ:AAPL"'],
      ['session', '"extended"'],
    ]) {
      it(`${slot} accepts ${qualifier} string overload, ranks1201/1239/1240`, () => {
        const initializer =
          qualifier === 'input'
            ? `input.string(${value})`
            : qualifier === 'series'
              ? `bar_index == 0 ? ${value} : ${value}`
              : value;
        const declaration =
          qualifier === 'input' ? `value = ${initializer}` : `${qualifier} string value = ${initializer}`;
        const call =
          slot === 'adjustment'
            ? 'ticker.new("NASDAQ", "AAPL", adjustment=value)'
            : slot === 'tickerid'
              ? 'ticker.modify(tickerid=value)'
              : 'ticker.modify("NASDAQ:AAPL", session=value)';
        expect(diagnostics(`${declaration}\n${call}`)).toEqual([]);
      });
    }
  }
});
