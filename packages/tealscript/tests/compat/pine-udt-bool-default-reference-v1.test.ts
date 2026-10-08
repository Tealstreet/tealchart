import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/type-system/#user-defined-types
describe('Omitted UDT boolean fields are false values', () => {
  for (const supplied of [false,true]) {
    it(`supplied explicit field=${supplied}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT bool default")
type Holder
    bool flag
    bool explicit = true
first = Holder.new(${supplied ? 'explicit=false' : ''})
second = Holder.new()
plot(first.flag == false ? 1 : 0,"EqualFalse")
plot(first.flag != true ? 1 : 0,"NotTrue")
plot(not first.flag ? 1 : 0,"Negated")
plot(str.tostring(first.flag) == "false" ? 1 : 0,"TextFalse")
plot(first.explicit ? 1 : 0,"Explicit")
first.flag := true
plot(second.flag == false ? 1 : 0,"SecondFalse")
plot(first.flag == true ? 1 : 0,"Assigned")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({EqualFalse:1,NotTrue:1,Negated:1,TextFalse:1,Explicit:supplied?0:1,SecondFalse:1,Assigned:1})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
  it('v5 omitted bool remains missing', () => {
    const result = runCompatScript(`//@version=5
indicator("Legacy UDT bool")
type Holder
    bool flag
holder = Holder.new()
plot(na(holder.flag) ? 1 : 0,"Missing")`, { bars: compatibilityBars.slice(0,1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result,'Missing').values).toEqual([1]);
  });
});
