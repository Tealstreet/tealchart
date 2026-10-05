import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

// Numeric receiver parameters from the official v6 reference's allowedTypeIDs.
const operations = [
  ['avg', '', ''], ['covariance', ', id2=values', 'id2=values'],
  ['max', '', ''], ['median', '', ''], ['min', '', ''], ['mode', '', ''],
  ['percentile_linear_interpolation', ', percentage=50', 'percentage=50'],
  ['percentile_nearest_rank', ', percentage=50', 'percentage=50'],
  ['percentrank', ', index=0', 'index=0'], ['range', '', ''],
  ['stdev', ', biased=false', 'biased=false'],
  ['sum', '', ''], ['variance', ', biased=false', 'biased=false'],
];
const forbiddenTypes = ['bool', 'string', 'color', 'line', 'box', 'label', 'table', 'linefill', 'polyline', 'chart.point', 'Sample'];

describe('numeric array receiver constraints', () => {
  for (const [operation, namespaceArgs, methodArgs] of operations) {
    it.each(forbiddenTypes)(`${operation} refuses %s namespace and method receivers`, (elementType) => {
      const result = checkProgram(parse(`//@version=6
indicator("Numeric receiver contract")
type Sample
    float value
values = array.new<${elementType}>()
array.${operation}(id${operation === 'covariance' ? '1' : ''}=values${namespaceArgs})
values.${operation}(${methodArgs})
plot(close)
`));
      const suffix = `requires an int or float array, got array<${elementType}>`;
      // The separate second-ID guard from 8b32502fbda owns covariance's id2 diagnostic.
      const messages = operation === 'covariance'
        ? [`array.covariance() id1 ${suffix}`, `array.covariance id2 requires an array of int or float elements, got array<${elementType}>`]
        : [`array.${operation}() ${suffix}`];
      expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([...messages, ...messages]);
    });

    it.each(['int', 'float'])(`${operation} accepts %s namespace and method receivers`, (elementType) => {
      const result = checkProgram(parse(`//@version=6
indicator("Numeric receiver control")
values = array.new<${elementType}>(3, 2)
array.${operation}(id${operation === 'covariance' ? '1' : ''}=values${namespaceArgs})
values.${operation}(${methodArgs})
plot(close)
`));
      expect(result.diagnostics).toEqual([]);
    });
  }

  it('checks each covariance input independently, including the id alias', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Covariance input contracts")
good = array.from(1.0)
bad = array.from(true)
array.covariance(id=good, id2=bad)
good.covariance(bad)
array.covariance(bad, good)
bad.covariance(good)
plot(close)
`));
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.covariance id2 requires an array of int or float elements, got array<bool>',
      'array.covariance id2 requires an array of int or float elements, got array<bool>',
      'array.covariance() id1 requires an int or float array, got array<bool>',
      'array.covariance() id1 requires an int or float array, got array<bool>',
    ]);
  });

  it('accepts user methods that shadow stat helper names on nonnumeric arrays', () => {
    const result = checkProgram(parse(`//@version=6
indicator("User method receiver")
method max(array<bool> values) => array.size(values)
values = array.from(true)
plot(values.max())
`));
    expect(result.diagnostics).toEqual([]);
  });
});
