import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const captured = [
  {
    name: 'ledger47-zero-div-v5-literal-negative-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-literal-negative-zero-v1", overlay=false)\nvalue = close / -0.0\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sha256: '667c51db28ae47d343148d07893bd217064ee982830cf7c48a30d6470a90a8e6',
  },
  {
    name: 'ledger47-zero-div-v5-literal-positive-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-literal-positive-zero-v1", overlay=false)\nvalue = close / 0.0\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sha256: '16ed7d48e7718f030245ff85b887edb29e5d69c8d66c7127dad1570d6f3c4af9',
  },
];
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
describe('captured v5 literal zero divisor', () => {
  it.each(captured)('refuses $name', ({ source, sha256 }) => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
    expect(errors(source)).toContainEqual(
      expect.objectContaining({ code: 'division-by-zero', message: 'Division by zero', line: 3, column: 9 }),
    );
  });
  it.each(['2.0', '-2.0', 'close - close'])('preserves uncaptured denominator %s', (denominator) => {
    expect(errors('//@version=5\nindicator("Control")\nplot(close / (' + denominator + '))')).toEqual([]);
  });
  it('preserves uncaptured v6 policy', () => {
    expect(errors(captured[0].source.replace('//@version=5', '//@version=6'))).toEqual([]);
  });
});
