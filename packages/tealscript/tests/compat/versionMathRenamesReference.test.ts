import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Authority: pine-v6-reference-v1.json, each case's math.<name> entry,
// including its parameter names and return definition. The legacy rename and
// version boundary are the official v5 migration guide's math table:
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#renamed-functions-and-variables
// Expectations below are literal mathematical identities, not engine output
// or comparison between two wrappers around the same evaluator.
const bars: Bar[] = [-3.5, 0, 0.25, 2.75].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1,
  low: close - 1, close, volume: 10,
}));

const cases = [
  // Mixed signs and fractions reject identity, abs-as-sign, floor/ceil swaps,
  // truncation, ignoring zero, and rounding before applying the function.
  { name: 'abs', input: 'close', named: 'number=close', values: [3.5, 0, 0.25, 2.75] },
  { name: 'ceil', input: 'close', named: 'number=close', values: [-3, 0, 1, 3] },
  { name: 'floor', input: 'close', named: 'number=close', values: [-4, 0, 0, 2] },
  { name: 'sign', input: 'close', named: 'number=close', values: [-1, 0, 1, 1] },
  // Native4c37c51a15 / CF016 settles the shared round primitive: half away
  // from zero. Legacy rows here remain rename controls, not independent TVv4 captures.
  { name: 'round', input: 'close', named: 'number=close', values: [-4, 0, 0, 3] },
  // Two unequal operands reject swapped named binding and exponent ignored.
  { name: 'pow', input: 'close, 2', named: 'exponent=2, base=close', values: [12.25, 0, 0.0625, 7.5625] },
  // Neither first nor last operand is always the extremum. Three-argument avg
  // rejects implementations taking just two values or returning their sum.
  { name: 'max', input: 'close, 1', named: 'close, 1', values: [1, 1, 1, 2.75] },
  { name: 'min', input: 'close, 1', named: 'close, 1', values: [-3.5, 0, 0.25, 1] },
  { name: 'avg', input: 'close, 1, 8', named: 'close, 1, 8', values: [11 / 6, 3, 37 / 12, 47 / 12] },
  // Exact roots distinguish sqrt from abs, pow(x,2), or identity.
  { name: 'sqrt', setup: 'x = bar_index == 0 ? 9 : bar_index == 1 ? 0 : bar_index == 2 ? 0.25 : 4', input: 'x', named: 'number=x', values: [3, 0, 0.5, 2] },
  // e^0=1 and ln(e)=1 separate log from log10, exp, and identity.
  { name: 'log', setup: 'x = bar_index == 0 ? 1 : bar_index == 1 ? 2.718281828459045 : bar_index == 2 ? 2.718281828459045 * 2.718281828459045 : 1 / 2.718281828459045', input: 'x', named: 'number=x', values: [0, 1, 2, -1] },
  { name: 'log10', setup: 'x = bar_index == 0 ? 1 : bar_index == 1 ? 10 : bar_index == 2 ? 100 : 0.1', input: 'x', named: 'number=x', values: [0, 1, 2, -1] },
  { name: 'exp', input: 'bar_index - 1', named: 'number=bar_index - 1', values: [0.36787944117144233, 1, 2.718281828459045, 7.38905609893065] },
  // Angles span quadrants in radians; a degrees implementation or sine/cosine
  // swap cannot match these vectors. Inverse trig includes negative/zero/one.
  { name: 'sin', input: 'bar_index * 3.141592653589793 / 2', named: 'angle=bar_index * 3.141592653589793 / 2', values: [0, 1, 0, -1] },
  { name: 'cos', input: 'bar_index * 3.141592653589793 / 2', named: 'angle=bar_index * 3.141592653589793 / 2', values: [1, 0, -1, 0] },
  { name: 'tan', setup: 'x = bar_index == 3 ? 0 : (bar_index - 1) * 3.141592653589793 / 4', input: 'x', named: 'angle=x', values: [-1, 0, 1, 0] },
  { name: 'asin', setup: 'x = bar_index == 3 ? 0.5 : bar_index - 1', input: 'x', named: 'angle=x', values: [-1.5707963267948966, 0, 1.5707963267948966, 0.5235987755982989] },
  { name: 'acos', setup: 'x = bar_index == 3 ? 0.5 : bar_index - 1', input: 'x', named: 'angle=x', values: [3.141592653589793, 1.5707963267948966, 0, 1.0471975511965979] },
  { name: 'atan', input: 'bar_index - 1', named: 'angle=bar_index - 1', values: [-0.7853981633974483, 0, 0.7853981633974483, 1.1071487177940904] },
  // Reference conversions use the named radians/degrees slots respectively.
  { name: 'todegrees', input: '(bar_index - 1) * 3.141592653589793 / 2', named: 'radians=(bar_index - 1) * 3.141592653589793 / 2', values: [-90, 0, 90, 180] },
  { name: 'toradians', input: '(bar_index - 1) * 90', named: 'degrees=(bar_index - 1) * 90', values: [-1.5707963267948966, 0, 1.5707963267948966, 3.141592653589793] },
];

function script(version: number, setup: string, expression: string): string {
  return `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Math rename reference")\n${setup}\nplot(${expression})`;
}

describe('documented v5 math renames', () => {
  // Red proof: reroute legacy abs to math.floor and every other legacy call
  // to math.abs in the emitter. All 21 cases fail on numerical assertions.
  // Restoring dispatch makes the unchanged independent expectations pass.
  it.each(cases)('runs v4 $name and modern math.$name with independent values', ({ name, setup = '', input, named, values }) => {
    for (const [version, expression] of [
      [4, `${name}(${input})`],
      [5, `math.${name}(${input})`],
      [6, `math.${name}(${named})`],
    ] as const) {
      const ast = parse(script(version, setup, expression));
      expect(checkProgram(ast).diagnostics).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].values).toHaveLength(bars.length);
      result.plots[0].values.forEach((actual, index) => {
        expect(actual).not.toBeNull();
        expect(actual).toBeCloseTo(values[index], 10);
      });
    }
    // Retaining the old spelling everywhere is also a version-parity defect.
    for (const version of [5, 6]) {
      expect(checkProgram(parse(script(version, setup, `${name}(${input})`))).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({
          severity: 'error', message: expect.stringContaining(name),
        })]),
      );
    }
  });
});
