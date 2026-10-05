import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Rank1620: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json functions[166]/[167].
const bars = [3, 1, 3, 2, 2].map((close, index) => ({
  time: 1700000000000 + index * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
}));

describe('mode source overloads', () => {
  it('keeps integer source and result compatible with an integer variable', () => {
    const source = '//@version=6\nindicator("integer mode")\nint value = ta.mode(int(close), 3)\nplot(value, "value")';
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values.slice(2)).toEqual([3, 1, 2]);
  });

  it('accepts fractional source through the float overload', () => {
    const source = '//@version=6\nindicator("float mode")\nfloat value = ta.mode(close + 0.5, 3)\nplot(value, "value")';
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checkProgram(parse(source.replace('float value', 'int value'))).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'type-mismatch' })]),
    );
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values.slice(2)).toEqual([3.5, 1.5, 2.5]);
  });
});
