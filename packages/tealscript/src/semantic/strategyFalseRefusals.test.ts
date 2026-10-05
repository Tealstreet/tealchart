import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const checkExit = (call: string, version = 6) => checkProgram(parse(`//@version=${version}\nstrategy("Exit")\nstrategy.exit(${call})`)).diagnostics;

describe('strategy exit false refusals', () => {
  it.each(['"X", "E", profit=0', '"X", "E", loss=0', '"X", "E", trail_points=-5, trail_offset=2'])('does not validate omitted qty against %s', (call) => {
    expect(checkExit(call).filter(({ message }) => message.includes('qty must'))).toEqual([]);
  });

  it.each([5, 6])('accepts zero profit and loss in v%i', (version) => {
    expect(checkExit('"X", "E", profit=0', version)).toEqual([]);
    expect(checkExit('"X", "E", loss=0', version)).toEqual([]);
  });

  it.each([5, 6])('accepts negative trailing distance in v%i', (version) => {
    expect(checkExit('"X", "E", trail_points=-5, trail_offset=2', version)).toEqual([]);
  });

  it.each(['"X", "E", qty=0, profit=1', '"X", "E", qty=-1, profit=1', 'id="X", from_entry="E", qty=-1, profit=1'])('retains refusal of supplied nonpositive qty: %s', (call) => {
    expect(checkExit(call).map(({ message }) => message)).toEqual(['strategy.exit qty must be a positive number']);
  });

  it('retains unsupported sign and missing-target refusals outside these boundaries', () => {
    expect(checkExit('"X", "E", profit=-1').map(({ message }) => message)).toContain('strategy.exit profit must be a non-negative number');
    expect(checkExit('"X", "E", loss=-1').map(({ message }) => message)).toContain('strategy.exit loss must be a non-negative number');
    expect(checkExit('"X", "E", trail_points=-5').map(({ message }) => message)).toContain('strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points');
    expect(checkExit('"X", "E"').map(({ message }) => message)).toEqual(['strategy.exit requires a limit, stop, profit, loss, or trailing stop price']);
  });

  it('keeps unrelated named zero values out of omitted numeric parameters', () => {
    expect(checkExit('"X", "E", limit=0')).toEqual([]);
    expect(checkExit('id="X", from_entry="E", limit=0')).toEqual([]);
    expect(checkExit('"X", "E", qty=1, limit=0')).toEqual([]);
  });
});
