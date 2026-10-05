import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
const cases = [
  {
    "id": "reshape-id-int-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.reshape(17, rows=2, columns=3)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "reshape-id-float-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.reshape(1.5, rows=2, columns=3)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "reshape-id-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.reshape(true, rows=2, columns=3)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "reshape-id-string-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.reshape(\"id\", rows=2, columns=3)\nplot(1)\n",
    "reference": "functions[570]"
  },
  {
    "id": "swap_rows-id-int-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.swap_rows(17, row1=0, row2=2)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "swap_rows-id-float-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.swap_rows(1.5, row1=0, row2=2)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "swap_rows-id-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.swap_rows(true, row1=0, row2=2)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "swap_rows-id-string-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.swap_rows(\"id\", row1=0, row2=2)\nplot(1)\n",
    "reference": "functions[584]"
  },
  {
    "id": "median-id-int-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.median(17)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-id-float-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.median(1.5)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-id-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.median(true)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-id-string-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.median(\"id\")\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "is_antisymmetric-id-int-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.is_antisymmetric(17)\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "is_antisymmetric-id-float-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.is_antisymmetric(1.5)\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "is_antisymmetric-id-bool-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.is_antisymmetric(true)\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "is_antisymmetric-id-string-refusal",
    "source": "//@version=6\nindicator(\"matrix ID contract\")\nmatrix.is_antisymmetric(\"id\")\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "median-False-bool-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<bool>(2, 2, false)\nmatrix.median(m)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-True-bool-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<bool>(2, 2, false)\nm.median()\nplot(1)\n",
    "reference": "methods[178]"
  },
  {
    "id": "median-False-string-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<string>(2, 2, \"one\")\nmatrix.median(m)\nplot(1)\n",
    "reference": "functions[597]"
  },
  {
    "id": "median-True-string-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<string>(2, 2, \"one\")\nm.median()\nplot(1)\n",
    "reference": "methods[178]"
  },
  {
    "id": "is_antisymmetric-False-bool-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<bool>(2, 2, false)\nmatrix.is_antisymmetric(m)\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "is_antisymmetric-True-bool-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<bool>(2, 2, false)\nm.is_antisymmetric()\nplot(1)\n",
    "reference": "methods[210]"
  },
  {
    "id": "is_antisymmetric-False-string-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<string>(2, 2, \"one\")\nmatrix.is_antisymmetric(m)\nplot(1)\n",
    "reference": "functions[629]"
  },
  {
    "id": "is_antisymmetric-True-string-numeric-refusal",
    "source": "//@version=6\nindicator(\"matrix numeric ID\")\nm = matrix.new<string>(2, 2, \"one\")\nm.is_antisymmetric()\nplot(1)\n",
    "reference": "methods[210]"
  },
  {
    "id": "is_antisymmetric-True-extra-argument",
    "source": "//@version=6\nindicator(\"arity\")\nm = matrix.new<float>(3, 2, 1)\nm.is_antisymmetric(1)\nplot(1)\n",
    "reference": "methods[210]"
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
