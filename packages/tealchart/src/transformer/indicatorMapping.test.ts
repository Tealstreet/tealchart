import { describe, expect, it } from 'vitest';

import { findMappingByTvStudyId } from './indicatorMapping';

describe('official hosted study identifiers', () => {
  it('matches official versioned names through existing builtin mappings', () => {
    expect(findMappingByTvStudyId('SMA@tv-basicstudies-278')?.customId).toBe('sma');
    expect(findMappingByTvStudyId('Moving Average Exponential@tv-basicstudies-278')?.customId).toBe('ema');
    expect(findMappingByTvStudyId('Relative Strength Index@tv-prostudies')?.customId).toBe('rsi');
    expect(findMappingByTvStudyId('STD;SMA')?.customId).toBe('sma');
  });
  it('does not reinterpret private scripts or approximate display names', () => {
    expect(findMappingByTvStudyId('SMA@my-script-278')).toBeUndefined();
    expect(findMappingByTvStudyId('Moving Average Exponential Custom@tv-basicstudies-278')).toBeUndefined();
    expect(findMappingByTvStudyId('My SMA')).toBeUndefined();
  });
});
