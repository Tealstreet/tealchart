import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function diagnostics(source: string) {
  return checkProgram(parse(source)).diagnostics.filter(({ code }) => code !== 'PINE_VERSION_OUTDATED');
}

// Native authority: v9/outcomes-v9.json records 26/32; v15/outcomes-v15.json record 34.
describe('captured v5/v6 literal shorttitle warning', () => {
  it.each([
    { declaration: 'indicator(title="MJ - VWAP SUite", shorttitle="MJ - VWAP Suite", overlay=true)', length: 15, column: 48 },
    { declaration: 'indicator("BTC Dip Alerts HQ", "BTC Dip Alerts HQ", overlay=false)', length: 17, column: 33 },
  ])('matches captured text, severity, code and site: $length', ({ declaration, length, column }) => {
    const result = diagnostics(`//@version=5\n${declaration}\nplot(close)`);
    expect(result).toEqual([{
      code: 'short-title-too-long',
      nativeCode: 'SHORT_TITLE_TOO_LONG',
      message: `The shorttitle is too long (${length} characters). It should be 10 characters or less.`,
      severity: 'warning',
      line: 2,
      column,
    }]);
  });
  it('matches the captured v6 declaration and keeps its warning first', () => {
    const declaration = 'indicator("Vein: Reversal Zones [WavesUnchained]", "Vein RZones", overlay=true)';
    const result = checkProgram(parse(`//@version=6\n${'\n'.repeat(22)}${declaration}\nplot(close)`));
    expect(result.diagnostics).toEqual([{
      code: 'short-title-too-long',
      nativeCode: 'SHORT_TITLE_TOO_LONG',
      message: 'The shorttitle is too long (11 characters). It should be 10 characters or less.',
      severity: 'warning',
      line: 24,
      column: 53,
    }]);
  });
  it('keeps the v5 native warning before the existing version advisory', () => {
    expect(checkProgram(parse('//@version=5\nindicator("Title", "12345678901")\nplot(close)')).diagnostics.map(({ code }) => code))
      .toEqual(['short-title-too-long', 'PINE_VERSION_OUTDATED']);
  });
  it.each(['', '123456789', '1234567890'])('keeps a short literal admitted: %s', (shorttitle) => {
    expect(diagnostics(`//@version=5\nindicator("Title", "${shorttitle}")\nplot(close)`)).toEqual([]);
  });
  it.each([4])('preserves unwitnessed version %s', (version) => {
    expect(diagnostics(`//@version=${version}\nindicator("Title", "12345678901")\nplot(close)`)).toEqual([]);
  });
  it('preserves computed shorttitle admission', () => {
    expect(diagnostics('//@version=5\nconst string labelTitle = "12345678901"\nindicator("Title", labelTitle)\nplot(close)')).toEqual([]);
  });
});
