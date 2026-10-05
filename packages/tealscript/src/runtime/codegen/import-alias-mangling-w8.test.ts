import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [{ time: 60000, open: 1, high: 2, low: 0, close: 1, volume: 1 }];
const helper = parse(`//@version=6
library("Helper")
helper(int x) => x + 1
export value() => helper(1)`);

function run(source: string, libraries = new Map([['Witness/Helper/1', helper]])) {
  const result = executeScript(parse(source), bars, undefined, { libraries });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  return result.plots.map(plot => plot.values);
}

describe('imported names preserve legal identifiers without collisions', () => {
  it.each(['a', 'a_b', 'a__b'])('resolves private helpers under alias %s', alias => {
    expect(run(`//@version=6
indicator("Alias")
import Witness/Helper/1 as ${alias}
plot(${alias}.value())`)).toEqual([[2]]);
  });

  it('separates aliases and member names containing the legacy delimiter', () => {
    const other = parse(`//@version=6
library("Other")
b__helper(int x) => x + 10
export value() => b__helper(1)`);
    expect(run(`//@version=6
indicator("Two aliases")
import Witness/Helper/1 as a__b
import Witness/Other/1 as a
plot(a__b.value())
plot(a.value())`, new Map([['Witness/Helper/1', helper], ['Witness/Other/1', other]]))).toEqual([[2], [11]]);
  });

  it('separates a chart function from an imported private internal name', () => {
    expect(run(`//@version=6
indicator("Local collision")
import Witness/Helper/1 as a
a__helper(int x) => x + 100
plot(a.value())
plot(a__helper(1))`)).toEqual([[2], [101]]);
  });
});

it('keeps length-prefixed names injective for ambiguous component boundaries', async () => {
  const { importedInternalName } = await import('./importedNames');
  const reserved = new Set<string>();
  expect(importedInternalName(['a__b', 'c'], reserved)).not.toBe(importedInternalName(['a', 'b__c'], reserved));
  expect(importedInternalName(['a', 'helper'], new Set(['a__helper']))).not.toBe('a__helper');
  expect(importedInternalName(['a', 'helper'], reserved)).toBe('a__helper');
});

const exactWitnesses = [
  {
    "id": "private-a_b",
    "family": "alias-mangling",
    "source": "//@version=6\nindicator(\"Independent alias\")\nimport Independent/Private/1 as a_b\nplot(a_b.value())\n",
    "libraries": {
      "Independent/Private/1": "//@version=6\nlibrary(\"Private\")\nhelper(int x) => x + 4\nexport value() => helper(37)\n"
    },
    "expected": [
      [
        41,
        41,
        41
      ]
    ]
  },
  {
    "id": "private-a__b",
    "family": "alias-mangling",
    "source": "//@version=6\nindicator(\"Independent alias\")\nimport Independent/Private/1 as a__b\nplot(a__b.value())\n",
    "libraries": {
      "Independent/Private/1": "//@version=6\nlibrary(\"Private\")\nhelper(int x) => x + 4\nexport value() => helper(37)\n"
    },
    "expected": [
      [
        41,
        41,
        41
      ]
    ]
  },
  {
    "id": "private-a___b",
    "family": "alias-mangling",
    "source": "//@version=6\nindicator(\"Independent alias\")\nimport Independent/Private/1 as a___b\nplot(a___b.value())\n",
    "libraries": {
      "Independent/Private/1": "//@version=6\nlibrary(\"Private\")\nhelper(int x) => x + 4\nexport value() => helper(37)\n"
    },
    "expected": [
      [
        41,
        41,
        41
      ]
    ]
  },
  {
    "id": "flatten-collision-False",
    "family": "alias-mangling",
    "source": "//@version=6\nindicator(\"Independent names\")\nimport Independent/Outer/1 as a__b\nimport Independent/Other/1 as a\nplot(a__b.value())\nplot(a.b__value())\n",
    "libraries": {
      "Independent/Outer/1": "//@version=6\nlibrary(\"Outer\")\nexport value() => 13\n",
      "Independent/Other/1": "//@version=6\nlibrary(\"Other\")\nexport b__value() => 29\n"
    },
    "expected": [
      [
        13,
        13,
        13
      ],
      [
        29,
        29,
        29
      ]
    ]
  },
  {
    "id": "flatten-collision-True",
    "family": "alias-mangling",
    "source": "//@version=6\nindicator(\"Independent names\")\nimport Independent/Other/1 as a\nimport Independent/Outer/1 as a__b\nplot(a__b.value())\nplot(a.b__value())\n",
    "libraries": {
      "Independent/Outer/1": "//@version=6\nlibrary(\"Outer\")\nexport value() => 13\n",
      "Independent/Other/1": "//@version=6\nlibrary(\"Other\")\nexport b__value() => 29\n"
    },
    "expected": [
      [
        13,
        13,
        13
      ],
      [
        29,
        29,
        29
      ]
    ]
  }
];

it.each(exactWitnesses)('preserves independent exact vector: $id', witness => {
  const libraries = new Map(Object.entries(witness.libraries).map(([name, source]) => [name, parse(source)]));
  const contextBars = [10, 11, 12].map((close, index) => ({ time: 60000 * (index + 1), open: close, high: close + 1, low: close - 1, close, volume: 1 }));
  const result = executeScript(parse(witness.source), contextBars, undefined, { libraries });
  expect(result.errors).toEqual([]);
  expect(result.plots.map(plot => plot.values)).toEqual(witness.expected);
});
