import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function diagnostics(declarations: string, option: string, value: string) {
  return checkProgram(
    parse(`//@version=6
indicator("Input qualifiers")
${declarations}
selected = input.bool(true, ${option} = ${value})
plot(selected ? 1 : 0)
`),
  ).diagnostics;
}

describe('ledger gaps 112–117: input.bool reference parameter qualifiers', () => {
  for (const [rank, option] of [
    [112, 'title'],
    [113, 'tooltip'],
    [114, 'inline'],
    [115, 'group'],
  ] as const) {
    it(`rank ${rank}: ${option} accepts const string and rejects input, simple and series string`, () => {
      expect(diagnostics('const string optionValue = "Static"', option, 'optionValue')).toEqual([]);
      for (const declaration of [
        'optionValue = input.string("User")',
        'simple string optionValue = syminfo.ticker',
        'optionValue = close > open ? "Up" : "Down"',
      ]) {
        expect(diagnostics(declaration, option, 'optionValue')).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(option) }),
          ]),
        );
      }
    });
  }

  it('rank 116: confirm accepts const bool and rejects input, simple and series bool', () => {
    expect(diagnostics('const bool enabled = true', 'confirm', 'enabled')).toEqual([]);
    for (const declaration of [
      'enabled = input.bool(true)',
      'simple bool enabled = syminfo.type == "stock"',
      'enabled = close > open',
    ]) {
      expect(diagnostics(declaration, 'confirm', 'enabled')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('confirm') }),
        ]),
      );
    }
  });

  it('rank 117: active accepts const and input bool and rejects simple and series bool', () => {
    expect(diagnostics('const bool enabled = true', 'active', 'enabled')).toEqual([]);
    expect(diagnostics('enabled = input.bool(true)', 'active', 'enabled')).toEqual([]);
    for (const declaration of ['simple bool enabled = syminfo.type == "stock"', 'enabled = close > open']) {
      expect(diagnostics(declaration, 'active', 'enabled')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('active') }),
        ]),
      );
    }
  });
});
