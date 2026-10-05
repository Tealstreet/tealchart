import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

describe('array percentile receiver types', () => {
  const operations = ['percentile_nearest_rank', 'percentile_linear_interpolation'];
  const forbiddenTypes = ['bool', 'string', 'color', 'line', 'box', 'label', 'table', 'linefill', 'polyline', 'chart.point', 'Sample'];

  for (const operation of operations) {
    it.each(forbiddenTypes)(`${operation} refuses empty %s arrays in namespace and method calls`, (elementType) => {
      const result = checkProgram(parse(`//@version=6
indicator("Percentile receiver types")
type Sample
    float value
values = array.new<${elementType}>()
plot(array.${operation}(id=values, percentage=50))
plot(values.${operation}(percentage=50))
`));

      expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
        `array.${operation}() requires an int or float array, got array<${elementType}>`,
        `array.${operation}() requires an int or float array, got array<${elementType}>`,
      ]);
    });

    it.each(['true', '"3"'])(`${operation} refuses coercible nonnumeric values: %s`, (value) => {
      const result = checkProgram(parse(`//@version=6
indicator("Nonnumeric percentile")
values = array.from(${value})
plot(array.${operation}(values, 50))
`));
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.code).toBe('type-mismatch');
    });

    it.each(['int', 'float'])(`${operation} accepts empty and populated %s arrays`, (elementType) => {
      const result = checkProgram(parse(`//@version=6
indicator("Numeric percentile")
empty = array.new<${elementType}>()
values = array.new<${elementType}>(3, 2)
plot(array.${operation}(empty, 50))
plot(values.${operation}(50))
`));
      expect(result.diagnostics).toEqual([]);
    });
  }
});
