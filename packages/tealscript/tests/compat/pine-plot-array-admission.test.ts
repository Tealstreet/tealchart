import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const messages = (source: string) => checkProgram(parse(source)).diagnostics.map((diagnostic) => diagnostic.message);

describe('ordinary plot array admission', () => {
  it.each([5, 6])('refuses constructed array series in v%s', (version) => {
    expect(messages(`//@version=${version}
indicator("Array plot")
values = array.from(1.0)
plot(values)`)).toContain('plot series must be a number, got array<float>');
  });

  it.each([5, 6])('refuses named array series in v%s', (version) => {
    expect(messages(`//@version=${version}
indicator("Named array plot")
plot(title="Array", series=array.new_int(2))`)).toContain('plot series must be a number, got array<int>');
  });

  it('refuses the corpus1510 lower-timeframe array result before runtime', () => {
    expect(messages(`//@version=5
indicator("Lower timeframe array plot")
x = request.security_lower_tf("NYSE:IBM", "30S", close)
plot(x)`)).toContain('plot series must be a number, got array<float>');
  });

  it('preserves scalar array projections and numeric or na plots', () => {
    expect(messages(`//@version=6
indicator("Scalar projections")
a = array.from(1.0)
plot(array.size(a))
plot(array.get(a, 0))
plot(close)
plot(na)`)).toEqual([]);
  });

  it('preserves a local callable named plot with an array parameter', () => {
    expect(messages(`//@version=6
indicator("Local plot shadow")
plot(array<float> values) => array.size(values)
a = array.from(1.0)
result = plot(a)`)).toEqual([]);
  });
});
