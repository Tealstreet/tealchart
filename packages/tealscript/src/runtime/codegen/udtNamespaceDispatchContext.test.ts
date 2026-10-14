import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

// Native v59/v63/v69/v72 captured names: v5/v6 call-site shadowing refusals.
function capturedTaShadow(id: string, source: string) {
  if (!/^v[56]-(sma|ema|crossover|rsi|stdev|valuewhen|wma|variance)-ta(?:-|$)/.test(id)) return false;
  expect(checkProgram(parse(source)).diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ severity: 'error', code: 'builtin-shadowing' }),
  ]));
  return true;
}

const bars = Array.from({ length: 31 }, (_, index) => ({ time: 1_700_000_000_000 + index * 60_000, open: 15 + index % 7, high: 32 + index % 11, low: 3 + index % 5, close: 10 + (index * 7) % 23, volume: 100 + index * 17 }));

function values(source: string) {
  const program = parse(source);
  expect(checkProgram(program).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(program);
  expect(compiled.success).toBe(true);
  expect(compiled.unsupported).toEqual([]);
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result.plots.map(plot => plot.values);
}

function capturedBuiltinValues(id: string, source: string): boolean {
  const match = /^v[56]-(change|highest)-ta(?:-|$)/.exec(id);
  if (!match) return false;
  const method = match[1];
  const windowValue = (index: number, length: number) => method === 'change'
    ? (index === 0 ? null : bars[index].close - bars[index - 1].close)
    : (index < length - 1 ? null : Math.max(...bars.slice(index - length + 1, index + 1).map(bar => bar.high)));
  let expected: (number | null)[][];
  if (id.endsWith('-state')) {
    expected = [1, 2].map(scale => bars.map((bar, index) => method === 'change' ? (index === 0 ? null : scale * (bar.close - bars[index - 1].close)) : windowValue(index, scale * bar.close)));
  } else if (id.endsWith('-mixedTrue')) {
    expected = [bars.map((bar, index) => windowValue(index, bar.close)), bars.map((bar, index) => method === 'change'
      ? (index === 0 ? null : bar.close - bars[index - 1].close)
      : (index < 2 ? null : Math.max(...bars.slice(index - 2, index + 1).map(row => row.high))))];
  } else {
    expected = [bars.map((_, index) => { const value = method === 'change' ? (index === 0 ? null : 0) : windowValue(index, 13); return value === null ? null : value * 2 + 1; })];
  }
  expect(values(source)).toEqual(expected);
  return true;
}

const cases = [
  {
    "id": "original-0",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder array) =>\n    array.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-1",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod push(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.push(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-2",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder map) =>\n    map.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-3",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod put(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.put(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-4",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder matrix) =>\n    matrix.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-5",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-6",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder line) =>\n    line.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-7",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-8",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder box) =>\n    box.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-9",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-10",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder label) =>\n    label.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-11",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-12",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder table) =>\n    table.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-13",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-14",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder linefill) =>\n    linefill.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-15",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-16",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder polyline) =>\n    polyline.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "original-17",
    "source": "//@version=6\nindicator(\"UDT collision\")\ntype Holder\n    int value\nmethod set_top(Holder self, int x) =>\n    self.value + x\nf(Holder holder) =>\n    holder.set_top(13)\nplot(f(Holder.new(7)))",
    "expected": 20
  },
  {
    "id": "v5-array-namespace-array",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder array) =>\n    unused = array.new<int>(2,3)\n    array.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "array",
    "family": "namespace",
    "name": "array",
    "version": 5
  },
  {
    "id": "v5-array-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = array.new<int>(2,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "array",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-box-namespace-box",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder box) =>\n    unused = box.new(0,2,1,1)\n    box.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "box",
    "family": "namespace",
    "name": "box",
    "version": 5
  },
  {
    "id": "v5-box-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = box.new(0,2,1,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "box",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-color-namespace-color",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder color) =>\n    unused = color.rgb(1,2,3)\n    color.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "color",
    "family": "namespace",
    "name": "color",
    "version": 5
  },
  {
    "id": "v5-color-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = color.rgb(1,2,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "color",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-label-namespace-label",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder label) =>\n    unused = label.new(0,1)\n    label.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "label",
    "family": "namespace",
    "name": "label",
    "version": 5
  },
  {
    "id": "v5-label-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = label.new(0,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "label",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-line-namespace-line",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder line) =>\n    unused = line.new(0,1,1,2)\n    line.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "line",
    "family": "namespace",
    "name": "line",
    "version": 5
  },
  {
    "id": "v5-line-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = line.new(0,1,1,2)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "line",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-linefill-namespace-linefill",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder linefill) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    linefill.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "linefill",
    "family": "namespace",
    "name": "linefill",
    "version": 5
  },
  {
    "id": "v5-linefill-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "linefill",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-map-namespace-map",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder map) =>\n    unused = map.new<string,int>()\n    map.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "map",
    "family": "namespace",
    "name": "map",
    "version": 5
  },
  {
    "id": "v5-map-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = map.new<string,int>()\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "map",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-math-namespace-math",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder math) =>\n    unused = math.abs(-3)\n    math.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "math",
    "family": "namespace",
    "name": "math",
    "version": 5
  },
  {
    "id": "v5-math-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = math.abs(-3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "math",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-matrix-namespace-matrix",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder matrix) =>\n    unused = matrix.new<int>(1,1,3)\n    matrix.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "matrix",
    "family": "namespace",
    "name": "matrix",
    "version": 5
  },
  {
    "id": "v5-matrix-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = matrix.new<int>(1,1,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "matrix",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-polyline-namespace-polyline",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder polyline) =>\n    unused = polyline.new(array.new<chart.point>())\n    polyline.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "polyline",
    "family": "namespace",
    "name": "polyline",
    "version": 5
  },
  {
    "id": "v5-polyline-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = polyline.new(array.new<chart.point>())\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "polyline",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-str-namespace-str",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder str) =>\n    unused = str.length(\"abc\")\n    str.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "str",
    "family": "namespace",
    "name": "str",
    "version": 5
  },
  {
    "id": "v5-str-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = str.length(\"abc\")\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "str",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v5-table-namespace-table",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder table) =>\n    unused = table.new(position.top_right,1,1)\n    table.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "table",
    "family": "namespace",
    "name": "table",
    "version": 5
  },
  {
    "id": "v5-table-namespace-holder",
    "source": "//@version=5\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = table.new(position.top_right,1,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "table",
    "family": "namespace",
    "name": "holder",
    "version": 5
  },
  {
    "id": "v6-array-namespace-array",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder array) =>\n    unused = array.new<int>(2,3)\n    array.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "array",
    "family": "namespace",
    "name": "array",
    "version": 6
  },
  {
    "id": "v6-array-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = array.new<int>(2,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "array",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-box-namespace-box",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder box) =>\n    unused = box.new(0,2,1,1)\n    box.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "box",
    "family": "namespace",
    "name": "box",
    "version": 6
  },
  {
    "id": "v6-box-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = box.new(0,2,1,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "box",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-color-namespace-color",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder color) =>\n    unused = color.rgb(1,2,3)\n    color.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "color",
    "family": "namespace",
    "name": "color",
    "version": 6
  },
  {
    "id": "v6-color-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = color.rgb(1,2,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "color",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-label-namespace-label",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder label) =>\n    unused = label.new(0,1)\n    label.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "label",
    "family": "namespace",
    "name": "label",
    "version": 6
  },
  {
    "id": "v6-label-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = label.new(0,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "label",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-line-namespace-line",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder line) =>\n    unused = line.new(0,1,1,2)\n    line.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "line",
    "family": "namespace",
    "name": "line",
    "version": 6
  },
  {
    "id": "v6-line-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = line.new(0,1,1,2)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "line",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-linefill-namespace-linefill",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder linefill) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    linefill.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "linefill",
    "family": "namespace",
    "name": "linefill",
    "version": 6
  },
  {
    "id": "v6-linefill-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = linefill.new(line.new(0,1,1,2),line.new(0,2,1,3),color.red)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "linefill",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-map-namespace-map",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder map) =>\n    unused = map.new<string,int>()\n    map.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "map",
    "family": "namespace",
    "name": "map",
    "version": 6
  },
  {
    "id": "v6-map-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = map.new<string,int>()\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "map",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-math-namespace-math",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder math) =>\n    unused = math.abs(-3)\n    math.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "math",
    "family": "namespace",
    "name": "math",
    "version": 6
  },
  {
    "id": "v6-math-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = math.abs(-3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "math",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-matrix-namespace-matrix",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder matrix) =>\n    unused = matrix.new<int>(1,1,3)\n    matrix.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "matrix",
    "family": "namespace",
    "name": "matrix",
    "version": 6
  },
  {
    "id": "v6-matrix-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = matrix.new<int>(1,1,3)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "matrix",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-polyline-namespace-polyline",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder polyline) =>\n    unused = polyline.new(array.new<chart.point>())\n    polyline.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "polyline",
    "family": "namespace",
    "name": "polyline",
    "version": 6
  },
  {
    "id": "v6-polyline-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = polyline.new(array.new<chart.point>())\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "polyline",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-str-namespace-str",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder str) =>\n    unused = str.length(\"abc\")\n    str.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "str",
    "family": "namespace",
    "name": "str",
    "version": 6
  },
  {
    "id": "v6-str-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = str.length(\"abc\")\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "str",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v6-table-namespace-table",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder table) =>\n    unused = table.new(position.top_right,1,1)\n    table.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "table",
    "family": "namespace",
    "name": "table",
    "version": 6
  },
  {
    "id": "v6-table-namespace-holder",
    "source": "//@version=6\nindicator(\"W0 paired\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int amount) =>\n    self.value + amount\nf(Holder holder) =>\n    unused = table.new(position.top_right,1,1)\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41,
    "namespace": "table",
    "family": "namespace",
    "name": "holder",
    "version": 6
  },
  {
    "id": "v5-sma-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-sma-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-ema-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-ema-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-change-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-change-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-w0Value-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v5-w0Value-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-sma-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-sma-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-ema-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-ema-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-change-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-change-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-w0Value-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "id": "v6-w0Value-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  }
];

describe('UDT methods and namespace fallback retain values', () => {
  it.each(cases)('$id', ({ id, source, expected }) => {
    const nativeRefusal = /^v([56])-(box|color|label|line|linefill|table)-namespace-\2$/.exec(id);
    const setTopRefusal = ['original-6', 'original-8', 'original-10', 'original-12', 'original-14'].includes(id);
    if (nativeRefusal || setTopRefusal) {
      const version = nativeRefusal?.[1] ?? '6';
      const name = nativeRefusal?.[2] ?? /f\(Holder (\w+)\)/.exec(source)![1];
      const round = setTopRefusal ? 'v73' : 'v59';
      const probe = setTopRefusal ? `ns-param-set-top-${name}-v${version}-v1` : `ns-param-naming-namespace-call-${name}-v${version}-v59-v1`;
      const root = new URL(`../../../oracle-probes/${round}/captures/${round}/${probe}/attempt-v1/`, import.meta.url);
      const capturedSource = readFileSync(new URL('executed-v1.pine', root), 'utf8');
      const observation = JSON.parse(readFileSync(new URL(setTopRefusal ? 'observation-v3.json' : 'observation-v4.json', root), 'utf8')) as {
        status: string;
        executedSha256: string;
        markers: { severity: number; message: string; startLineNumber: number; startColumn: number }[];
      };
      expect(setTopRefusal ? `${source}\n` : source).toBe(capturedSource);
      expect(createHash('sha256').update(capturedSource).digest('hex')).toBe(observation.executedSha256);
      expect(observation.status).toBe('COMPILE-ERROR');
      const marker = observation.markers.find((value) => value.severity === 8);
      expect(marker).toBeDefined();
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
        expect.objectContaining({
          code: 'namespace-method-name',
          message: marker!.message,
          line: marker!.startLineNumber,
          column: marker!.startColumn,
        }),
      ]);
      return;
    }
    if (capturedTaShadow(id, source) || capturedBuiltinValues(id, source)) return;
    expect(values(source)).toEqual([bars.map(() => expected)]);
  });
});

const stateCases = [
  {
    "id": "v5-sma-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.sma(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-sma-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.sma(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-ema-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.ema(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-ema-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.ema(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-rsi-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.rsi(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-rsi-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.rsi(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-change-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.change(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-change-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.change(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-crossover-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.crossover(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-crossover-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.crossover(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-highest-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.highest(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-highest-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.highest(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-valuewhen-ta-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.valuewhen(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v5-valuewhen-holder-state",
    "source": "//@version=5\nindicator(\"state control\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.valuewhen(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-sma-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.sma(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-sma-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.sma(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-ema-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.ema(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-ema-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.ema(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-rsi-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.rsi(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-rsi-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.rsi(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-change-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.change(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-change-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.change(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-crossover-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.crossover(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-crossover-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.crossover(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-highest-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.highest(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-highest-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.highest(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-valuewhen-ta-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder ta, int n) =>\n    ta.valuewhen(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  },
  {
    "id": "v6-valuewhen-holder-state",
    "source": "//@version=6\nindicator(\"state control\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    var float acc = 0\n    acc += n\n    acc + self.value\nf(Holder holder, int n) =>\n    holder.valuewhen(n)\nplot(f(Holder.new(7),int(close)))\nplot(f(Holder.new(19),int(close)*2))"
  }
];

let sum = 0;
const first = bars.map(bar => 7 + (sum += bar.close));
sum = 0;
const second = bars.map(bar => 19 + (sum += 2 * bar.close));

describe('UDT methods retain independent written-call persistence', () => {
  it.each(stateCases)('$id', ({ id, source }) => {
    if (capturedTaShadow(id, source) || capturedBuiltinValues(id, source)) return;
    expect(values(source)).toEqual([first, second]);
  });
});

const builtinCases = [
  {
    "id": "v5-builtin-only-ta",
    "source": "//@version=5\nindicator(\"real builtin\")\ntype Holder\n    float value\nf(Holder ta) =>\n    ta.sma(close,3)\nplot(f(Holder.new(7)))"
  },
  {
    "id": "v5-builtin-only-holder",
    "source": "//@version=5\nindicator(\"real builtin\")\ntype Holder\n    float value\nf(Holder holder) =>\n    ta.sma(close,3)\nplot(f(Holder.new(7)))"
  },
  {
    "id": "v6-builtin-only-ta",
    "source": "//@version=6\nindicator(\"real builtin\")\ntype Holder\n    float value\nf(Holder ta) =>\n    ta.sma(close,3)\nplot(f(Holder.new(7)))"
  },
  {
    "id": "v6-builtin-only-holder",
    "source": "//@version=6\nindicator(\"real builtin\")\ntype Holder\n    float value\nf(Holder holder) =>\n    ta.sma(close,3)\nplot(f(Holder.new(7)))"
  }
];

describe('TA namespace remains available without a matching UDT method', () => {
  it.each(builtinCases.filter(row => row.id.endsWith('-ta')))('$id', ({ id, source }) => {
    const control = builtinCases.find(row => row.id === id.replace(/-ta$/, '-holder'))!;
    if (capturedBuiltinValues(id, source)) {
      for (const plot of values(control.source)) expect(plot).toHaveLength(bars.length);
      return;
    }
    expect(values(source)).toEqual(values(control.source));
  });
});


describe('neither a UDT method nor builtin namespace function resolves', () => {
  for (const namespace of ['ta', 'array']) {
    it(namespace, () => {
      const source = `//@version=6\nindicator("unresolved")\ntype Holder\n    int value\nf(Holder ${namespace}) =>\n    ${namespace}.w0Missing(13)\nplot(f(Holder.new(7)))`;
      expect(checkProgram(parse(source)).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-method', severity: 'error' }),
      ]));
      expect(tryCompile(parse(source)).success).toBe(false);
    });
  }
});


const mixedCases = [
  {
    "id": "v5-sma-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.sma(int(close))\n    actual = ta.sma(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "sma",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-sma-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.sma(int(close))\n    actual = ta.sma(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "sma",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-ema-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.ema(int(close))\n    actual = ta.ema(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "ema",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-ema-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.ema(int(close))\n    actual = ta.ema(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "ema",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-rsi-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.rsi(int(close))\n    actual = ta.rsi(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "rsi",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-rsi-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.rsi(int(close))\n    actual = ta.rsi(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "rsi",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-change-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.change(int(close))\n    actual = ta.change(close)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "change",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-change-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.change(int(close))\n    actual = ta.change(close)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "change",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-crossover-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.crossover(int(close))\n    actual = ta.crossover(close, open)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b ? 1 : 0)",
    "method": "crossover",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-crossover-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.crossover(int(close))\n    actual = ta.crossover(close, open)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b ? 1 : 0)",
    "method": "crossover",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-highest-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.highest(int(close))\n    actual = ta.highest(high, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "highest",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-highest-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.highest(int(close))\n    actual = ta.highest(high, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "highest",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v5-valuewhen-ta-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.valuewhen(int(close))\n    actual = ta.valuewhen(close > open, close, 1)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "valuewhen",
    "mixed": true,
    "version": 5,
    "name": "ta"
  },
  {
    "id": "v5-valuewhen-holder-mixedTrue",
    "source": "//@version=5\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.valuewhen(int(close))\n    actual = ta.valuewhen(close > open, close, 1)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "valuewhen",
    "mixed": true,
    "version": 5,
    "name": "holder"
  },
  {
    "id": "v6-sma-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.sma(int(close))\n    actual = ta.sma(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "sma",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-sma-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.sma(int(close))\n    actual = ta.sma(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "sma",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-ema-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.ema(int(close))\n    actual = ta.ema(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "ema",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-ema-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.ema(int(close))\n    actual = ta.ema(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "ema",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-rsi-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.rsi(int(close))\n    actual = ta.rsi(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "rsi",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-rsi-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod rsi(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.rsi(int(close))\n    actual = ta.rsi(close, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "rsi",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-change-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.change(int(close))\n    actual = ta.change(close)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "change",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-change-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.change(int(close))\n    actual = ta.change(close)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "change",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-crossover-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.crossover(int(close))\n    actual = ta.crossover(close, open)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b ? 1 : 0)",
    "method": "crossover",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-crossover-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod crossover(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.crossover(int(close))\n    actual = ta.crossover(close, open)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b ? 1 : 0)",
    "method": "crossover",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-highest-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.highest(int(close))\n    actual = ta.highest(high, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "highest",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-highest-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod highest(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.highest(int(close))\n    actual = ta.highest(high, 3)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "highest",
    "mixed": true,
    "version": 6,
    "name": "holder"
  },
  {
    "id": "v6-valuewhen-ta-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    own = ta.valuewhen(int(close))\n    actual = ta.valuewhen(close > open, close, 1)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "valuewhen",
    "mixed": true,
    "version": 6,
    "name": "ta"
  },
  {
    "id": "v6-valuewhen-holder-mixedTrue",
    "source": "//@version=6\nindicator(\"TA paired\")\ntype Holder\n    float value\nmethod valuewhen(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    own = holder.valuewhen(int(close))\n    actual = ta.valuewhen(close > open, close, 1)\n    [own, actual]\n[a,b] = f(Holder.new(7))\nplot(a)\nplot(b)",
    "method": "valuewhen",
    "mixed": true,
    "version": 6,
    "name": "holder"
  }
];

describe('UDT method and builtin with different argument slots coexist', () => {
  it.each(mixedCases.filter(row => row.id.includes('-ta-')))('$id', ({ id, source }) => {
    const control = mixedCases.find(row => row.id === id.replace('-ta-', '-holder-'))!;
    if (capturedTaShadow(id, source)) {
      for (const plot of values(control.source)) expect(plot).toHaveLength(bars.length);
      return;
    }
    if (capturedBuiltinValues(id, source)) {
      for (const plot of values(control.source)) expect(plot).toHaveLength(bars.length);
      return;
    }
    expect(values(source)).toEqual(values(control.source));
  });
});
