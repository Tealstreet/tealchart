import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
const cases = [
  {
    "id": "namespace int",
    "reference": "functions[629]",
    "error": true,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nint result = matrix.is_antisymmetric(m)\nplot(1)\n"
  },
  {
    "id": "namespace simple bool",
    "reference": "functions[629]",
    "error": true,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nsimple bool result = matrix.is_antisymmetric(m)\nplot(1)\n"
  },
  {
    "id": "namespace bool",
    "reference": "functions[629]",
    "error": false,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nbool result = matrix.is_antisymmetric(m)\nplot(1)\n"
  },
  {
    "id": "receiver int",
    "reference": "methods[210]",
    "error": true,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nint result = m.is_antisymmetric()\nplot(1)\n"
  },
  {
    "id": "receiver simple bool",
    "reference": "methods[210]",
    "error": true,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nsimple bool result = m.is_antisymmetric()\nplot(1)\n"
  },
  {
    "id": "receiver bool",
    "reference": "methods[210]",
    "error": false,
    "source": "//@version=6\nindicator(\"antisymmetric result\")\nm = matrix.new<int>(2, 2, 0)\nbool result = m.is_antisymmetric()\nplot(1)\n"
  },
  {
    "id": "custom int method preserved",
    "reference": "methods[210] builtin identity boundary",
    "error": false,
    "source": "//@version=6\nindicator(\"custom predicate\")\nmethod is_antisymmetric(matrix<int> self) =>\n    7\nm = matrix.new<int>(2, 2, 0)\nint result = m.is_antisymmetric()\nplot(result)\n"
  }
];

describe('matrix.is_antisymmetric documented series bool', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const errors = checkProgram(parse(entry.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors.length > 0).toBe(entry.error);
    });
  }
});
