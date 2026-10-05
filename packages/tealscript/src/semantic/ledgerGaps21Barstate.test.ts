import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json var_barstate.islastconfirmedhistory, series bool.
describe('ledger811 exact barstate member qualifier', () => {
  it('infers islastconfirmedhistory as series bool', () => {
    const checked = checkProgram(parse('//@version=6\nindicator("History flag")\nflag = barstate.islastconfirmedhistory'));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'flag')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
  });
});
