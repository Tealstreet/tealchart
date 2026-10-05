import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('ledger18 DMI adxSmoothing documented simple int', () => {
  for (const value of ['2.5', 'input.float(2.5)', 'syminfo.mintick', 'close']) {
    it(`rejects float adxSmoothing ${value}`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("DMI slot")\n[plus, minus, adx] = ta.dmi(3, ${value})\nplot(adx)`));
      expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('adxSmoothing') })]));
    });
  }
  it('rejects a series int while accepting const/input/simple int', () => {
    for (const value of ['3', 'input.int(3)', 'syminfo.minmove']) {
      expect(checkProgram(parse(`//@version=6\nindicator("DMI accepted")\n[p,m,a] = ta.dmi(3, ${value})\nplot(a)`)).diagnostics).toEqual([]);
    }
    expect(checkProgram(parse('//@version=6\nindicator("DMI series")\n[p,m,a] = ta.dmi(3, bar_index+1)\nplot(a)')).diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('adxSmoothing') })]));
  });
  it('retains legacy dmi namespace rename', () => {
    for (const version of [3, 4, 5, 6]) {
      const call = version < 5 ? 'dmi(3,3)' : 'ta.dmi(3,3)';
      expect(checkProgram(parse(`//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("DMI renamed")\n[p,m,a] = ${call}\nplot(a)`)).diagnostics).toEqual([]);
    }
  });
});
