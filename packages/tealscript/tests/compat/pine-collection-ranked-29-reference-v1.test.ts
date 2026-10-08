import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
// Each case cites its namespace or method entry; these are bounded runtime facets.
const cases = [
  {
    "id": "reshape-int-False",
    "source": "//@version=6\nindicator(\"collection29\")\nm = matrix.new<int>(2, 3, 0)\nmatrix.reshape(m, 3, 2)\nplot(m.rows(), \"rows\")\nplot(m.columns(), \"columns\")\nplot(m.elements_count(), \"count\")\n",
    "reference": "functions[570]",
    "expected": {
      "rows": 3,
      "columns": 2,
      "count": 6
    }
  },
  {
    "id": "swap-int-False",
    "source": "//@version=6\nindicator(\"swap\")\nm = matrix.new<int>(3, 2, 0)\nm.set(0, 0, 1)\nm.set(0, 1, 2)\nm.set(1, 0, 3)\nm.set(1, 1, 4)\nm.set(2, 0, 5)\nm.set(2, 1, 6)\nmatrix.swap_rows(m, 0, 2)\nplot(m.get(0, 0), \"cell0\")\nplot(m.get(0, 1), \"cell1\")\nplot(m.get(1, 0), \"cell2\")\nplot(m.get(1, 1), \"cell3\")\nplot(m.get(2, 0), \"cell4\")\nplot(m.get(2, 1), \"cell5\")\n",
    "reference": "functions[584]",
    "expected": {
      "cell0": 5,
      "cell1": 6,
      "cell2": 3,
      "cell3": 4,
      "cell4": 1,
      "cell5": 2
    }
  },
  {
    "id": "median-int-False",
    "source": "//@version=6\nindicator(\"median\")\nm = matrix.new<int>(1, 5, na)\nm.set(0, 1, 8)\nm.set(0, 2, 1)\nm.set(0, 4, 3)\nplot(matrix.median(m), \"median\")\n",
    "reference": "functions[598]",
    "expected": {
      "median": 3
    }
  },
  {
    "id": "antisymmetric-int-False",
    "source": "//@version=6\nindicator(\"antisymmetric\")\nm = matrix.new<int>(2, 2, 0)\nm.set(0, 1, 7)\nm.set(1, 0, -7)\nplot(matrix.is_antisymmetric(m) ? 1 : 0, \"true\")\nm.set(1, 0, 7)\nplot(matrix.is_antisymmetric(m) ? 1 : 0, \"false\")\n",
    "reference": "functions[629]",
    "expected": {
      "true": 1,
      "false": 0
    }
  },
  {
    "id": "reshape-int-True",
    "source": "//@version=6\nindicator(\"collection29\")\nm = matrix.new<int>(2, 3, 0)\nm.reshape(3, 2)\nplot(m.rows(), \"rows\")\nplot(m.columns(), \"columns\")\nplot(m.elements_count(), \"count\")\n",
    "reference": "methods[151]",
    "expected": {
      "rows": 3,
      "columns": 2,
      "count": 6
    }
  },
  {
    "id": "swap-int-True",
    "source": "//@version=6\nindicator(\"swap\")\nm = matrix.new<int>(3, 2, 0)\nm.set(0, 0, 1)\nm.set(0, 1, 2)\nm.set(1, 0, 3)\nm.set(1, 1, 4)\nm.set(2, 0, 5)\nm.set(2, 1, 6)\nm.swap_rows(0, 2)\nplot(m.get(0, 0), \"cell0\")\nplot(m.get(0, 1), \"cell1\")\nplot(m.get(1, 0), \"cell2\")\nplot(m.get(1, 1), \"cell3\")\nplot(m.get(2, 0), \"cell4\")\nplot(m.get(2, 1), \"cell5\")\n",
    "reference": "methods[165]",
    "expected": {
      "cell0": 5,
      "cell1": 6,
      "cell2": 3,
      "cell3": 4,
      "cell4": 1,
      "cell5": 2
    }
  },
  {
    "id": "median-int-True",
    "source": "//@version=6\nindicator(\"median\")\nm = matrix.new<int>(1, 5, na)\nm.set(0, 1, 8)\nm.set(0, 2, 1)\nm.set(0, 4, 3)\nplot(m.median(), \"median\")\n",
    "reference": "methods[179]",
    "expected": {
      "median": 3
    }
  },
  {
    "id": "antisymmetric-int-True",
    "source": "//@version=6\nindicator(\"antisymmetric\")\nm = matrix.new<int>(2, 2, 0)\nm.set(0, 1, 7)\nm.set(1, 0, -7)\nplot(m.is_antisymmetric() ? 1 : 0, \"true\")\nm.set(1, 0, 7)\nplot(m.is_antisymmetric() ? 1 : 0, \"false\")\n",
    "reference": "methods[210]",
    "expected": {
      "true": 1,
      "false": 0
    }
  },
  {
    "id": "reshape-float-False",
    "source": "//@version=6\nindicator(\"collection29\")\nm = matrix.new<float>(2, 3, 0)\nmatrix.reshape(m, 3, 2)\nplot(m.rows(), \"rows\")\nplot(m.columns(), \"columns\")\nplot(m.elements_count(), \"count\")\n",
    "reference": "functions[570]",
    "expected": {
      "rows": 3,
      "columns": 2,
      "count": 6
    }
  },
  {
    "id": "swap-float-False",
    "source": "//@version=6\nindicator(\"swap\")\nm = matrix.new<float>(3, 2, 0)\nm.set(0, 0, 1)\nm.set(0, 1, 2)\nm.set(1, 0, 3)\nm.set(1, 1, 4)\nm.set(2, 0, 5)\nm.set(2, 1, 6)\nmatrix.swap_rows(m, 0, 2)\nplot(m.get(0, 0), \"cell0\")\nplot(m.get(0, 1), \"cell1\")\nplot(m.get(1, 0), \"cell2\")\nplot(m.get(1, 1), \"cell3\")\nplot(m.get(2, 0), \"cell4\")\nplot(m.get(2, 1), \"cell5\")\n",
    "reference": "functions[584]",
    "expected": {
      "cell0": 5,
      "cell1": 6,
      "cell2": 3,
      "cell3": 4,
      "cell4": 1,
      "cell5": 2
    }
  },
  {
    "id": "median-float-False",
    "source": "//@version=6\nindicator(\"median\")\nm = matrix.new<float>(1, 5, na)\nm.set(0, 1, 8)\nm.set(0, 2, 1)\nm.set(0, 4, 3)\nplot(matrix.median(m), \"median\")\n",
    "reference": "functions[597]",
    "expected": {
      "median": 3
    }
  },
  {
    "id": "antisymmetric-float-False",
    "source": "//@version=6\nindicator(\"antisymmetric\")\nm = matrix.new<float>(2, 2, 0)\nm.set(0, 1, 7)\nm.set(1, 0, -7)\nplot(matrix.is_antisymmetric(m) ? 1 : 0, \"true\")\nm.set(1, 0, 7)\nplot(matrix.is_antisymmetric(m) ? 1 : 0, \"false\")\n",
    "reference": "functions[629]",
    "expected": {
      "true": 1,
      "false": 0
    }
  },
  {
    "id": "reshape-float-True",
    "source": "//@version=6\nindicator(\"collection29\")\nm = matrix.new<float>(2, 3, 0)\nm.reshape(3, 2)\nplot(m.rows(), \"rows\")\nplot(m.columns(), \"columns\")\nplot(m.elements_count(), \"count\")\n",
    "reference": "methods[151]",
    "expected": {
      "rows": 3,
      "columns": 2,
      "count": 6
    }
  },
  {
    "id": "swap-float-True",
    "source": "//@version=6\nindicator(\"swap\")\nm = matrix.new<float>(3, 2, 0)\nm.set(0, 0, 1)\nm.set(0, 1, 2)\nm.set(1, 0, 3)\nm.set(1, 1, 4)\nm.set(2, 0, 5)\nm.set(2, 1, 6)\nm.swap_rows(0, 2)\nplot(m.get(0, 0), \"cell0\")\nplot(m.get(0, 1), \"cell1\")\nplot(m.get(1, 0), \"cell2\")\nplot(m.get(1, 1), \"cell3\")\nplot(m.get(2, 0), \"cell4\")\nplot(m.get(2, 1), \"cell5\")\n",
    "reference": "methods[165]",
    "expected": {
      "cell0": 5,
      "cell1": 6,
      "cell2": 3,
      "cell3": 4,
      "cell4": 1,
      "cell5": 2
    }
  },
  {
    "id": "median-float-True",
    "source": "//@version=6\nindicator(\"median\")\nm = matrix.new<float>(1, 5, na)\nm.set(0, 1, 8)\nm.set(0, 2, 1)\nm.set(0, 4, 3)\nplot(m.median(), \"median\")\n",
    "reference": "methods[178]",
    "expected": {
      "median": 3
    }
  },
  {
    "id": "antisymmetric-float-True",
    "source": "//@version=6\nindicator(\"antisymmetric\")\nm = matrix.new<float>(2, 2, 0)\nm.set(0, 1, 7)\nm.set(1, 0, -7)\nplot(m.is_antisymmetric() ? 1 : 0, \"true\")\nm.set(1, 0, 7)\nplot(m.is_antisymmetric() ? 1 : 0, \"false\")\n",
    "reference": "methods[210]",
    "expected": {
      "true": 1,
      "false": 0
    }
  }
];

describe('Pine collection ranks 1121–1160 runtime reference facets', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const result = runCompatScript(entry.source);
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries(entry.expected)) {
        expect(getPlot(result, title).values).toEqual(Array(12).fill(value));
      }
    });
  }
});
