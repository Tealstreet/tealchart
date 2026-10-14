import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 8 }, (_, index) => ({ time: 1_700_000_000_000 + index * 60_000, open: 40, high: 43, low: 39, close: 41, volume: 100 }));
function values(source: string) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.unsupported).toEqual([]);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result.plots.map(p => p.values);
}

const repros = [
  {
    "id": "drawing-namespace-5",
    "original": "//@version=5\nindicator(\"rename\")\nhandle = box.new(bar_index, high, bar_index+1, low)\nother = line.new(bar_index, low, bar_index+1, high)\nplot(close, \"value\")\n",
    "renamed": "//@version=5\nindicator(\"rename\")\nline = box.new(bar_index, high, bar_index+1, low)\nother = line.new(bar_index, low, bar_index+1, high)\nplot(close, \"value\")\n"
  },
  {
    "id": "drawing-namespace-6",
    "original": "//@version=6\nindicator(\"rename\")\nhandle = box.new(bar_index, high, bar_index+1, low)\nother = line.new(bar_index, low, bar_index+1, high)\nplot(close, \"value\")\n",
    "renamed": "//@version=6\nindicator(\"rename\")\nline = box.new(bar_index, high, bar_index+1, low)\nother = line.new(bar_index, low, bar_index+1, high)\nplot(close, \"value\")\n"
  },
  {
    "id": "collection-namespace-5",
    "original": "//@version=5\nindicator(\"rename\")\nvalues = array.new<float>(2, 3.0)\nm = matrix.new<float>(1, 1, 4.0)\nplot(matrix.get(m, 0, 0), \"value\")\n",
    "renamed": "//@version=5\nindicator(\"rename\")\nmatrix = array.new<float>(2, 3.0)\nm = matrix.new<float>(1, 1, 4.0)\nplot(matrix.get(m, 0, 0), \"value\")\n"
  },
  {
    "id": "collection-namespace-6",
    "original": "//@version=6\nindicator(\"rename\")\nvalues = array.new<float>(2, 3.0)\nm = matrix.new<float>(1, 1, 4.0)\nplot(matrix.get(m, 0, 0), \"value\")\n",
    "renamed": "//@version=6\nindicator(\"rename\")\nmatrix = array.new<float>(2, 3.0)\nm = matrix.new<float>(1, 1, 4.0)\nplot(matrix.get(m, 0, 0), \"value\")\n"
  },
  {
    "id": "ta-collection-method-5",
    "original": "//@version=5\nindicator(\"rename\")\nvalues = array.new<float>(2, na)\nresult = values.standardize()\nplot(close, \"value\")\n",
    "renamed": "//@version=5\nindicator(\"rename\")\nta = array.new<float>(2, na)\nresult = ta.standardize()\nplot(close, \"value\")\n"
  },
  {
    "id": "ta-collection-method-6",
    "original": "//@version=6\nindicator(\"rename\")\nvalues = array.new<float>(2, na)\nresult = values.standardize()\nplot(close, \"value\")\n",
    "renamed": "//@version=6\nindicator(\"rename\")\nta = array.new<float>(2, na)\nresult = ta.standardize()\nplot(close, \"value\")\n"
  }
];
// Authority: Pine variable declarations, Shadowing; non-UDT names preserve namespaces.
const namespaceBodies: Record<string, string> = {
  array: 'array.size(array.from(1, 2, 3))',
  map: 'map.get(makeMap(), "key")',
  matrix: 'matrix.get(matrix.new<float>(1, 1, 41.0), 0, 0)',
  line: 'line.get_y1(line.new(bar_index, 41.0, bar_index + 1, 42.0))',
  box: 'box.get_top(box.new(bar_index, 41.0, bar_index + 1, 39.0))',
  label: 'label.get_y(label.new(bar_index, 41.0))',
  table: 'table.new(position.top_right, 1, 1)\n    41',
  linefill: 'line.get_y1(linefill.get_line1(linefill.new(line.new(bar_index, 41.0, bar_index + 1, 42.0), line.new(bar_index, 39.0, bar_index + 1, 40.0), color.red)))',
  polyline: 'polyline.new(array.from(chart.point.from_index(bar_index, 41.0), chart.point.from_index(bar_index + 1, 42.0)))\n    41',
  ta: 'ta.sma(close, 1)',
  math: 'math.abs(-41)',
  str: 'str.length("abcd")',
  color: 'color.r(color.rgb(41, 0, 0))',
};
function namespaceSource(version: number, namespace: string, name: string, kind: string, form: string) {
  const init = kind === 'array<float>' ? 'array.from(1.0, 2.0, 3.0)' : 'box.new(bar_index, 43.0, bar_index + 1, 39.0)';
  const body = namespaceBodies[namespace];
  const helpers = namespace === 'map' ? 'makeMap() =>\n    result = map.new<string, float>()\n    map.put(result, "key", 41.0)\n    result\n' : '';
  const value = form === 'local'
    ? `${name} = ${init}
read() =>
    ${body}
plot(read(), "Value")`
    : `read(${form === 'typed' ? `${kind} ` : ''}${name}) =>
    ${body}
plot(read(${init}), "Value")`;
  return `//@version=${version}
indicator("Namespace collision")
${helpers}${value}`;
}
describe('non-UDT namespace collisions', () => {
  for (const version of [5, 6]) for (const namespace of ['ta', 'math']) {
    it(`v${version} ${namespace} rejects a concrete non-collection receiver`, () => {
      const ast = parse(`//@version=${version}
indicator("Invalid receiver")
read(${namespace}) =>
    ${namespace}.standardize()
plot(read(41))`);
      expect(checkProgram(ast).diagnostics.some(d => d.severity === 'error' && d.code === 'unknown-function')).toBe(true);
    });
  }
  for (const repro of repros) it(repro.id, () => expect(values(repro.renamed)).toEqual(values(repro.original)));
  for (const version of [5, 6]) for (const namespace of Object.keys(namespaceBodies)) {
    for (const kind of ['array<float>', 'box']) for (const form of ['local', 'typed', 'inferred']) {
      it(`v${version} ${namespace} namespace with ${form} ${kind}`, () => {
        const original = namespaceSource(version, namespace, 'fresh', kind, form);
        const renamed = namespaceSource(version, namespace, namespace, kind, form);
        expect(values(renamed)).toEqual(values(original));
        const expected = namespace === 'array' ? 3 : namespace === 'str' ? 4 : 41;
        expect(values(renamed)).toEqual([bars.map(() => expected)]);
      });
    }
    for (const form of ['local', 'typed', 'inferred']) {
      it(`v${version} ${namespace} drawing receiver ${form}`, () => {
        const source = (name: string) => {
          const init = 'box.new(bar_index, 41.0, bar_index + 1, 39.0)';
          const code = form === 'local'
            ? `${name} = ${init}
read() =>
    ${name}.get_top()
plot(read(), "Value")`
            : `read(${form === 'typed' ? 'box ' : ''}${name}) =>
    ${name}.get_top()
plot(read(${init}), "Value")`;
          return `//@version=${version}
indicator("Drawing receiver collision")
${code}`;
        };
        const baseline = values(source('fresh'));
        expect(baseline).toEqual([bars.map(() => 41)]);
        if (namespace === 'box' && form !== 'local') {
          const observationPath = form === 'typed'
            ? `v62/captures/v62/ns-param-naming-box-handle-builtin-dot-v${version}-natural-v61-v1`
            : `v74/captures/v74/inferred-box-parameter-box-v${version}-v1`;
          const observation = JSON.parse(readFileSync(new URL(
            `../../../oracle-probes/${observationPath}/attempt-v1/observation-v3.json`,
            import.meta.url,
          ), 'utf8')) as { markers: { severity: number; message: string; startLineNumber: number; startColumn: number }[] };
          const marker = observation.markers.find((value) => value.severity === 8)!;
          expect(marker).toBeDefined();
          expect(checkProgram(parse(source(namespace))).diagnostics.filter((value) => value.severity === 'error')).toEqual([
            expect.objectContaining({ code: 'argument-count', message: marker.message, line: marker.startLineNumber, column: marker.startColumn }),
          ]);
          return;
        }
        expect(values(source(namespace))).toEqual(baseline);
        expect(values(source(namespace))).toEqual([bars.map(() => 41)]);
      });
    }
    if (namespace !== 'array') for (const form of ['local', 'typed', 'inferred']) {
      it(`v${version} ${namespace} array receiver ${form}`, () => {
        const source = (name: string) => {
          const body = `${name}.standardize()
    array.size(${name})`;
          const code = form === 'local'
            ? `${name} = array.from(1.0, 2.0, 3.0)
read() =>
    ${body}
plot(read(), "Value")`
            : `read(${form === 'typed' ? 'array<float> ' : ''}${name}) =>
    ${body}
plot(read(array.from(1.0, 2.0, 3.0)), "Value")`;
          return `//@version=${version}
indicator("Receiver collision")
${code}`;
        };
        const baseline = values(source('fresh'));
        expect(values(source(namespace))).toEqual(baseline);
        expect(values(source(namespace))).toEqual([bars.map(() => 3)]);
      });
    }
  }
});

describe.each([5, 6])('namespace identity before emission scopes v%s', version => {
  it('preserves builtin call-result history', () => {
    expect(values(`//@version=${version}\nindicator("history")\nplot(math.abs(close)[1], "value")`))
      .toEqual([[null, 41, 41, 41, 41, 41, 41, 41]]);
  });
});
