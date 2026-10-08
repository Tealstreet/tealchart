import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
const cases = [
  {
    "id": "reshape False missing rows",
    "reference": "functions[570]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape False missing columns",
    "reference": "functions[570]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=2)\nplot(1)\n"
  },
  {
    "id": "reshape True missing rows",
    "reference": "methods[151]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nm.reshape(columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape True missing columns",
    "reference": "methods[151]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False missing row1",
    "reference": "functions[584]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False missing row2",
    "reference": "functions[584]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True missing row1",
    "reference": "methods[165]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True missing row2",
    "reference": "methods[165]",
    "source": "//@version=6\nindicator(\"required coordinate\")\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=2)\nplot(1)\n"
  }
];

describe('collection29 required matrix coordinates', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const errors = checkProgram(parse(entry.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors).not.toEqual([]);
    });
  }
});
