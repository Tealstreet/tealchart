import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';
import { createSyntheticBars, SyntheticExternalCorpusRequestDatafeed } from '../../../scripts/run-external-pine-corpus';
const bars = createSyntheticBars(32);
function values(source: string) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.unsupported).toEqual([]);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars) })!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result.plots.map(p => p.values);
}
const pairs = [
  {
    "id": "5-array-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(array) =>\n    array.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-array-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for array in array.from(array.from(4.0,7.0))\n        result := array.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-map-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(map) =>\n    map.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-map-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for map in array.from(array.from(4.0,7.0))\n        result := map.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-matrix-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(matrix) =>\n    matrix.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-matrix-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for matrix in array.from(array.from(4.0,7.0))\n        result := matrix.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-line-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(line) =>\n    line.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-line-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for line in array.from(array.from(4.0,7.0))\n        result := line.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-box-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(box) =>\n    box.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-box-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for box in array.from(array.from(4.0,7.0))\n        result := box.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-label-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(label) =>\n    label.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-label-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for label in array.from(array.from(4.0,7.0))\n        result := label.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-table-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(table) =>\n    table.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-table-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for table in array.from(array.from(4.0,7.0))\n        result := table.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-linefill-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(linefill) =>\n    linefill.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-linefill-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for linefill in array.from(array.from(4.0,7.0))\n        result := linefill.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-polyline-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(polyline) =>\n    polyline.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-polyline-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for polyline in array.from(array.from(4.0,7.0))\n        result := polyline.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-ta-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(ta) =>\n    ta.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-ta-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for ta in array.from(array.from(4.0,7.0))\n        result := ta.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-math-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(math) =>\n    math.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-math-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for math in array.from(array.from(4.0,7.0))\n        result := math.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-str-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(str) =>\n    str.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-str-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for str in array.from(array.from(4.0,7.0))\n        result := str.get(1)\n    result\nplot(read())"
  },
  {
    "id": "5-color-parameter-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=5\nindicator(\"own\")\nread(color) =>\n    color.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "5-color-loop-receiver",
    "original": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for fresh in array.from(array.from(4.0,7.0))\n        result := fresh.get(1)\n    result\nplot(read())",
    "renamed": "//@version=5\nindicator(\"own\")\nread() =>\n    result=0.0\n    for color in array.from(array.from(4.0,7.0))\n        result := color.get(1)\n    result\nplot(read())"
  },
  {
    "id": "6-array-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(array) =>\n    array.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-map-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(map) =>\n    map.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-matrix-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(matrix) =>\n    matrix.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-line-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(line) =>\n    line.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-box-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(box) =>\n    box.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-label-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(label) =>\n    label.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-table-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(table) =>\n    table.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-linefill-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(linefill) =>\n    linefill.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-polyline-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(polyline) =>\n    polyline.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-ta-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(ta) =>\n    ta.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-math-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(math) =>\n    math.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-str-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(str) =>\n    str.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "6-color-parameter-receiver",
    "original": "//@version=6\nindicator(\"own\")\nread(fresh) =>\n    fresh.get(1)\nplot(read(array.from(4.0,7.0)))",
    "renamed": "//@version=6\nindicator(\"own\")\nread(color) =>\n    color.get(1)\nplot(read(array.from(4.0,7.0)))"
  },
  {
    "id": "lower-5-sum-false",
    "original": "//@version=5\nindicator(\"lower\")\nfresh=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(fresh.sum())",
    "renamed": "//@version=5\nindicator(\"lower\")\nmatrix=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(matrix.sum())"
  },
  {
    "id": "lower-5-sum-true",
    "original": "//@version=5\nindicator(\"lower\")\n[fresh,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(fresh.sum())",
    "renamed": "//@version=5\nindicator(\"lower\")\n[matrix,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(matrix.sum())"
  },
  {
    "id": "lower-5-max-false",
    "original": "//@version=5\nindicator(\"lower\")\nfresh=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(fresh.max())",
    "renamed": "//@version=5\nindicator(\"lower\")\nmatrix=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(matrix.max())"
  },
  {
    "id": "lower-5-max-true",
    "original": "//@version=5\nindicator(\"lower\")\n[fresh,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(fresh.max())",
    "renamed": "//@version=5\nindicator(\"lower\")\n[matrix,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(matrix.max())"
  },
  {
    "id": "lower-6-sum-false",
    "original": "//@version=6\nindicator(\"lower\")\nfresh=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(fresh.sum())",
    "renamed": "//@version=6\nindicator(\"lower\")\nmatrix=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(matrix.sum())"
  },
  {
    "id": "lower-6-sum-true",
    "original": "//@version=6\nindicator(\"lower\")\n[fresh,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(fresh.sum())",
    "renamed": "//@version=6\nindicator(\"lower\")\n[matrix,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(matrix.sum())"
  },
  {
    "id": "lower-6-max-false",
    "original": "//@version=6\nindicator(\"lower\")\nfresh=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(fresh.max())",
    "renamed": "//@version=6\nindicator(\"lower\")\nmatrix=request.security_lower_tf(syminfo.tickerid,\"1\",volume)\nplot(matrix.max())"
  },
  {
    "id": "lower-6-max-true",
    "original": "//@version=6\nindicator(\"lower\")\n[fresh,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(fresh.max())",
    "renamed": "//@version=6\nindicator(\"lower\")\n[matrix,other]=request.security_lower_tf(syminfo.tickerid,\"1\",[volume,volume])\nplot(matrix.max())"
  }
];
const namespaces = ['array', 'map', 'matrix', 'line', 'box', 'label', 'table', 'linefill', 'polyline', 'ta', 'math', 'str', 'color'];
for (const version of [5, 6]) for (const namespace of namespaces) for (const method of ['sum', 'max']) for (const tuple of [false, true]) {
  if (namespace === 'matrix') continue;
  const make = (name: string) => `//@version=${version}\nindicator("lower")\n${tuple ? `[${name},other]` : name}=request.security_lower_tf(syminfo.tickerid,"1",${tuple ? '[volume,volume]' : 'volume'})\nplot(${name}.${method}())`;
  pairs.push({ id: `lower-${version}-${namespace}-${method}-${tuple}`, original: make('fresh'), renamed: make(namespace) });
}
describe('non-UDT namespace receiver metadata', () => {
  it.each(pairs)('$id matches its fresh-name control', ({ original, renamed, id }) => {
    const control = values(original);
    expect(control[0].some(x => x !== null)).toBe(true);
    if (!id.startsWith('lower-')) expect(control).toEqual([Array(32).fill(7)]);
    expect(values(renamed)).toEqual(control);
  });
});

describe('concrete receiver refusals remain visible', () => {
  it.each([5, 6])('invalid scalar namespace receiver v%s', version => {
    for (const name of ['array', 'line', 'ta']) {
      const source = `//@version=${version}\nindicator("invalid")\nread(${name}) =>\n    ${name}.get(1)\nplot(read(41))`;
      expect(checkProgram(parse(source)).diagnostics.some(d => d.severity === 'error')).toBe(true);
    }
  });
  it('keeps the v6 nested-collection refusal', () => {
    const source = `//@version=6\nindicator("invalid")\nfor line in array.from(array.from(4.0,7.0))\n    line.get(1)\nplot(close)`;
    expect(checkProgram(parse(source)).diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
