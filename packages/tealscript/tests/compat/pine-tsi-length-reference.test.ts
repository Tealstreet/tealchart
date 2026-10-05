import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger1438–1441; first-party v6 functions[207] requires simple/input/const
// int for both lengths, while source accepts series int/float.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.tsi
function errors(call: string) {
  return checkProgram(parse(`//@version=6\nindicator("TSI length")\nplot(${call})\n`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}
describe('TSI declared length kinds and qualifiers', () => {
  it.each(['3.0', '4.0', '3.5', 'input.float(3.0)', 'float(timeframe.multiplier)', 'float(3)'])(
    'refuses float-kind short_length=%s',
    (length) => {
      expect(errors(`ta.tsi(long_length=5, source=close, short_length=${length})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('integer') }),
        ]),
      );
    },
  );
  // Adjacent ledger1441 is explicitly delegated to this lane too.
  it.each(['5.0', '6.0', '5.5', 'input.float(5.0)', 'float(timeframe.multiplier)', 'float(5)'])(
    'refuses float-kind long_length=%s',
    (length) => {
      expect(errors(`ta.tsi(short_length=3, source=close, long_length=${length})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('integer') }),
        ]),
      );
    },
  );
  it.each(['3', 'input.int(3)', 'timeframe.multiplier', 'int(3.0)'])(
    'accepts eligible integer short_length=%s',
    (length) => {
      expect(errors(`ta.tsi(close, ${length}, 5)`)).toEqual([]);
    },
  );
  it.each(['5', 'input.int(5)', 'timeframe.multiplier', 'int(5.0)'])(
    'accepts eligible integer long_length=%s',
    (length) => {
      expect(errors(`ta.tsi(source=close, short_length=3, long_length=${length})`)).toEqual([]);
    },
  );
  it.each(['short_length', 'long_length'])('refuses series integer %s while retaining simple ceiling', (slot) => {
    expect(
      errors(
        `ta.tsi(source=close, short_length=${slot === 'short_length' ? 'bar_index + 1' : '3'}, long_length=${slot === 'long_length' ? 'bar_index + 1' : '5'})`,
      ).some((d) => d.message.includes('simple') && d.message.includes(slot)),
    ).toBe(true);
  });
  it.each(['12.5', 'float(close)'])('retains numeric float source=%s', (source) => {
    expect(errors(`ta.tsi(${source},3,5)`)).toEqual([]);
  });
  it.each(['true', '"3"'])('retains nonnumeric short_length=%s refusal', (length) => {
    expect(errors(`ta.tsi(close,${length},5)`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });
});
