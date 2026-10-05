import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';
const evidence = 'oracle-probes/v3/captures/v3/evidence/request-05-request-splits-invalid-provider-key-attempt1-error.txt';

describe(`Native v3 ${evidence}; ${reference} functions[543]`, () => {
  it('refuses the captured missing field before provider lookup and admits supplied field controls', () => {
    const rejected = checkProgram(parse(`//@version=6
indicator("V3-REQUEST-05", max_bars_back=256)
plot(request.splits("INVALID:__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
`));
    expect(rejected.diagnostics.some((diagnostic) => diagnostic.code === 'argument-count'
      && diagnostic.message === "request.splits() missing required argument 'field'"
      && diagnostic.severity === 'error')).toBe(true);
    const controls = checkProgram(parse(`//@version=6
indicator("Splits field controls")
plot(request.splits("NASDAQ:AAPL", splits.denominator))
plot(request.splits(field=splits.numerator, ticker="NASDAQ:AAPL", ignore_invalid_symbol=true))
plot(request.splits("NASDAQ:AAPL", splits.denominator, barmerge.gaps_on, barmerge.lookahead_off, false))
`));
    expect(controls.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
