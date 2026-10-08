import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
const cases = [
  {
    "id": "int False result bool",
    "reference": "functions[598]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nbool result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "int False result simple int",
    "reference": "functions[598]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nsimple int result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "int False result int",
    "reference": "functions[598]",
    "error": false,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nint result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "int True result bool",
    "reference": "methods[179]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nbool result = m.median()\nplot(1)\n"
  },
  {
    "id": "int True result simple int",
    "reference": "methods[179]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nsimple int result = m.median()\nplot(1)\n"
  },
  {
    "id": "int True result int",
    "reference": "methods[179]",
    "error": false,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<int>(1, 3, 3)\nint result = m.median()\nplot(1)\n"
  },
  {
    "id": "float False result bool",
    "reference": "functions[597]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nbool result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "float False result simple float",
    "reference": "functions[597]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nsimple float result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "float False result float",
    "reference": "functions[597]",
    "error": false,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nfloat result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "float True result bool",
    "reference": "methods[178]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nbool result = m.median()\nplot(1)\n"
  },
  {
    "id": "float True result simple float",
    "reference": "methods[178]",
    "error": true,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nsimple float result = m.median()\nplot(1)\n"
  },
  {
    "id": "float True result float",
    "reference": "methods[178]",
    "error": false,
    "source": "//@version=6\nindicator(\"median overload\")\nm = matrix.new<float>(1, 3, 3)\nfloat result = m.median()\nplot(1)\n"
  },
  {
    "id": "selected custom median string result",
    "reference": "methods[178] builtin identity control",
    "error": false,
    "source": "//@version=6\nindicator(\"custom median\")\nmethod median(matrix<float> self) =>\n    \"custom\"\nm = matrix.new<float>(1, 3, 3)\nstring result = m.median()\nplot(1)\n"
  },
  {
    "id": "float False result int",
    "reference": "functions[597]",
    "error": true,
    "source": "//@version=6\nindicator(\"float median kind\")\nm = matrix.new<float>(1, 3, 3.25)\nint result = matrix.median(m)\nplot(1)\n"
  },
  {
    "id": "float True result int",
    "reference": "methods[178]",
    "error": true,
    "source": "//@version=6\nindicator(\"float median kind\")\nm = matrix.new<float>(1, 3, 3.25)\nint result = m.median()\nplot(1)\n"
  }
];

describe('matrix.median numeric series overload results', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const errors = checkProgram(parse(entry.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors.length > 0).toBe(entry.error);
    });
  }
});
