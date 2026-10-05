import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, functions[48].
const errors = (declaration: string, option: string, value: string) => checkProgram(parse(`//@version=6
indicator("Symbol qualifiers")
${declaration}
x = input.symbol("NASDAQ:AAPL", ${option}=${value})
`)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger gaps649–654 input.symbol metadata qualifiers', () => {
  // Rows649–652: title/tooltip/inline/group require const string.
  it.each(['title', 'tooltip', 'inline', 'group'])('symbol %s refuses non-const string', (option) => {
    expect(errors('const string optionValue = "Static"', option, 'optionValue')).toEqual([]);
    for (const declaration of ['optionValue = input.string("User")', 'simple string optionValue = syminfo.ticker', 'optionValue = close > open ? "Up" : "Down"']) {
      expect(errors(declaration, option, 'optionValue')).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(option) }));
    }
  });

  // Row653: confirm requires const bool.
  it('symbol confirm refuses non-const bool', () => {
    expect(errors('const bool enabled = true', 'confirm', 'enabled')).toEqual([]);
    for (const declaration of ['enabled = input.bool(true)', 'simple bool enabled = syminfo.type == "stock"', 'enabled = close > open']) {
      expect(errors(declaration, 'confirm', 'enabled')).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('confirm') }));
    }
  });

  // Row654: active permits const/input bool, refuses simple/series bool.
  it('symbol active retains input bool and refuses stronger qualifiers', () => {
    expect(errors('const bool enabled = true', 'active', 'enabled')).toEqual([]);
    expect(errors('enabled = input.bool(true)', 'active', 'enabled')).toEqual([]);
    for (const declaration of ['simple bool enabled = syminfo.type == "stock"', 'enabled = close > open']) {
      expect(errors(declaration, 'active', 'enabled')).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('active') }));
    }
  });
});
