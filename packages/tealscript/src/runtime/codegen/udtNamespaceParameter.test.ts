import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const cases = [
  {
    "name": "v5 array array",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder array) =>\n    array.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 array holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 map map",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder map) =>\n    map.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 map holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 matrix matrix",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder matrix) =>\n    matrix.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 matrix holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 line line",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder line) =>\n    line.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 line holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 box box",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder box) =>\n    box.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 box holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 label label",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder label) =>\n    label.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 label holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 table table",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder table) =>\n    table.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 table holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 linefill linefill",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder linefill) =>\n    linefill.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 linefill holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 polyline polyline",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder polyline) =>\n    polyline.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v5 polyline holder",
    "source": "//@version=5\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 array array",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder array) =>\n    array.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 array holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 map map",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder map) =>\n    map.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 map holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 matrix matrix",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder matrix) =>\n    matrix.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 matrix holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 line line",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder line) =>\n    line.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 line holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 box box",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder box) =>\n    box.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 box holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 label label",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder label) =>\n    label.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 label holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 table table",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder table) =>\n    table.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 table holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 linefill linefill",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder linefill) =>\n    linefill.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 linefill holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 polyline polyline",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder polyline) =>\n    polyline.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "name": "v6 polyline holder",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  }
];
const bars = [0, 1, 2].map((index) => ({ time: 1_700_000_000_000 + index * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

describe('UDT parameters named after namespaces retain custom methods', () => {
  it.each(cases)('$name', ({ source, expected }) => {
    const program = parse(source);
    const receiver = /f\(Holder (box|label|line|linefill|table)\)/.exec(source)?.[1];
    if (receiver) {
      const version = /@version=([56])/.exec(source)![1];
      const root = new URL(`../../../oracle-probes/v73/captures/v73/ns-param-set-top-${receiver}-v${version}-v1/attempt-v1/`, import.meta.url);
      const capturedSource = readFileSync(new URL('executed-v1.pine', root), 'utf8');
      const observation = JSON.parse(readFileSync(new URL('observation-v3.json', root), 'utf8')) as {
        status: string;
        executedSha256: string;
        markers: { severity: number; message: string; startLineNumber: number; startColumn: number }[];
      };
      expect(`${source}\n`).toBe(capturedSource);
      expect(createHash('sha256').update(capturedSource).digest('hex')).toBe(observation.executedSha256);
      expect(observation.status).toBe('COMPILE-ERROR');
      const marker = observation.markers.find((value) => value.severity === 8)!;
      expect(marker).toBeDefined();
      expect(checkProgram(program).diagnostics.filter((value) => value.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'namespace-method-name', message: marker.message, line: marker.startLineNumber, column: marker.startColumn }),
      ]);
      return;
    }
    expect(checkProgram(program).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const compiled = tryCompile(program);
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    const result = executeCompiled(compiled, bars);
    expect(result!.errors).toEqual([]);
    expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    expect(result!.plots.map((plot) => plot.values)).toEqual([[expected, expected, expected]]);
  });
});

const refusals = [
  {
    "name": "v5 array obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder array) =>\n    unused = array.new<int>()\n    array.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 map obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder map) =>\n    unused = map.new<string,int>()\n    map.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 matrix obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder matrix) =>\n    unused = matrix.new<int>(1,1,0)\n    matrix.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 line obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder line) =>\n    unused = line.new(0,1,1,2)\n    line.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 box obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder box) =>\n    unused = box.new(0,2,1,1)\n    box.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 label obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder label) =>\n    unused = label.new(0,1)\n    label.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 table obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder table) =>\n    unused = table.new(position.top_right,1,1)\n    table.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 linefill obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder linefill) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    linefill.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v5 polyline obscured namespace",
    "source": "//@version=5\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder polyline) =>\n    unused = polyline.new(array.new<chart.point>())\n    polyline.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 array obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder array) =>\n    unused = array.new<int>()\n    array.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 map obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder map) =>\n    unused = map.new<string,int>()\n    map.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 matrix obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder matrix) =>\n    unused = matrix.new<int>(1,1,0)\n    matrix.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 line obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder line) =>\n    unused = line.new(0,1,1,2)\n    line.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 box obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder box) =>\n    unused = box.new(0,2,1,1)\n    box.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 label obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder label) =>\n    unused = label.new(0,1)\n    label.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 table obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder table) =>\n    unused = table.new(position.top_right,1,1)\n    table.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 linefill obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder linefill) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    linefill.value\nplot(f(Holder.new(7)))"
  },
  {
    "name": "v6 polyline obscured namespace",
    "source": "//@version=6\nindicator(\"obscured namespace\")\ntype Holder\n    int value\nf(Holder polyline) =>\n    unused = polyline.new(array.new<chart.point>())\n    polyline.value\nplot(f(Holder.new(7)))"
  }
];

describe('UDT parameter names retain builtin namespace fallback', () => {
  it.each(refusals)('$name', ({ source }) => {
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars)!;
    expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    expect(result.plots.map(plot => plot.values)).toEqual([[7, 7, 7]]);
  });
});


describe('v4 namespace set_top is masked by native UDT declaration refusal', () => {
  it.each([
    {
      name: 'box',
      attempt: 'v75/captures/v75/ns-param-set-top-box-v4-natural-v1/attempt-v1',
    },
    {
      name: 'label',
      attempt: 'v75/captures/v75/ns-param-set-top-label-v4-natural-v1/attempt-v1',
    },
    {
      name: 'line',
      attempt: 'v75/captures/v75/ns-param-set-top-line-v4-natural-v1/attempt-v1',
    },
    {
      name: 'linefill',
      attempt: 'v75/captures/v75/ns-param-set-top-linefill-v4-natural-v1/attempt-v1',
    },
    {
      name: 'table',
      attempt: 'v75/captures/v75/ns-param-set-top-table-v4-natural-v1/attempt-v1',
    },
  ])('$name parameter matches the v75 declaration refusal', ({ name, attempt }) => {
    // The v4 type refusal makes namespace set_top behavior CONTEXT-UNMET.
    const source = `//@version=4
indicator("Standalone boundary")
type Holder
    int value
method set_top(Holder self, int x)=>self.value+x
f(Holder ${name})=>${name}.set_top(13)
plot(f(Holder.new(7)))`;
    const program = parse(source);
    expect(
      checkProgram(program)
        .diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
        .map(({ code, message, line, column }) => ({ code, message, line, column })),
      attempt,
    ).toEqual([
      {
        code: 'version-mismatch',
        message: "'type' is not a valid type keyword in variable declaration",
        line: 3,
        column: 1,
      },
    ]);
  });
});
