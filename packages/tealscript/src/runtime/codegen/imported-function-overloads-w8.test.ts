import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const libraries = new Map([
  [
    'Test/Overloads/1',
    parse(`//@version=6
library("Overloads")
export choose(array<float> x) =>
    11.5
export choose(array<int> x) =>
    22
`),
  ],
]);
const program = (argument: string) =>
  parse(`//@version=6
indicator("Imported overloads")
import Test/Overloads/1 as lib
plot(lib.choose(${argument}))`);
const bars = [{ time: 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('imported function overloads select qualified argument types', () => {
  it.each([
    ['array.new_float()', 11.5],
    ['array.new_int()', 22],
  ])('dispatches %s', (argument, expected) => {
    const ast = program(String(argument));
    expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars, undefined, { libraries });
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([expected]);
  });

  it('refuses an ambiguous missing reference argument', () => {
    expect(checkProgram(program('na'), { libraries }).diagnostics.some((d) => d.code === 'ambiguous-call')).toBe(true);
  });

  it('preserves the refusal of an unsupported collection type', () => {
    expect(
      checkProgram(program('array.new_bool()'), { libraries }).diagnostics.some((d) => d.severity === 'error'),
    ).toBe(true);
  });
});

const declarationOrderControls = [
  {
    id: 'float-int-positional',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(array.from(1.25)))\nplot(lib.choose(array.from(7)))\n',
    expectedValues: [
      [101.25, 101.25, 101.25],
      [207, 207, 207],
    ],
    expectedError: null,
    sourceSHA256: 'fd42dcc87f71656a1e4a1afb098844455e1409a0db1e06d4dd68274a6241c788',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
  {
    id: 'float-int-named',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(values=array.from(2.5)))\nplot(lib.choose(values=array.from(9)))\n',
    expectedValues: [
      [102.5, 102.5, 102.5],
      [209, 209, 209],
    ],
    expectedError: null,
    sourceSHA256: '818a1a9609a05acd14d1abc80233132e9a20941756120a5e3705cfbffd75f3c1',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
  {
    id: 'float-int-typed-missing',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\narray<float> f = na\narray<int> i = na\nplot(lib.choose(f))\nplot(lib.choose(i))\n',
    expectedValues: null,
    expectedError: null,
    checkOnly: true,
    sourceSHA256: '06027ed7b00bfcc7a164aa25e5634565f8187951f645d1ed5d7906ddcedbf6f2',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
  {
    id: 'int-float-positional',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(array.from(1.25)))\nplot(lib.choose(array.from(7)))\n',
    expectedValues: [
      [101.25, 101.25, 101.25],
      [207, 207, 207],
    ],
    expectedError: null,
    sourceSHA256: 'fd42dcc87f71656a1e4a1afb098844455e1409a0db1e06d4dd68274a6241c788',
    librarySHA256: '3eab38c546a2816ad2ab3c5f5bcd3fcb2833cae5cf35a5d3f996ac90bb515c9f',
  },
  {
    id: 'int-float-named',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(values=array.from(2.5)))\nplot(lib.choose(values=array.from(9)))\n',
    expectedValues: [
      [102.5, 102.5, 102.5],
      [209, 209, 209],
    ],
    expectedError: null,
    sourceSHA256: '818a1a9609a05acd14d1abc80233132e9a20941756120a5e3705cfbffd75f3c1',
    librarySHA256: '3eab38c546a2816ad2ab3c5f5bcd3fcb2833cae5cf35a5d3f996ac90bb515c9f',
  },
  {
    id: 'int-float-typed-missing',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\narray<float> f = na\narray<int> i = na\nplot(lib.choose(f))\nplot(lib.choose(i))\n',
    expectedValues: null,
    expectedError: null,
    checkOnly: true,
    sourceSHA256: '06027ed7b00bfcc7a164aa25e5634565f8187951f645d1ed5d7906ddcedbf6f2',
    librarySHA256: '3eab38c546a2816ad2ab3c5f5bcd3fcb2833cae5cf35a5d3f996ac90bb515c9f',
  },
  {
    id: 'named-cross-signature-ambiguity',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport cross(float x, int y) => x + y\nexport cross(int y, float x) => x - y\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.cross(x=1.5, y=2))\n',
    expectedValues: null,
    expectedError: 'ambiguous-call',
    sourceSHA256: 'ae0f22d8b8631df974549743f42bda18d7d92e867d3679e8dd0b463e001912ce',
    librarySHA256: '89c4ecc94c668bd873ade748ac33affda421207faa43deafda5de8467f06701c',
  },
  {
    id: 'untyped-missing-ambiguity',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(na))\n',
    expectedValues: null,
    expectedError: 'ambiguous-call',
    sourceSHA256: '50dccf9a755db5d347b581267d45de2bc73be0485260abd17cdeade1e4e6d2df',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
  {
    id: 'single-overload-alias-identity',
    librarySource: '//@version=6\nlibrary("VerifierOverloads")\nexport identity(array<float> values) => values\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\na = array.from(4.5)\nb = lib.identity(a)\narray.set(b, 0, 8.25)\nplot(array.get(a, 0))\n',
    expectedValues: [[8.25, 8.25, 8.25]],
    expectedError: null,
    sourceSHA256: 'f26c5a1eedc34fe8888cfec52e1536faf26cc635a92859b74d6aa58c9111f55f',
    librarySHA256: '748c4ac42e5634dd1e20a06b1e3d0d15daedba2a7c7ca4eaf10ed4446650808a',
  },
  {
    id: 'local-overloads-remain-distinct',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nchoose(array<float> values) => 300 + array.get(values, 0)\nchoose(array<int> values) => 400 + array.get(values, 0)\nplot(choose(array.from(1.25)))\nplot(choose(array.from(7)))\nplot(lib.choose(array.from(1.25)))\nplot(lib.choose(array.from(7)))\n',
    expectedValues: [
      [301.25, 301.25, 301.25],
      [407, 407, 407],
      [101.25, 101.25, 101.25],
      [207, 207, 207],
    ],
    expectedError: null,
    sourceSHA256: '660393d60a902458867becba79fae757e9742be240eb4a5610249cf314b75e67',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
  {
    id: 'incompatible-array-still-refused',
    librarySource:
      '//@version=6\nlibrary("VerifierOverloads")\nexport choose(array<float> values) =>\n    100 + array.get(values, 0)\nexport choose(array<int> values) =>\n    200 + array.get(values, 0)\n',
    source:
      '//@version=6\nindicator("Independent overload witness")\nimport Verify/Overloads/1 as lib\nplot(lib.choose(array.from("wrong")))\n',
    expectedValues: null,
    expectedError: 'type-mismatch',
    sourceSHA256: 'c2c25784a36c7b1721baf0def65766bde7c24855a0004659fe7be48d7fbd314e',
    librarySHA256: '6bd75928f946bd50016d9b5bc41e341866df6ca69c4e72a0de23edf3a2530f15',
  },
];

describe('imported overload declaration-order and ambiguity controls', () => {
  it.each(declarationOrderControls)('$id', (witness) => {
    const ast = parse(witness.source);
    const libraries = new Map([['Verify/Overloads/1', parse(witness.librarySource)]]);
    const errors = checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error');
    if (witness.expectedError) {
      expect(errors.some((d) => d.code === witness.expectedError)).toBe(true);
      return;
    }
    expect(errors).toEqual([]);
    if (witness.expectedValues) {
      const result = executeScript(ast, [11, 12, 13].map((close, index) => ({ time: (index + 1) * 60000, open: close, high: close + 1, low: close - 1, close, volume: 10 })), undefined, { libraries });
      expect(result.errors).toEqual([]);
      expect(result.plots.map((p) => p.values)).toEqual(witness.expectedValues);
    }
  });
});

describe('imported overload calls within the library', () => {
  it('retains the selected private call target in exported wrappers', () => {
    const libraries = new Map([['Verify/Overloads/1', parse(`//@version=6
library("Nested")
choose(array<float> values, float extra) => 100 + array.get(values, 0) + extra
choose(array<int> values) => 200 + array.get(values, 0)
export wrapped() => choose(array.from(7))
`)] ]);
    const ast = parse(`//@version=6
indicator("Nested import")
import Verify/Overloads/1 as lib
plot(lib.wrapped())`);
    const result = executeScript(ast, bars, undefined, { libraries });
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([207]);
  });
});

describe('imported reference overload qualifier selection', () => {
  it('selects simple reference annotations using the existing reference qualifier rule', () => {
    const libraries = new Map([['Verify/Overloads/1', parse(`//@version=5
library("Refs")
export choose(simple label[] values) => 11
export choose(simple line[] values) => 22
`)] ]);
    const ast = parse(`//@version=5
indicator("Reference overloads")
import Verify/Overloads/1 as lib
var labels = array.new_label()
var lines = array.new_line()
plot(lib.choose(labels))
plot(lib.choose(lines))`);
    expect(checkProgram(ast, { libraries }).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars, undefined, { libraries });
    expect(result.errors).toEqual([]);
    expect(result.plots.map(p => p.values)).toEqual([[11], [22]]);
  });
});
