import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

const families = [
  ['array', 'array<int>', 'array<float>', 'array.from(1)', 'array.from(1.0)'],
  ['matrix', 'matrix<int>', 'matrix<float>', 'matrix.new<int>(1,1,1)', 'matrix.new<float>(1,1,1.0)'],
  ['map', 'map<string,int>', 'map<string,float>', 'map.new<string,int>()', 'map.new<string,float>()'],
] as const;

describe('typed collection method selection', () => {
  it.each(families)('selects each %s receiver through an untyped wrapper', (_family, intType, floatType, intValue, floatValue) => {
    const result = runCompatScript(`//@version=6
indicator("wrapped receivers")
method tag(${intType} self) => 11
method tag(${floatType} self) => 22
forward(self) => self.tag()
relay(self) => forward(self)
plot(forward(${intValue}), "int")
plot(forward(${floatValue}), "float")
plot(relay(${intValue}), "nested int")
plot(relay(${floatValue}), "nested float")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'int').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'float').values).toEqual(Array(12).fill(22));
    expect(getPlot(result, 'nested int').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'nested float').values).toEqual(Array(12).fill(22));
  });

  it.each(families.flatMap((family) => [false, true].map((reverse) => [...family, reverse] as const)))('selects the exact %s receiver overload', (_family, intType, floatType, intValue, floatValue, reverse) => {
    const declarations = [`method tag(${intType} a) => 11`, `method tag(${floatType} a) => 22`];
    if (reverse) declarations.reverse();
    const result = runCompatScript(`//@version=6
indicator("typed receivers")
${declarations.join('\n')}
x = ${intValue}
y = ${floatValue}
plot(x.tag(), "int")
plot(y.tag(), "float")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'int').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'float').values).toEqual(Array(12).fill(22));
  });

  it('preserves named argument binding and scalar parameter overloads', () => {
    const result = runCompatScript(`//@version=6
indicator("named overloads")
method tag(array<int> a, int value) => value + 10
method tag(array<int> a, string value) => str.length(value) + 20
x = array.from(1)
plot(x.tag(value=3), "number")
plot(x.tag(value="four"), "string")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'number').values).toEqual(Array(12).fill(13));
    expect(getPlot(result, 'string').values).toEqual(Array(12).fill(24));
  });

  it('preserves identical method replacement and builtin calls', () => {
    const result = runCompatScript(`//@version=6
indicator("replacement")
method tag(array<int> a) => 11
method tag(array<int> a) => 22
x = array.from(1)
plot(x.tag(), "replacement")
plot(x.size(), "builtin")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'replacement').values).toEqual(Array(12).fill(22));
    expect(getPlot(result, 'builtin').values).toEqual(Array(12).fill(1));
  });

  it('keeps distinct UDT element methods separate', () => {
    const result = runCompatScript(`//@version=6
indicator("UDT collections")
type First
    int value
type Second
    int value
method tag(array<First> a) => 11
method tag(array<Second> a) => 22
forward(self) => self.tag()
x = array.new<First>()
y = array.new<Second>()
plot(x.tag(), "first")
plot(y.tag(), "second")
plot(forward(x), "wrapped first")
plot(forward(y), "wrapped second")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'first').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'second').values).toEqual(Array(12).fill(22));
    expect(getPlot(result, 'wrapped first').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'wrapped second').values).toEqual(Array(12).fill(22));
  });
});
