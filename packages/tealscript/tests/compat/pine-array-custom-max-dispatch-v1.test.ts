import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('selects the eligible custom array max method instead of the builtin aggregate', () => {
  const source = `//@version=6
indicator("Collection ranks 241-280")
method max(array<int> id, string selector) => 7
a = array.from(9, 3)
plot(a.max("custom"), title="result")
`;
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 7));
});

for (const family of ['array', 'matrix', 'map']) {
  it(`selects the ${family} overload through an untyped function receiver`, () => {
    const declarations = {
      array: 'method copy(array<float> receiver) => 17',
      matrix: 'method copy(matrix<float> receiver) => 29',
      map: 'method copy(map<string, float> receiver) => 43',
    };
    const constructors = {
      array: 'array.from(1.0)',
      matrix: 'matrix.new<float>(1, 1, 1.0)',
      map: 'map.new<string, float>()',
    };
    const others = ['array', 'matrix', 'map'].filter((kind) => kind !== family);
    const methods = [...others, family].map((kind) => declarations[kind as keyof typeof declarations]).join('\n');
    const result = runCompatScript(`//@version=6
indicator("Untyped collection receiver")
${methods}
read(receiver) => receiver.copy()
a = ${constructors[family as keyof typeof constructors]}
plot(read(a), "result")`);
    expect(result.errors).toEqual([]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(
      compatibilityBars.map(() => ({ array: 17, matrix: 29, map: 43 })[family as 'array' | 'matrix' | 'map']),
    );
  });

  it(`retains a missing ${family} through an untyped wrapper with one custom method`, () => {
    const types = { array: 'array<float>', matrix: 'matrix<float>', map: 'map<string, float>' };
    const source = `//@version=6
indicator("Missing collection through wrapper")
method copy(${types[family as keyof typeof types]} receiver) => 7
read(receiver) => receiver.copy()
${types[family as keyof typeof types]} a = na
plot(read(a), "result")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 7));
  });

  it(`uses the declared ${family} receiver kind for a missing reference`, () => {
    const types = { array: 'array<float>', matrix: 'matrix<float>', map: 'map<string, float>' };
    const result = runCompatScript(`//@version=6
indicator("Missing collection receiver")
method copy(${types[family as keyof typeof types]} receiver) => 7
${types[family as keyof typeof types]} a = na
plot(a.copy(), "result")`);
    expect(result.errors).toEqual([]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 7));
  });
}

it('retains builtin max for a numeric selector with only a custom string overload', () => {
  const source = `//@version=6
indicator("Builtin max boundary")
method max(array<int> id, string selector) => 7
a = array.from(9, 3)
plot(a.max(0), "result")`;
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  const r = runCompatScript(source);
  expect(r.errors).toEqual([]);
  expect(getPlot(r, 'result').values).toEqual(compatibilityBars.map(() => 9));
});
