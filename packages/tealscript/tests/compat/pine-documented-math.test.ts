import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Oracles: official pine-v6-reference-v1.json, functions categoryIndex below.
// Numerical values are elementary evaluations of the documented formulas, not
// output captured from TealScript or another Pine implementation.
const contracts = [
  {
    member: 'math.abs',
    entry: 92,
    args: ['-7.25', '0', '3.5'],
    expected: [7.25, 0, 3.5],
    rejects: 'identity, always-negating, and integer truncation',
  },
  {
    member: 'math.ceil',
    entry: 144,
    args: ['-2.75', '-2', '2.25'],
    expected: [-2, -2, 3],
    rejects: 'floor, nearest rounding, truncation, and always adding one',
  },
  {
    member: 'math.floor',
    entry: 148,
    args: ['-2.25', '-2', '2.75'],
    expected: [-3, -2, 2],
    rejects: 'truncation toward zero, ceil, and nearest rounding',
  },
  {
    member: 'math.sign',
    entry: 112,
    args: ['-0.25', '0', '7.5'],
    expected: [-1, 0, 1],
    rejects: 'boolean sign, identity, and negative values mapping to zero',
  },
  {
    member: 'math.sqrt',
    entry: 108,
    args: ['0', '0.25', '81'],
    expected: [0, 0.5, 9],
    rejects: 'identity, squaring, and integer-only square roots',
  },
  {
    member: 'math.exp',
    entry: 116,
    args: ['0', '1', '-1'],
    expected: [1, 2.718281828459045, 0.36787944117144233],
    rejects: 'base-10 exponentiation and treating negative exponents as positive',
  },
  {
    member: 'math.log',
    entry: 100,
    args: ['1', 'math.e', '1 / math.e'],
    expected: [0, 1, -1],
    rejects: 'base-10 logarithm and dropping the negative logarithm',
  },
  {
    member: 'math.log10',
    entry: 104,
    args: ['1', '1000', '0.01'],
    expected: [0, 3, -2],
    rejects: 'natural logarithm and integer truncation of the source',
  },
  {
    member: 'math.sin',
    entry: 120,
    args: ['0', 'math.pi / 2', '-math.pi / 2'],
    expected: [0, 1, -1],
    rejects: 'degrees, cosine, and absolute-valued sine',
  },
  {
    member: 'math.cos',
    entry: 124,
    args: ['0', 'math.pi', 'math.pi / 2'],
    expected: [1, -1, 0],
    rejects: 'degrees, sine, and absolute-valued cosine',
  },
  {
    member: 'math.tan',
    entry: 128,
    args: ['0', 'math.pi / 4', '-math.pi / 4'],
    expected: [0, 1, -1],
    rejects: 'degrees, sine, and dropping negative tangent',
  },
  {
    member: 'math.asin',
    entry: 132,
    args: ['-1', '0', '1', '1.25', '-1.25'],
    expected: [-1.5707963267948966, 0, 1.5707963267948966, null, null],
    rejects: 'degrees, acos, clamping outside the documented domain, and unsigned angles',
  },
  {
    member: 'math.acos',
    entry: 136,
    args: ['-1', '0', '1', '1.25', '-1.25'],
    expected: [3.141592653589793, 1.5707963267948966, 0, null, null],
    rejects: 'degrees, asin, and clamping outside the documented domain',
  },
  {
    member: 'math.atan',
    entry: 140,
    args: ['-1', '0', '1', '10'],
    expected: [-0.7853981633974483, 0, 0.7853981633974483, 1.4711276743037347],
    rejects: 'degrees, unsigned angles, and wrongly limiting input to [-1, 1]',
  },
  {
    member: 'math.todegrees',
    entry: 170,
    args: ['-math.pi / 2', '0', 'math.pi'],
    expected: [-90, 0, 180],
    rejects: 'inverse conversion and absolute-valued conversion',
  },
  {
    member: 'math.toradians',
    entry: 171,
    args: ['-90', '0', '180'],
    expected: [-1.5707963267948966, 0, 3.141592653589793],
    rejects: 'inverse conversion and absolute-valued conversion',
  },
  {
    member: 'math.pow',
    entry: 69,
    args: ['-2, 3', '-2, 4', '9, 0.5', '2, -3'],
    expected: [-8, 16, 3, 0.125],
    rejects: 'swapping base/exponent, repeated multiplication for fractions, and ignoring exponent sign',
  },
  {
    member: 'math.min',
    entry: 73,
    args: ['4, -9, 2, 13', '-3, -1, -8'],
    expected: [-9, -8],
    rejects: 'first/last argument, max, and zero initialization',
  },
  {
    member: 'math.max',
    entry: 81,
    args: ['4, 13, -9, 2', '-3, -1, -8'],
    expected: [13, -1],
    rejects: 'first/last argument, min, and zero initialization',
  },
  {
    member: 'math.avg',
    entry: 225,
    args: ['4, -9, 2, 13', '-3, -1, -8'],
    expected: [2.5, -4],
    rejects: 'sum, midpoint of extrema, first/last argument, and integer division',
  },
  {
    // Native4c37c51a15 / CF016 settles half ties away from zero.
    // The old interpretation of reference 'ties up' was refuted; mintick
    // retains its separate tie rule below.
    member: 'math.round',
    entry: 152,
    args: ['2.5', '-2.5', '2.25', '-2.75', 'na'],
    expected: [3, -3, 2, -3, null],
    rejects: 'bankers rounding, ties toward positive infinity, floor, truncation, and na becoming zero',
  },
  {
    member: 'math.round',
    entry: 156,
    args: ['1.125, 2', '-1.125, 2', '1.0625, 2', 'na, 2'],
    expected: [1.13, -1.13, 1.06, null],
    rejects: 'ignoring precision, truncation, and negative ties toward positive infinity',
  },
  {
    member: 'math.round_to_mintick',
    entry: 160,
    args: ['1.125', '-1.125', '1.1', '-1.1', 'na'],
    expected: [1.25, -1, 1, -1, null],
    rejects: 'hard-coded decimal precision, ignoring mintick, floor, negative ties away from zero, and na as zero',
  },
];

describe('Pine documented math contracts', () => {
  for (const contract of contracts) {
    it(`${contract.member} [functions:${contract.entry}] rejects ${contract.rejects}`, () => {
      const bars = compatibilityBars.slice(0, 3);
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${contract.member}`;
      const result = runCompatScript(
        `//@version=6
indicator("Documented math")
${contract.args.map((args, index) => `plot(${contract.member}(${args}), "p${index}")`).join('\n')}
`,
        { bars, engineOptions: { runtime: { syminfo: { mintick: 0.25 } } } },
      );
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      for (const [index, expected] of contract.expected.entries()) {
        const values = getPlot(result, `p${index}`).values;
        expect(values, citation).toHaveLength(bars.length);
        for (const value of values) {
          if (expected === null) expect(value, citation).toBeNull();
          else expect(value, citation).toBeCloseTo(expected, 12);
        }
      }
    });
  }

  it('math.sum [functions:173] counts non-na samples, includes current, and evicts oldest', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_math.sum
    // Signed, unsorted samples reject last/max/mean and physical-bar windows:
    // 2,-7,11 => 6; -7,11,5 => 9; 11,5,-13 => 3; na retains non-na samples.
    const bars = compatibilityBars
      .slice(0, 8)
      .map((bar, index) => ({ ...bar, close: [2, 99, -7, 11, 99, 5, -13, 99][index] }));
    const result = runCompatScript(
      `//@version=6
indicator("Non-na sum")
source = bar_index == 1 or bar_index == 4 or bar_index == 7 ? na : close
plot(math.sum(source, 3), "sum")
`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'sum').values).toEqual([null, null, null, 6, 6, 9, 3, 3]);
  });

  it('math.random [functions:172] excludes both explicit negative bounds', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_math.random
    // Rejects default bounds, bound swapping, and returning either endpoint.
    const result = runCompatScript(
      '//@version=6\nindicator("Random bounds")\nplot(math.random(min=-7, max=-2, seed=83), "r")',
    );
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'r').values;
    expect(values).toHaveLength(compatibilityBars.length);
    for (const value of values) {
      expect(value).toBeGreaterThan(-7);
      expect(value).toBeLessThan(-2);
    }
  });

  it('math.random [functions:172] defaults to exclusive 0 and 1 bounds', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_math.random
    const result = runCompatScript('//@version=6\nindicator("Default random bounds")\nplot(math.random(seed=83), "r")');
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'r').values;
    expect(values).toHaveLength(compatibilityBars.length);
    for (const value of values) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('math.random [functions:172] repeats a seeded sequence across executions', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_math.random
    // No algorithm or exact sequence oracle. Rejects missing seeded-state reset and a
    // constant result masquerading as a repeatable pseudo-random sequence.
    const source = '//@version=6\nindicator("Seeded random")\nplot(math.random(-7, -2, 83), "r")';
    const runs = [runCompatScript(source), runCompatScript(source)];
    for (const run of runs) expect(run.errors).toEqual([]);
    const first = getPlot(runs[0], 'r').values;
    const second = getPlot(runs[1], 'r').values;
    expect(first).toHaveLength(compatibilityBars.length);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBeGreaterThan(1);
  });

  it('math.random [functions:172] different unseeded executions', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_math.random
    // Rejects deterministic call-site hashing as an implicit seed. No exact
    // algorithm, call-site independence, or TradingView sequence is assumed.
    const source = '//@version=6\nindicator("Unseeded random")\nplot(math.random(), "r")';
    const runs = [runCompatScript(source), runCompatScript(source)];
    for (const run of runs) expect(run.errors).toEqual([]);
    const first = getPlot(runs[0], 'r').values;
    const second = getPlot(runs[1], 'r').values;
    expect(first).toHaveLength(compatibilityBars.length);
    expect(second).toHaveLength(compatibilityBars.length);
    expect(second).not.toEqual(first);
  });
});
