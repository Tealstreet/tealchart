import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const evidence = 'oracle-probes/v3/captures/v3/evidence/strings-04-na-initializer-attempt1-error.png';

describe(`Native v3 ${evidence}; ${reference} types[2/6]`, () => {
  it('refuses the captured const string na initializer and admits defined const and nonconst missing strings', () => {
    const rejected = checkProgram(parse(`//@version=6
indicator("V3-STRING-NA-INITIALIZER")
const string absent = na
outcome = na(absent) ? 1 : absent == "" ? 2 : 3
observedText = na(absent) ? "INITIALIZER=NA" : "INITIALIZER=<" + absent + ">"
var table results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    table.cell(results, 0, 0, observedText)
    log.info(observedText)
plot(outcome, "OUTCOME")
`));
    expect(rejected.diagnostics.some((diagnostic) => diagnostic.code === 'qualifier-mismatch'
      && diagnostic.message.includes('simple na') && diagnostic.message.includes('const string'))).toBe(true);
    const controls = checkProgram(parse(`//@version=6
indicator("String initializer controls")
const string defined = ""
string missing = na
simple string simpleMissing = na
plot(na(missing) and na(simpleMissing) and defined == "" ? 1 : 0)
`));
    expect(controls.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
