import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(setup: string, call: string) {
  return checkProgram(
    parse(`//@version=6\nindicator("Quandl index admission")\n${setup}\nplot(${call})`),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

// request.quandl index admits const/input/simple/series int; deprecated runtime is separate.
// https://www.tradingview.com/pine-script-reference/v6/#fun_request.quandl
describe('rank1275 deprecated Quandl index admission', () => {
  it.each([
    ['const', 'const int index = 2'],
    ['input', 'index = input.int(2)'],
    ['simple', 'simple int index = 2'],
    ['series', 'series int index = bar_index'],
  ])('admits %s int in the named index slot', (_, setup) => {
    expect(errors(setup, 'request.quandl("CFTC/SB_FO_ALL", index=index)')).toEqual([]);
  });

  it.each(['1.0', 'input.float(2.0)', 'close', 'true', '"2"'])('refuses the incompatible index %s', (index) => {
    expect(errors('', `request.quandl(index=${index}, ticker="CFTC/SB_FO_ALL")`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(/index.*integer/) })]),
    );
  });

  it('binds the positional index after gaps', () => {
    expect(errors('', 'request.quandl("CFTC/SB_FO_ALL", barmerge.gaps_off, 2)')).toEqual([]);
    expect(errors('', 'request.quandl("CFTC/SB_FO_ALL", barmerge.gaps_off, 2.0)')).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(/index.*integer/) })]),
    );
  });

  it('preserves a user callable with the same leaf name', () => {
    expect(errors('quandl(float index) => index', 'quandl(1.5)')).toEqual([]);
  });
});
