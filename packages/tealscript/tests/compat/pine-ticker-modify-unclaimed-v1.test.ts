import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const check = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Modify clause witness")
${body}`),
  );

// https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.modify
// Both overloads keep futures flags simple; inherit retains the incoming ID setting.
describe('ticker.modify documented parameter and inheritance clauses', () => {
  it('preserves an imported modify callable with its own adjustment type', () => {
    const library = parse(`//@version=6
library("ModifierControl")
export modify(string id, int adjustment) => "custom"`);
    const result = checkProgram(
      parse(`//@version=6
indicator("Imported modifier control")
import PineTests/ModifierControl/1 as ticker
value = ticker.modify("NASDAQ:AAPL", adjustment=7)`),
      {
        libraries: new Map([['PineTests/ModifierControl/1', library]]),
      },
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  for (const call of [
    'ticker.modify("NASDAQ:AAPL", session.regular, 7)',
    'ticker.modify(adjustment=7, tickerid="NASDAQ:AAPL")',
  ]) {
    it(`rejects non-string adjustment: ${call}`, () => {
      expect(check(`value = ${call}`).diagnostics).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
    });
  }

  for (const namespace of ['backadjustment', 'settlement_as_close']) {
    for (const named of [false, true]) {
      it(`rejects series ${namespace} in ${named ? 'named' : 'positional'} binding`, () => {
        const call = named
          ? `ticker.modify(${namespace}=flag, tickerid="CME:ES1!")`
          : namespace === 'backadjustment'
            ? 'ticker.modify("CME:ES1!", session.regular, adjustment.none, flag)'
            : 'ticker.modify("CME:ES1!", session.regular, adjustment.none, backadjustment.inherit, flag)';
        expect(
          check(`flag = bar_index == 0 ? ${namespace}.on : ${namespace}.off
value = ${call}`).diagnostics,
        ).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
      });
    }
    it(`admits a simple ${namespace} flag with a series ticker ID`, () => {
      expect(
        check(`flag = syminfo.session == session.regular ? ${namespace}.on : ${namespace}.off
id = bar_index == 0 ? "CME:ES1!" : "CME:NQ1!"
value = ticker.modify(id, ${namespace}=flag)`).diagnostics.filter((d) => d.severity === 'error'),
      ).toEqual([]);
    });
  }

  for (const qualifier of ['const', 'input', 'simple', 'series']) {
    it(`admits ${qualifier} adjustment via the documented string overload`, () => {
      const declaration =
        qualifier === 'input' ? 'value = input.string("splits")' : `${qualifier} string value = "splits"`;
      expect(
        check(`${declaration}
modified = ticker.modify("NASDAQ:AAPL", adjustment=value)`).diagnostics.filter((d) => d.severity === 'error'),
      ).toEqual([]);
    });
  }
});
