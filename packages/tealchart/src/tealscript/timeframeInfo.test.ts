import { describe, expect, it } from 'vitest';

import { createTealscriptTimeframeInfo } from './timeframeInfo';

describe('shared Tealscript timeframe metadata', () => {
  it.each([
    ['15', 15, 'isminutes', true],
    ['1440', 1440, 'isminutes', true],
    ['D', 1, 'isdaily', false],
    ['2D', 2, 'isdaily', false],
    ['W', 1, 'isweekly', false],
    ['3M', 3, 'ismonthly', false],
    ['30S', 30, 'isseconds', true],
    ['10T', 10, 'isticks', true],
  ] as const)('preserves flags for %s', (period, multiplier, flag, isintraday) => {
    const info = createTealscriptTimeframeInfo(period)!;
    expect(info).toMatchObject({ period, multiplier, [flag]: true, isintraday });
    const flags = ['isminutes', 'isdaily', 'isweekly', 'ismonthly', 'isseconds', 'isticks'] as const;
    for (const candidate of flags) expect(info[candidate]).toBe(candidate === flag);
  });
});
