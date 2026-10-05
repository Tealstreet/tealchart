import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority for each parameter: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Integer TA slots")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');
}

describe('ledger gaps 641–680 vwma parameter contracts', () => {
  // Row673, ta.vwma length allowedTypeIDs: series/simple/input/const int, excluding float.
  it('VWMA refuses an integer-valued float length', () => {
    expect(errors('x = ta.vwma(source=close, length=bar_index % 2 + 2)')).toEqual([]);
    expect(errors('x = ta.vwma(source=close, length=2.0)')).toContainEqual(expect.objectContaining({
      code: 'type-mismatch', message: expect.stringContaining('length'),
    }));
  });
});
