import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixtures = new URL('../../oracle-probes/', import.meta.url);

it("matches both operands: v2/captures/v2/outcomes-v2.json#coverage-drawing-2-v1.pine/attempt-2", () => {
  const source = readFileSync(new URL("v2/coverage-drawing-2-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("c201da90e7c04bd1c0cb70ccb3656a3c1ab5056c304255f7892d5869cc69d28f");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"call \"array.get\" (series linefill)\". An argument of \"series linefill\" type was used but a \"simple string\"  is expected.",
    "line": 78,
    "column": 37,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"other\". An argument of \"series linefill\" type was used but a \"simple string\"  is expected.",
    "line": 78,
    "column": 94,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-box-eq-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-box-eq-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("54da4ed5444cc206b2d76d4e7a9b7f5b8c4e5db275840cb43d4ee0172d683252");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"b\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"other\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-box-ne-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-box-ne-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("e55abe016c37ba07d6a80e65800f5e02244cc7992f269ab0636e7ff313e68297");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"b\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"other\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-chart-point-eq-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-chart-point-eq-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("122b8fa7d9a976210dbce9a45ca18c6312b1abbb222e0aebae61c1d554883eb3");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"b\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"other\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-chart-point-ne-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-chart-point-ne-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("4e3f806d4b9c6da217966e1467ed6912a94e4b3325b5daf57577ab0617793cfa");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"b\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"other\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-polyline-eq-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-polyline-eq-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("060f2380d57b54ea8d2ae43bd05d5f1205049e79f03dc73ed0b6fa9b8de35aa7");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"b\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"other\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-polyline-ne-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-polyline-ne-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("e2a244f605c99e77deea62770e15cff9e71a105b3af83b70733666325a367b0c");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"b\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"other\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-table-eq-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-table-eq-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("3139d9e4ed7f874fb8f920a0fc983044702b66fe00fe794ef5d0fcae24d96351");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"b\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator ==\" with argument \"expr1\"=\"other\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

it("matches both operands: v4/captures/v4/outcomes-v4.json#drawing-table-ne-v2.pine/attempt-1", () => {
  const source = readFileSync(new URL("v4/drawing-table-ne-v2.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("0e7d85757c0939956e1dc76edbccdda68dda9eb16510bd7a41c9f50051052dd7");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode, code }) => ({ message, line, column, severity, nativeCode: nativeCode ?? code }))).toEqual([
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 7,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"b\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 12,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 30,
    "severity": "error",
    "nativeCode": "CE10123"
  },
  {
    "message": "Cannot call \"operator !=\" with argument \"expr1\"=\"other\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
    "line": 6,
    "column": 35,
    "severity": "error",
    "nativeCode": "CE10123"
  }
]);
});

for (const version of [5, 6]) {
  for (const operator of ['==', '!=']) {
    it(`preserves scalar equality v${version} ${operator}`, () => {
      const source = `//@version=${version}
indicator("scalar equality")
a = close
b = open
plot(a ${operator} b ? 1 : 0)`;
      expect(checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    });
  }
}
