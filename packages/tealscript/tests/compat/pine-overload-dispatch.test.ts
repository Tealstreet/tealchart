import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('same-arity typed overload dispatch', () => {
  it.each([5, 6])('dispatches int and string overloads in v%s', (version) => {
    const result = runCompatScript(`//@version=${version}
indicator("Typed overload dispatch")
f(int x) => x + 1
f(string x) => 7
plot(f(1), "Integer")
plot(f("a"), "String")
`);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'Integer')?.values).toEqual(Array(compatibilityBars.length).fill(2));
    expect(result.plots.find((plot) => plot.title === 'String')?.values).toEqual(Array(compatibilityBars.length).fill(7));
  });

  it('dispatches typed aliases, named arguments and nested calls', () => {
    const result = runCompatScript(`//@version=6
indicator("Typed nested overload dispatch")
f(int x) => x + 1
f(string x) => str.length(x)
g(int x) => f(x=x)
i = input.int(4)
s = input.string("abc")
plot(g(i), "Integer")
plot(f(x=s), "String")
`);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'Integer')?.values).toEqual(Array(compatibilityBars.length).fill(5));
    expect(result.plots.find((plot) => plot.title === 'String')?.values).toEqual(Array(compatibilityBars.length).fill(3));
  });


  it('keeps state independent at distinct calls to a typed overload', () => {
    const result = runCompatScript(`//@version=6
indicator("Stateful overload dispatch")
f(int x) =>
    var int sum = 0
    sum += x
    sum
f(string x) => str.length(x)
plot(f(1), "One")
plot(f(2), "Two")
plot(f("abc"), "String")
`);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'One')?.values).toEqual(compatibilityBars.map((_, index) => index + 1));
    expect(result.plots.find((plot) => plot.title === 'Two')?.values).toEqual(compatibilityBars.map((_, index) => 2 * (index + 1)));
    expect(result.plots.find((plot) => plot.title === 'String')?.values).toEqual(Array(compatibilityBars.length).fill(3));
  });

});
