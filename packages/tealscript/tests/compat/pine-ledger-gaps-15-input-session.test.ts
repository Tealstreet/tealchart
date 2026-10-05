import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: reference/pine-v6-reference-v1.json functions[50], ledger597-600.
// Shared input guard678c6850cf is present; all eight assertions run ordinarily.
const authority = 'https://www.tradingview.com/pine-script-reference/v6/#fun_input.session';

// Removing the shared const guard makes all eight cases RED; restore makes them GREEN.
describe(`ledger gaps15 session metadata [${authority}]`, () => {
  for (const [rank, option, index] of [[597, 'title', 1], [598, 'tooltip', 3], [599, 'inline', 4], [600, 'group', 5]] as const) {
    for (const form of ['named', 'positional'] as const) {
      it(`rank ${rank}: ${form} ${option} accepts const string and refuses input/simple/series strings`, () => {
        const args = ['"0930-1600"', '"Session"', '["0930-1600"]', '"Help"', '"row"', '"Group"'];
        args[index] = 'optionValue';
        const call = form === 'named' ? `input.session("0930-1600", ${option}=optionValue)` : `input.session(${args.slice(0, index + 1).join(', ')})`;
        const diagnostics = (declaration: string) => checkProgram(parse(`//@version=6\nindicator("Session metadata")\n${declaration}\nselected = ${call}\nplot(close)`)).diagnostics;
        expect(diagnostics('const string optionValue = "Static"')).toEqual([]);
        for (const declaration of [
          'optionValue = input.string("User")',
          'simple string optionValue = syminfo.ticker',
          'optionValue = close > open ? "Up" : "Down"',
        ]) {
          expect(diagnostics(declaration)).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(option) }),
          ]));
        }
      });
    }
  }
});
