import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
const cases = [
  {
    "id": "reshape-id-missing",
    "source": "//@version=6\nindicator(\"required ID\")\nmatrix.reshape(rows=2, columns=3)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "swap_rows-id-missing",
    "source": "//@version=6\nindicator(\"required ID\")\nmatrix.swap_rows(row1=0, row2=2)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "median-id-missing",
    "source": "//@version=6\nindicator(\"required ID\")\nmatrix.median()\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "is_antisymmetric-id-missing",
    "source": "//@version=6\nindicator(\"required ID\")\nmatrix.is_antisymmetric()\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "reshape-False-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, 2, 3, 4)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "reshape-True-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(2, 3, 4)\nplot(1)\n",
    "reference": "methods[151]"
  },
  {
    "id": "swap_rows-False-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, 0, 2, 1)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "swap_rows-True-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(0, 2, 1)\nplot(1)\n",
    "reference": "methods[165]"
  },
  {
    "id": "median-False-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.median(m, 1)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-True-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nm.median(1)\nplot(1)\n",
    "reference": "methods[178]"
  },
  {
    "id": "is_antisymmetric-False-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.is_antisymmetric(m, 1)\nplot(1)\n",
    "reference": "functions[629]"
  }
];

describe('collection29 documented matrix admission', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const diagnostics = checkProgram(parse(entry.source)).diagnostics;
      expect(diagnostics.filter(d => d.severity === 'error')).not.toEqual([]);
    });
  }
});
