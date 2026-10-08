import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
const cases = [
  {
    "id": "reshape False rows const int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape False rows input int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape False rows simple int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape False rows series int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape False columns const int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape False columns input int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape False columns simple int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape False columns series int",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.reshape(id=m, rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape False anymatrix bool",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<bool>(3, 2, false)\nmatrix.reshape(m, 2, 3)\nplot(1)\n"
  },
  {
    "id": "reshape False anymatrix string",
    "reference": "functions[570]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<string>(3, 2, \"value\")\nmatrix.reshape(m, 2, 3)\nplot(1)\n"
  },
  {
    "id": "reshape False void result",
    "reference": "functions[570]",
    "error": true,
    "source": "//@version=6\nindicator(\"void result\")\nm = matrix.new<int>(3, 2, 0)\nresult = matrix.reshape(m, 2, 3)\nplot(1)\n"
  },
  {
    "id": "reshape True rows const int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape True rows input int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape True rows simple int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape True rows series int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=coordinate, columns=2)\nplot(1)\n"
  },
  {
    "id": "reshape True columns const int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape True columns input int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape True columns simple int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape True columns series int",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nm.reshape(rows=2, columns=coordinate)\nplot(1)\n"
  },
  {
    "id": "reshape True anymatrix bool",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<bool>(3, 2, false)\nm.reshape(2, 3)\nplot(1)\n"
  },
  {
    "id": "reshape True anymatrix string",
    "reference": "methods[151]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<string>(3, 2, \"value\")\nm.reshape(2, 3)\nplot(1)\n"
  },
  {
    "id": "reshape True void result",
    "reference": "methods[151]",
    "error": true,
    "source": "//@version=6\nindicator(\"void result\")\nm = matrix.new<int>(3, 2, 0)\nresult = m.reshape(2, 3)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row1 const int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row1 input int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row1 simple int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row1 series int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row2 const int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row2 input int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row2 simple int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows False row2 series int",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nmatrix.swap_rows(id=m, row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows False anymatrix bool",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<bool>(3, 2, false)\nmatrix.swap_rows(m, 0, 2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False anymatrix string",
    "reference": "functions[584]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<string>(3, 2, \"value\")\nmatrix.swap_rows(m, 0, 2)\nplot(1)\n"
  },
  {
    "id": "swap_rows False void result",
    "reference": "functions[584]",
    "error": true,
    "source": "//@version=6\nindicator(\"void result\")\nm = matrix.new<int>(3, 2, 0)\nresult = matrix.swap_rows(m, 0, 2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row1 const int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row1 input int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row1 simple int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row1 series int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=coordinate, row2=2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row2 const int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nconst int coordinate = 2\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row2 input int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\ninput int coordinate = input.int(2)\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row2 simple int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nsimple int coordinate = timeframe.multiplier\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows True row2 series int",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"geometry qualifier\")\nseries int coordinate = bar_index * 0 + 2\nm = matrix.new<int>(3, 2, 0)\nm.swap_rows(row1=2, row2=coordinate)\nplot(1)\n"
  },
  {
    "id": "swap_rows True anymatrix bool",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<bool>(3, 2, false)\nm.swap_rows(0, 2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True anymatrix string",
    "reference": "methods[165]",
    "error": false,
    "source": "//@version=6\nindicator(\"any matrix\")\nm = matrix.new<string>(3, 2, \"value\")\nm.swap_rows(0, 2)\nplot(1)\n"
  },
  {
    "id": "swap_rows True void result",
    "reference": "methods[165]",
    "error": true,
    "source": "//@version=6\nindicator(\"void result\")\nm = matrix.new<int>(3, 2, 0)\nresult = m.swap_rows(0, 2)\nplot(1)\n"
  }
];

describe('collection29 integer qualifiers, any matrix and void contracts', () => {
  for (const entry of cases) {
    it(`${entry.id}: ${entry.reference}`, () => {
      const errors = checkProgram(parse(entry.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors.length > 0).toBe(entry.error);
    });
  }
});
