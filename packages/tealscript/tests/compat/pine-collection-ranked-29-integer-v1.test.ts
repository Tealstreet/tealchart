import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Each case names its exact required integer parameter and reference entry.
const cases = [
  {
    "id": "reshape-False-rows-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=2.5, columns=3)\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-False-rows-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=\"2\", columns=3)\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-False-rows-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=true, columns=3)\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-False-columns-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=2, columns=2.5)\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "reshape-False-columns-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=2, columns=\"2\")\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "reshape-False-columns-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.reshape(m, rows=2, columns=true)\nplot(1)\n",
    "reference": "functions[570]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "reshape-True-rows-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=2.5, columns=3)\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-True-rows-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=\"2\", columns=3)\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-True-rows-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=true, columns=3)\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape rows must be an int"
  },
  {
    "id": "reshape-True-columns-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=2, columns=2.5)\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "reshape-True-columns-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=2, columns=\"2\")\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "reshape-True-columns-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.reshape(rows=2, columns=true)\nplot(1)\n",
    "reference": "methods[151]",
    "diagnostic": "matrix.reshape columns must be an int"
  },
  {
    "id": "swap_rows-False-row1-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=2.5, row2=2)\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-False-row1-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=\"2\", row2=2)\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-False-row1-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=true, row2=2)\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-False-row2-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=0, row2=2.5)\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  },
  {
    "id": "swap_rows-False-row2-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=0, row2=\"2\")\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  },
  {
    "id": "swap_rows-False-row2-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nmatrix.swap_rows(m, row1=0, row2=true)\nplot(1)\n",
    "reference": "functions[584]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  },
  {
    "id": "swap_rows-True-row1-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=2.5, row2=2)\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-True-row1-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=\"2\", row2=2)\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-True-row1-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=true, row2=2)\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row1 must be an int"
  },
  {
    "id": "swap_rows-True-row2-float-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=0, row2=2.5)\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  },
  {
    "id": "swap_rows-True-row2-string-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=0, row2=\"2\")\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  },
  {
    "id": "swap_rows-True-row2-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix argument contracts\")\nm = matrix.new<float>(3, 2, 1)\nm.swap_rows(row1=0, row2=true)\nplot(1)\n",
    "reference": "methods[165]",
    "diagnostic": "matrix.swap_rows row2 must be an int"
  }
];

describe('Pine collection ranks 1121–1142 integer parameter reference facets', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const errors = checkProgram(parse(entry.source)).diagnostics.filter((item) => item.severity === 'error');
      expect(errors.some((item) => item.message.includes(entry.diagnostic))).toBe(true);
    });
  }
});
