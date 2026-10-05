import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const capturedCases = [
  [
    'macd-fastlen',
    'ta.macd',
    'fastlen',
    '1.5',
    '1',
    57,
    '2841fdc125295ac8f4bce5a45dbfc698c0c67092a8878b864651543cdeae5034',
  ],
  [
    'macd-slowlen',
    'ta.macd',
    'slowlen',
    '26.5',
    '26',
    61,
    '949808fb14996aec6c0fb52c3f84905d831bbe442e669e0b952746c80523937f',
  ],
  [
    'macd-siglen',
    'ta.macd',
    'siglen',
    '9.5',
    '9',
    65,
    '6240d8ed6b7bdb744b5b319acfdc313df9fdd4560cce6429b233465cd27846f1',
  ],
  [
    'percentile-linear-interpolation',
    'ta.percentile_linear_interpolation',
    'length',
    '2.5',
    '2',
    57,
    '190cc35c041f595de1381eafd272d88f2f0ee92116d637241fcbbb0934ebf311',
  ],
  ['wma', 'ta.wma', 'length', '7.5', '7', 29, 'ec12f1cbadc061f3793f8d7053376caadda714e44cb244421112f292ab73966f'],
] as const;

function capturedSource(name: string): string {
  return readFileSync(new URL(`../../oracle-probes/v4/v5-float-length-${name}-v1.pine`, import.meta.url), 'utf8');
}

// Shipped v4 native captures refuse these five v5 sources at compile time.
// https://www.tradingview.com/pine-script-reference/v5/#fun_ta.macd
describe('native v4 TA length kind refusals', () => {
  it.each(capturedCases)(
    'refuses captured %s float length before execution',
    (name, callee, parameter, _float, _integer, column, sha) => {
      const source = capturedSource(name);
      expect(createHash('sha256').update(source).digest('hex')).toBe(sha);
      expect(checkProgram(parse(source)).diagnostics).toEqual([
        expect.objectContaining({
          code: 'type-mismatch',
          message: `${callee} ${parameter} must be an integer, got float`,
          line: 3,
          column,
        }),
      ]);
    },
  );

  it.each(capturedCases)('retains captured %s integer controls', (name, _callee, _parameter, float, integer) => {
    expect(checkProgram(parse(capturedSource(name).replace(float, integer))).diagnostics).toEqual([]);
  });
});
