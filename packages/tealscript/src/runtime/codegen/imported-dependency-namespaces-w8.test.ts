import { expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const witnesses = [
  {
    "id": "nested-reverse-False-distinct-False",
    "family": "nested-alias",
    "source": "//@version=6\nindicator(\"Independent dependencies\")\nimport Independent/Left/1 as left\nimport Independent/Right/1 as right\nplot(left.value())\nplot(right.value())\n",
    "libraries": {
      "Independent/One/1": "//@version=6\nlibrary(\"One\")\nexport value() => 13\n",
      "Independent/Two/1": "//@version=6\nlibrary(\"Two\")\nexport value() => 29\n",
      "Independent/Left/1": "//@version=6\nlibrary(\"Left\")\nimport Independent/One/1 as dep\nexport value() => dep.value()\n",
      "Independent/Right/1": "//@version=6\nlibrary(\"Right\")\nimport Independent/Two/1 as dep\nexport value() => dep.value()\n"
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
    "id": "nested-reverse-True-distinct-False",
    "family": "nested-alias",
    "source": "//@version=6\nindicator(\"Independent dependencies\")\nimport Independent/Right/1 as right\nimport Independent/Left/1 as left\nplot(left.value())\nplot(right.value())\n",
    "libraries": {
      "Independent/One/1": "//@version=6\nlibrary(\"One\")\nexport value() => 13\n",
      "Independent/Two/1": "//@version=6\nlibrary(\"Two\")\nexport value() => 29\n",
      "Independent/Left/1": "//@version=6\nlibrary(\"Left\")\nimport Independent/One/1 as dep\nexport value() => dep.value()\n",
      "Independent/Right/1": "//@version=6\nlibrary(\"Right\")\nimport Independent/Two/1 as dep\nexport value() => dep.value()\n"
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
    "id": "nested-reverse-False-distinct-True",
    "family": "nested-alias",
    "source": "//@version=6\nindicator(\"Independent dependencies\")\nimport Independent/Left/1 as left\nimport Independent/Right/1 as right\nplot(left.value())\nplot(right.value())\n",
    "libraries": {
      "Independent/One/1": "//@version=6\nlibrary(\"One\")\nexport value() => 13\n",
      "Independent/Two/1": "//@version=6\nlibrary(\"Two\")\nexport value() => 29\n",
      "Independent/Left/1": "//@version=6\nlibrary(\"Left\")\nimport Independent/One/1 as dep\nexport value() => dep.value()\n",
      "Independent/Right/1": "//@version=6\nlibrary(\"Right\")\nimport Independent/Two/1 as separate\nexport value() => separate.value()\n"
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

it.each(witnesses)('isolates dependency namespaces: $id', witness => {
  const libraries = new Map(Object.entries(witness.libraries).map(([name, source]) => [name, parse(source)]));
  const bars = [10, 11, 12].map((close, index) => ({ time: 60000 * (index + 1), open: close, high: close + 1, low: close - 1, close, volume: 1 }));
  const result = executeScript(parse(witness.source), bars, undefined, { libraries });
  expect(result.errors).toEqual([]);
  expect(result.plots.map(plot => plot.values)).toEqual(witness.expected);
});
