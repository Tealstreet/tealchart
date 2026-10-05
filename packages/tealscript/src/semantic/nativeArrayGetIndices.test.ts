import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const refusals = [
  ['corpus-array-get-fraction-v5-v1', 5, 'a = array.from(10, 20, 30)\nplot(array.get(a, 1.5), "fraction")', '54e0c2b81f1ff2ab0da213d8cef336b87fb3c721d45c49b052834b45aa1911ef'],
  ['corpus-array-get-fraction-v6-v1', 6, 'a = array.from(10, 20, 30)\nplot(array.get(a, 1.5), "fraction")', '330b1c7c87a00212c355d74bc2668446f06b8294ba46f1ae4d752592841ade66'],
  ['corpus-array-get-negative-fraction-v6-v1', 6, 'a = array.from(10, 20, 30)\nplot(array.get(a, -0.5), "negative_fraction")', 'ac6f2f8782e5d77259a5e1a387e88e255ac5e124b734064e7c036a80a0c07fc6'],
  ['corpus-array-get-series-division-v5-v1', 5, 'sorted = array.from(10.0, 20.0, 30.0, 40.0, 50.0)\ni = bar_index % 5\nk_nwe = input.float(2.0)\nplot(array.get(sorted, i / k_nwe), "series_division")', 'f5d6cb3020a0278375d5d6cf18fe3316d96f5cdeee29b98104390e428db403d9'],
] as const;

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

describe('captured array.get index admission', () => {
  it.each(refusals)('refuses the unchanged native source %s', (title, version, body, nativeHash) => {
    const source = `//@version=${version}\nindicator("${title}")\n${body}\n`;
    expect(createHash('sha256').update(source).digest('hex')).toBe(nativeHash);
    expect(errors(source)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('array.get index') }),
    ]));
  });

  it.each([5, 6])('preserves captured integer-derived and explicit-int controls in v%s', (version) => {
    const source = `//@version=${version}
indicator("Accepted index controls")
a = array.from(10, 20, 30, 40, 50)
n = input.int(3)
sz = array.size(a)
plot(array.get(a, n / 2))
plot(array.get(a, sz / 2))
plot(array.get(a, math.floor(bar_index / input.float(2.0))))
plot(array.get(a, 1))`;
    expect(errors(source)).toEqual([]);
  });

  it('preserves a selected user method with a float parameter', () => {
    expect(errors(`//@version=6
indicator("User getter control")
method get(array<int> id, float index) => index
a = array.from(10)
plot(a.get(1.5))`)).toEqual([]);
  });
});
