import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';

for (const [name, index] of [['wma', 177], ['rma', 198]] as const) {
  describe(`Ledger gaps529/536: ${reference} functions[${index}] length`, () => {
    for (const argument of ['2.0', 'input.float(2.0)', 'float(2)']) {
      it(`${name} refuses float length ${argument} in positional and named forms`, () => {
        const result = checkProgram(parse(`//@version=6
indicator("TA integer length")
plot(ta.${name}(close, ${argument}))
plot(ta.${name}(source=close, length=${argument}))
`));
        expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 'type-mismatch').map((diagnostic) => diagnostic.message)).toEqual([
          `ta.${name} length must be an integer, got float`,
          `ta.${name} length must be an integer, got float`,
        ]);
        const controls = checkProgram(parse(`//@version=6
indicator("TA integer controls")
plot(ta.${name}(close, 2))
plot(ta.${name}(source=close, length=input.int(2)))
`));
        expect(controls.diagnostics).toEqual([]);
      });
    }
  });
}

describe(`Ledger gaps535: ${reference} functions[198] length simple int`, () => {
  it('refuses series RMA length while accepting const/input/simple lengths and series WMA length', () => {
    const result = checkProgram(parse(`//@version=6
indicator("TA qualifier controls")
simple int simpleLength = 2
plot(ta.rma(close, simpleLength))
plot(ta.rma(close, input.int(2)))
plot(ta.rma(close, 2))
plot(ta.wma(close, bar_index + 1))
plot(ta.rma(close, bar_index + 1))
`));
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ code: 'qualifier-mismatch', message: expect.stringContaining('ta.rma') });
  });
});
