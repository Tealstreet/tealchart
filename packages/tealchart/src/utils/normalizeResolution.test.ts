import { describe, expect, it } from 'vitest';

import { normalizeResolution } from './normalizeResolution';

describe('normalizeResolution', () => {
  it('stringifies numeric legacy resolutions', () => {
    expect(normalizeResolution(60)).toBe('60');
    expect(normalizeResolution(15)).toBe('15');
  });

  it('trims string resolutions', () => {
    expect(normalizeResolution(' 1D ')).toBe('1D');
  });

  it('falls back for missing or empty resolutions', () => {
    expect(normalizeResolution(null)).toBe('60');
    expect(normalizeResolution(undefined)).toBe('60');
    expect(normalizeResolution('')).toBe('60');
    expect(normalizeResolution('', '1h')).toBe('1h');
  });

  it('allows empty fallback when caller needs to preserve not-provided semantics', () => {
    expect(normalizeResolution(null, '')).toBe('');
    expect(normalizeResolution(undefined, '')).toBe('');
    expect(normalizeResolution('', '')).toBe('');
  });
});
