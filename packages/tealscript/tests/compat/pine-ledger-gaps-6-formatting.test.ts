import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

// Documented masks, independently specified outputs (ledger ranks224–226/228).
// https://www.tradingview.com/pine-script-docs/concepts/strings/#string-conversion-and-formatting
describe('ledger gaps 6: documented numeric string masks', () => {
  it('preserves NaN text before applying leading-zero or percent masks', () => {
    const result = runCompatScript(`//@version=6
indicator("Missing formatted number")
if barstate.islast
    label.new(bar_index, close, str.tostring(float(na), "000000"))
    label.new(bar_index, close, str.tostring(float(na), "0.00%"))`);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      expect.objectContaining({ type: 'label', text: 'NaN' }),
      expect.objectContaining({ type: 'label', text: 'NaN' }),
    ]);
  });

  it.each([
    [1.2, '#.###', '1.2'],
    [1, '#.###', '1'],
    [1.2, '0.00#', '1.20'],
    [1.234, '0.00#', '1.234'],
    [12, '000000', '000012'],
    [-12, '000000', '-000012'],
    [1234567, '000000', '1234567'],
    [1.2, '000.00', '001.20'],
    [12.3, '0000,000.##', '0,000,012.3'],
    [0.1234, '0.00%', '12.34%'],
    [0.12, '#.##%', '12%'],
    [-0.1234, '000.00%', '-012.34%'],
  ] as const)('formats %s with %s as %s', (value, mask, expected) => {
    const source = `//@version=6
indicator("Numeric masks")
if barstate.islast
    label.new(bar_index, close, str.tostring(${value}, "${mask}"))
    label.new(bar_index, close, str.format("{0,number,${mask}}", ${value}))`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(2);
    expect(result.drawings).toEqual([
      expect.objectContaining({ type: 'label', barIndex: compatibilityBars.length - 1, text: expected }),
      expect.objectContaining({ type: 'label', barIndex: compatibilityBars.length - 1, text: expected }),
    ]);
  });

  it('preserves the str.format percent keyword', () => {
    const result = runCompatScript(`//@version=6
indicator("Percent presets")
if barstate.islast
    label.new(bar_index, close, str.format("{0,number,percent}", 0.12))`);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([expect.objectContaining({ type: 'label', text: '12%' })]);
  });

  // Individual str.tostring reference specifies tick-aligned output with zeros.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring
  it.each([
    [0.01, 1.2, '1.20'],
    [0.25, 1.24, '1.25'],
    [0.0001, 1.2, '1.2000'],
  ] as const)('keeps mintick %s rounding and padding (228)', (mintick, value, expected) => {
    const result = runCompatScript(
      `//@version=6
indicator("Tick strings")
if barstate.islast
    label.new(bar_index, close, str.tostring(${value}, format.mintick))`,
      {
        engineOptions: { runtime: { syminfo: { mintick } } },
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([expect.objectContaining({ type: 'label', text: expected })]);
  });
});
