import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-box-eq-v2.pine/attempt-1",
    "path": "v4/drawing-box-eq-v2.pine",
    "sha256": "54da4ed5444cc206b2d76d4e7a9b7f5b8c4e5db275840cb43d4ee0172d683252",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-box-ne-v2.pine/attempt-1",
    "path": "v4/drawing-box-ne-v2.pine",
    "sha256": "e55abe016c37ba07d6a80e65800f5e02244cc7992f269ab0636e7ff313e68297",
    "native": {
      "text": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series box\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-chart-point-eq-v2.pine/attempt-1",
    "path": "v4/drawing-chart-point-eq-v2.pine",
    "sha256": "122b8fa7d9a976210dbce9a45ca18c6312b1abbb222e0aebae61c1d554883eb3",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-chart-point-ne-v2.pine/attempt-1",
    "path": "v4/drawing-chart-point-ne-v2.pine",
    "sha256": "4e3f806d4b9c6da217966e1467ed6912a94e4b3325b5daf57577ab0617793cfa",
    "native": {
      "text": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"chart.point\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-polyline-eq-v2.pine/attempt-1",
    "path": "v4/drawing-polyline-eq-v2.pine",
    "sha256": "060f2380d57b54ea8d2ae43bd05d5f1205049e79f03dc73ed0b6fa9b8de35aa7",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-polyline-ne-v2.pine/attempt-1",
    "path": "v4/drawing-polyline-ne-v2.pine",
    "sha256": "e2a244f605c99e77deea62770e15cff9e71a105b3af83b70733666325a367b0c",
    "native": {
      "text": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series polyline\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-table-eq-v2.pine/attempt-1",
    "path": "v4/drawing-table-eq-v2.pine",
    "sha256": "3139d9e4ed7f874fb8f920a0fc983044702b66fe00fe794ef5d0fcae24d96351",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#drawing-table-ne-v2.pine/attempt-1",
    "path": "v4/drawing-table-ne-v2.pine",
    "sha256": "0e7d85757c0939956e1dc76edbccdda68dda9eb16510bd7a41c9f50051052dd7",
    "native": {
      "text": "Cannot call \"operator !=\" with argument \"expr0\"=\"a\". An argument of \"series table\" type was used but a \"simple string\"  is expected.",
      "line": 6,
      "column": 7,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v2/captures/v2/outcomes-v2.json#coverage-drawing-2-v1.pine/attempt-1",
    "path": "v2/coverage-drawing-2-v1.pine",
    "sha256": "c201da90e7c04bd1c0cb70ccb3656a3c1ab5056c304255f7892d5869cc69d28f",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"call \"array.get\" (series linefill)\". An argument of \"series linefill\" type was used but a \"simple string\"  is expected.",
      "line": 78,
      "column": 37,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v2/captures/v2/outcomes-v2.json#coverage-drawing-2-v1.pine/attempt-2",
    "path": "v2/coverage-drawing-2-v1.pine",
    "sha256": "c201da90e7c04bd1c0cb70ccb3656a3c1ab5056c304255f7892d5869cc69d28f",
    "native": {
      "text": "Cannot call \"operator ==\" with argument \"expr0\"=\"call \"array.get\" (series linefill)\". An argument of \"series linefill\" type was used but a \"simple string\"  is expected.",
      "line": 78,
      "column": 37,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-1",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-2",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-3",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-4",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-5",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-6",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#trace-705-chart-fg-solid-background-v1.pine/attempt-7",
    "path": "v4/trace-705-chart-fg-solid-background-v1.pine",
    "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
    "native": {
      "text": "Cannot call \"str.tostring\" with argument \"value\"=\"chart.bg_color\". An argument of \"input color\" type was used but a \"series float\"  is expected.",
      "line": 6,
      "column": 43,
      "code": "CE10123",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/root2-root1-float-only-int-widening-preservation-control-v58-v1/root1-float-only-int-widening/attempt-v1",
    "path": "v58/captures/v58/consumers/root2-root1-float-only-int-widening-preservation-control-v58-v1/root1-float-only-int-widening/attempt-v1/executed-v1.pine",
    "sha256": "c3244e77b37327d400b00720544ad23747ad5ab05bf718f85a9a315a5785f689",
    "native": {
      "text": "Could not find method or method reference 'integer.pick'",
      "line": 4,
      "column": 12,
      "code": "CE10271",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/root2-widening-5-receiver-v58-v1/widening-5/attempt-v1",
    "path": "v58/captures/v58/consumers/root2-widening-5-receiver-v58-v1/widening-5/attempt-v1/executed-v1.pine",
    "sha256": "36961026314836630b30a97ac587925846f9128c495f5d6cf0f8cd4b51625889",
    "native": {
      "text": "Could not find method or method reference 'pick' for 'integer'",
      "line": 4,
      "column": 12,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/root2-widening-6-receiver-v58-v1/widening-6/attempt-v1",
    "path": "v58/captures/v58/consumers/root2-widening-6-receiver-v58-v1/widening-6/attempt-v1/executed-v1.pine",
    "sha256": "25581e65f002708df19543dac345e05aecbd4d2a9c82a3b7ed7b672f908cd2c0",
    "native": {
      "text": "Could not find method or method reference 'integer.pick'",
      "line": 4,
      "column": 12,
      "code": "CE10271",
      "class": "error"
    }
  }
];
const libraryFixtures = [
  ['sours-lat/R2Ns34c7d0619d7b/1', 'v58/root2-library-34c7d0619d7b-v58-v1.pine', '877fd228f5482deb2b307fb10f5335fd4d45079f810fc8c6e5116df51efa0441'],
  ['sours-lat/R2Ns7300f5f6f0f4/1', 'v58/root2-library-7300f5f6f0f4-v58-v1.pine', '65a58a5a33bcd9643df9dec5185d570f441cb6b13ff6bdfc8a0993d5130d3531'],
  ['sours-lat/R2Ns97602e8de8f2/1', 'v58/root2-library-97602e8de8f2-v58-v1.pine', 'b2ff6ea15c6d35f675d7273b27c71c4126f1308179d248ae7428692c67908bb3'],
];
const libraries = new Map(libraryFixtures.map(([id, path]) => [id, parse(readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8'))]));

describe('captured census operand diagnostics', () => {
  it.each(cases)('$attempt', ({ path, sha256, native }) => {
    for (const [, libraryPath, librarySha256] of libraryFixtures) {
      const librarySource = readFileSync(new URL(`../../oracle-probes/${libraryPath}`, import.meta.url), 'utf8');
      expect(createHash('sha256').update(librarySource).digest('hex')).toBe(librarySha256);
    }
    const source = readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
    const errors = checkProgram(parse(source), { libraries }).diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatchObject({ message: native.text, line: native.line, column: native.column });
    if (native.code) expect(errors[0].code).toBe(native.code);
  });
});
