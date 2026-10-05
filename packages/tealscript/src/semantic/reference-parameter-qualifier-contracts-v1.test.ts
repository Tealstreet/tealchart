import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Reference parameters ignore qualifier keywords; scalar parameters retain them.
// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#qualifier-keywords
const check = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Reference parameter qualifiers")
${body}
plot(close)`),
  );

const referenceCases = [
  ['array', 'simple array<float>', 'array.from(close)', 'array.size(value)'],
  ['matrix', 'simple matrix<float>', 'matrix.new<float>(1, 1, close)', 'matrix.rows(value)'],
  ['map', 'simple map<string, float>', 'map.new<string, float>()', 'map.size(value)'],
  ['UDT', 'simple Item', 'Item.new(close)', 'value.price'],
  ['line', 'simple line', 'line.new(bar_index, close, bar_index + 1, close)', 'line.get_y1(value)'],
] as const;

const itemDeclaration = `type Item
    float price`;

const convSource = `// The MIT License (MIT)
// © mihakralj
//@version=6
indicator("Convolution Moving Average (CONV)", "CONV", overlay=true)

//@function Calculates a convolution MA using any custom kernel
//@param source Series to calculate CONV from
//@param kernel Array of weights to use as convolution kernel
//@returns CONV value, calculates from first bar using available data
//@optimized Uses custom kernel convolution with O(n) complexity per bar due to lookback loop
conv(series float source, simple array<float> kernel) =>
    int kernel_size = array.size(kernel)
    if kernel_size <= 0
        runtime.error("Kernel must not be empty")
    var array<float> norm_kernel = array.new_float(1, 1.0)
    var int last_kernel_size = 1
    if last_kernel_size != kernel_size
        norm_kernel := array.copy(kernel)
        float kernel_sum = 0.0
        for i = 0 to kernel_size - 1
            kernel_sum += array.get(kernel, i)
        if kernel_sum != 0.0
            float inv_sum = 1.0 / kernel_sum
            for i = 0 to kernel_size - 1
                array.set(norm_kernel, i, array.get(kernel, i) * inv_sum)
        last_kernel_size := kernel_size
    int p = math.min(bar_index + 1, kernel_size)
    float sum = 0.0
    float weight_sum = 0.0
    for i = 0 to p - 1
        float price = source[i]
        if not na(price)
            float w = array.get(norm_kernel, i)
            sum += price * w
            weight_sum += w
    nz(sum / weight_sum, source)

// ---------- Main loop ----------

// Inputs
i_source = input.source(close, "Source")
i_kernel = array.from(1.0, 2.5, -3.14, 0.0, 1.0)

// Calculation
conv_value = conv(i_source, i_kernel)

// Plot
plot(conv_value, "CONV", color=color.yellow, linewidth=2)
`;

describe('user-callable reference parameter qualifier exception', () => {
  it('admits the unchanged conv corpus source with its simple array parameter', () => {
    expect(checkProgram(parse(convSource)).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it.each(referenceCases)(
    'admits a %s reference despite a simple parameter annotation',
    (_name, type, initial, read) => {
      const result = check(`${itemDeclaration}
read(${type} value) => ${read}
plot(read(${initial}))`);
      expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    },
  );

  it('admits a reference through an untyped wrapper of a restricted reference parameter', () => {
    const result = check(`read(simple array<float> value) => array.size(value)
wrap(value) => read(value)
plot(wrap(array.from(close)))`);
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it('admits an explicitly qualified non-receiver method reference parameter', () => {
    const result = check(`method read(array<float> receiver, simple matrix<float> value) => matrix.rows(value)
values = array.from(close)
plot(values.read(matrix.new<float>(1, 1, close)))`);
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it('admits an imported reference parameter with a simple annotation', () => {
    const library = parse(`//@version=6
library("References")
export read(simple array<float> value) => array.size(value)`);
    const result = checkProgram(
      parse(`//@version=6
indicator("Imported reference qualifier")
import TestUser/References/1 as refs
plot(refs.read(array.from(close)))`),
      { libraries: new Map([['TestUser/References/1', library]]) },
    );
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it.each([
    ['simple int', 'bar_index'],
    ['simple float', 'close'],
    ['simple bool', 'close > open'],
    ['const string', 'str.tostring(close)'],
  ])('still refuses a stronger value for %s', (type, value) => {
    const result = check(`consume(${type} value) => value
result = consume(${value})`);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });

  it.each([
    ['simple array<float>', 'matrix.new<float>(1, 1, close)'],
    ['simple map<string, float>', 'array.from(close)'],
  ])('still refuses an incompatible reference for %s', (type, value) => {
    const result = check(`consume(${type} value) => value
result = consume(${value})`);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });
});
