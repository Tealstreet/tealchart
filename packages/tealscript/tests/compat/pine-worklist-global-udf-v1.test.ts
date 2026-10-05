import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Scope")\n${body}`))
  .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Ranks 1680/1811: global-only calls remain forbidden in UDF and loop scopes.
// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
describe('worklist global-only calls in functions and loops', () => {
  for (const call of ['plot(close)', 'bgcolor(color.red)', 'alertcondition(true)']) {
    it(`refuses ${call} inside a UDF`, () => {
      expect(errors(`localCall() =>\n    ${call}\n    close\nplot(localCall())`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'scope-mismatch' }),
      ]));
    });
    it(`refuses ${call} inside a for loop`, () => {
      expect(errors(`for index = 0 to 1\n    ${call}`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'scope-mismatch' }),
      ]));
    });
  }

  it('accepts UDF drawing setters and globally placed plots', () => {
    expect(errors(`localCall() =>
    marker = label.new(bar_index, close)
    label.set_text(marker, "Value")
    close
plot(localCall())`)).toEqual([]);
  });
});
