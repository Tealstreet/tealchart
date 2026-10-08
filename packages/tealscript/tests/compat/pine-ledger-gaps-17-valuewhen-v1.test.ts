import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority for each parameter: https://www.tradingview.com/pine-script-reference/v6/.
function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Integer TA slots")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');
}

describe('ledger gaps 641–680 valuewhen parameter contracts', () => {
  // Rows665–668, ta.valuewhen overloads functions186–189: occurrence is simple/input/const int.
  it.each(['close', 'bar_index', 'bar_index % 2 == 0', 'color.red'])('valuewhen refuses float occurrence for %s source', (source) => {
    expect(errors(`x = ta.valuewhen(condition=bar_index % 2 == 0, source=${source}, occurrence=1)`)).toEqual([]);
    expect(errors(`x = ta.valuewhen(condition=bar_index % 2 == 0, source=${source}, occurrence=1.0)`)).toContainEqual(expect.objectContaining({
      code: 'type-mismatch', message: expect.stringContaining('occurrence'),
    }));
  });

  // functions186–189 occurrence.allowedTypeIDs: simple/input/const int, excluding series int.
  it.each(['close', 'bar_index', 'bar_index % 2 == 0', 'color.red'].flatMap((source) => [
    { source, binding: 'positional', call: `ta.valuewhen(true, ${source}, bar_index + 2)` },
    { source, binding: 'named', call: `ta.valuewhen(condition=true, source=${source}, occurrence=bar_index + 2)` },
  ]))('valuewhen refuses $binding series occurrence for $source source', ({ source, call }) => {
    for (const occurrence of ['1', 'input.int(1)', 'simpleOccurrence']) {
      expect(errors(`simple int simpleOccurrence = 1\nx = ta.valuewhen(true, ${source}, ${occurrence})`)).toEqual([]);
    }
    expect(errors(`x = ${call}`)).toContainEqual(expect.objectContaining({
      code: 'qualifier-mismatch', message: expect.stringContaining('occurrence'),
    }));
  });
});
