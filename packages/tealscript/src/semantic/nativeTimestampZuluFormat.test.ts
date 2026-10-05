import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const nativeSource = new URL('../../oracle-probes/v2/coverage-strings-color-1-v1.pine', import.meta.url);
const message = 'timestamp(s): unrecognized datetime format';

describe('native v6 timestamp date-string format', () => {
  it('refuses the date-string format in the captured strings/color source', () => {
    const source = readFileSync(nativeSource, 'utf8');
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '57d845ba7244a0153eb2b8e8e555b31738b670f6447ea934316dcac5243bf913',
    );
    expect(checkProgram(parse(source)).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'invalid-argument',
        message,
        severity: 'error',
        line: 78,
        column: 27,
      }),
    );
  });

  it('checks the same date-string form through the named overload', () => {
    const source = `//@version=6
indicator("Named timestamp")
plot(timestamp(dateString="2026-01-01T00:00:00Z"))`;
    expect(checkProgram(parse(source)).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'invalid-argument',
        message,
        severity: 'error',
        line: 3,
        column: 27,
      }),
    );
  });

  it.each([
    ['RFC offset', 'timestamp("01 Jan 2026 00:00:00 +0000")'],
    ['ISO numeric offset', 'timestamp("2026-01-01T00:00:00+00:00")'],
    ['calendar arguments', 'timestamp("UTC0", 2026, 1, 1, 0, 0, 0)'],
  ])('preserves the documented %s form', (_name, call) => {
    expect(checkProgram(parse(`//@version=6\nindicator("Timestamp control")\nplot(${call})`)).diagnostics).toEqual([]);
  });

  it('preserves a user function named timestamp', () => {
    expect(
      checkProgram(
        parse(`//@version=6
indicator("Local timestamp")
timestamp(string dateString) => 7
plot(timestamp("2026-01-01T00:00:00Z"))`),
      ).diagnostics,
    ).toEqual([]);
  });
});
