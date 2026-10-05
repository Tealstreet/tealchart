import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string, version = 6, dynamicRequests?: boolean) {
  return checkProgram(
    parse(
      `//@version=${version}\n${version <= 4 ? 'study' : 'indicator'}("Ledger controls"${dynamicRequests === undefined ? '' : `, dynamic_requests=${dynamicRequests}`})\n${body}`,
    ),
  );
}

// Input qualifier contracts, not merely valid slot-binding examples (208–213).
// https://www.tradingview.com/pine-script-docs/concepts/inputs/
describe('ledger gaps 6: input.string metadata', () => {
  it.each(['title', 'tooltip', 'inline', 'group'])('requires const %s', (slot) => {
    expect(check(`value = input.string("x", ${slot}="constant")`).diagnostics).toEqual([]);
    expect(
      check(`metadata = input.string("x", "Metadata")\nvalue = input.string("x", ${slot}=metadata)`).diagnostics,
    ).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining(`'${slot}' for input.string`),
      }),
    ]);
  });

  it('requires const confirm (212)', () => {
    expect(check('value = input.string("x", confirm=true)').diagnostics).toEqual([]);
    expect(
      check('enabled = input.bool(true, "Enabled")\nvalue = input.string("x", confirm=enabled)').diagnostics,
    ).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining("'confirm' for input.string"),
      }),
    ]);
  });

  it('allows input active but refuses series active (213)', () => {
    expect(
      check('enabled = input.bool(true, "Enabled")\nvalue = input.string("x", active=enabled)').diagnostics,
    ).toEqual([]);
    expect(check('value = input.string("x", active=close > open)').diagnostics).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining("'active' for input.string"),
      }),
    ]);
  });
});
