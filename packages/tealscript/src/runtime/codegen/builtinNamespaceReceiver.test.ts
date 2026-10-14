import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const cases = [
  {
    "name": "v5 push False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array) =>\n    array.push(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 unshift False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array) =>\n    array.unshift(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 set False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array) =>\n    array.set(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>(1,0)))",
    "expected": 41
  },
  {
    "name": "v5 insert False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array) =>\n    array.insert(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 box top False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(box) =>\n    box.set_top(array.get(box,0),47)\n    box.get_top(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box bottom False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(box) =>\n    box.set_bottom(array.get(box,0),47)\n    box.get_bottom(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box left False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(box) =>\n    box.set_left(array.get(box,0),47)\n    box.get_left(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box right False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(box) =>\n    box.set_right(array.get(box,0),47)\n    box.get_right(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 line False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(line) =>\n    line.set_y2(array.get(line,0),47)\n    line.get_y2(array.get(line,0))\nplot(f(array.from(line.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 label False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(label) =>\n    label.set_y(array.get(label,0),47)\n    label.get_y(array.get(label,0))\nplot(f(array.from(label.new(0,20))))",
    "expected": 47
  },
  {
    "name": "v5 table False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(table) =>\n    table.cell(array.get(table,0),0,0,\"ok\")\n    array.size(table)\nplot(f(array.from(table.new(position.top_right,1,1))))",
    "expected": 1
  },
  {
    "name": "v5 matrix False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(matrix) =>\n    matrix.set(matrix,0,0,47)\n    matrix.get(matrix,0,0)\nplot(f(matrix.new<int>(1,1,0)))",
    "expected": 47
  },
  {
    "name": "v5 map False",
    "source": "//@version=5\nindicator(\"namespace\")\nf(map) =>\n    map.put(map,\"x\",47)\n    map.get(map,\"x\")\nplot(f(map.new<string,int>()))",
    "expected": 47
  },
  {
    "name": "v5 push True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.push(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 unshift True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.unshift(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 set True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.set(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>(1,0)))",
    "expected": 41
  },
  {
    "name": "v5 insert True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.insert(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v5 box top True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_top(array.get(box,0),47)\n    box.get_top(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box bottom True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_bottom(array.get(box,0),47)\n    box.get_bottom(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box left True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_left(array.get(box,0),47)\n    box.get_left(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 box right True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_right(array.get(box,0),47)\n    box.get_right(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 line True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<line> line) =>\n    line.set_y2(array.get(line,0),47)\n    line.get_y2(array.get(line,0))\nplot(f(array.from(line.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v5 label True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<label> label) =>\n    label.set_y(array.get(label,0),47)\n    label.get_y(array.get(label,0))\nplot(f(array.from(label.new(0,20))))",
    "expected": 47
  },
  {
    "name": "v5 table True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(array<table> table) =>\n    table.cell(array.get(table,0),0,0,\"ok\")\n    array.size(table)\nplot(f(array.from(table.new(position.top_right,1,1))))",
    "expected": 1
  },
  {
    "name": "v5 matrix True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(matrix<int> matrix) =>\n    matrix.set(matrix,0,0,47)\n    matrix.get(matrix,0,0)\nplot(f(matrix.new<int>(1,1,0)))",
    "expected": 47
  },
  {
    "name": "v5 map True",
    "source": "//@version=5\nindicator(\"namespace\")\nf(map<string,int> map) =>\n    map.put(map,\"x\",47)\n    map.get(map,\"x\")\nplot(f(map.new<string,int>()))",
    "expected": 47
  },
  {
    "name": "v6 push False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array) =>\n    array.push(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 unshift False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array) =>\n    array.unshift(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 set False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array) =>\n    array.set(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>(1,0)))",
    "expected": 41
  },
  {
    "name": "v6 insert False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array) =>\n    array.insert(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 box top False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(box) =>\n    box.set_top(array.get(box,0),47)\n    box.get_top(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box bottom False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(box) =>\n    box.set_bottom(array.get(box,0),47)\n    box.get_bottom(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box left False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(box) =>\n    box.set_left(array.get(box,0),47)\n    box.get_left(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box right False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(box) =>\n    box.set_right(array.get(box,0),47)\n    box.get_right(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 line False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(line) =>\n    line.set_y2(array.get(line,0),47)\n    line.get_y2(array.get(line,0))\nplot(f(array.from(line.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 label False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(label) =>\n    label.set_y(array.get(label,0),47)\n    label.get_y(array.get(label,0))\nplot(f(array.from(label.new(0,20))))",
    "expected": 47
  },
  {
    "name": "v6 table False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(table) =>\n    table.cell(array.get(table,0),0,0,\"ok\")\n    array.size(table)\nplot(f(array.from(table.new(position.top_right,1,1))))",
    "expected": 1
  },
  {
    "name": "v6 matrix False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(matrix) =>\n    matrix.set(matrix,0,0,47)\n    matrix.get(matrix,0,0)\nplot(f(matrix.new<int>(1,1,0)))",
    "expected": 47
  },
  {
    "name": "v6 map False",
    "source": "//@version=6\nindicator(\"namespace\")\nf(map) =>\n    map.put(map,\"x\",47)\n    map.get(map,\"x\")\nplot(f(map.new<string,int>()))",
    "expected": 47
  },
  {
    "name": "v6 push True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.push(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 unshift True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.unshift(array,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 set True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.set(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>(1,0)))",
    "expected": 41
  },
  {
    "name": "v6 insert True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<int> array) =>\n    array.insert(array,0,41)\n    array.get(array,0)\nplot(f(array.new<int>()))",
    "expected": 41
  },
  {
    "name": "v6 box top True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_top(array.get(box,0),47)\n    box.get_top(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box bottom True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_bottom(array.get(box,0),47)\n    box.get_bottom(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box left True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_left(array.get(box,0),47)\n    box.get_left(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 box right True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<box> box) =>\n    box.set_right(array.get(box,0),47)\n    box.get_right(array.get(box,0))\nplot(f(array.from(box.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 line True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<line> line) =>\n    line.set_y2(array.get(line,0),47)\n    line.get_y2(array.get(line,0))\nplot(f(array.from(line.new(0,30,1,20))))",
    "expected": 47
  },
  {
    "name": "v6 label True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<label> label) =>\n    label.set_y(array.get(label,0),47)\n    label.get_y(array.get(label,0))\nplot(f(array.from(label.new(0,20))))",
    "expected": 47
  },
  {
    "name": "v6 table True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(array<table> table) =>\n    table.cell(array.get(table,0),0,0,\"ok\")\n    array.size(table)\nplot(f(array.from(table.new(position.top_right,1,1))))",
    "expected": 1
  },
  {
    "name": "v6 matrix True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(matrix<int> matrix) =>\n    matrix.set(matrix,0,0,47)\n    matrix.get(matrix,0,0)\nplot(f(matrix.new<int>(1,1,0)))",
    "expected": 47
  },
  {
    "name": "v6 map True",
    "source": "//@version=6\nindicator(\"namespace\")\nf(map<string,int> map) =>\n    map.put(map,\"x\",47)\n    map.get(map,\"x\")\nplot(f(map.new<string,int>()))",
    "expected": 47
  },
  {
    "name": "v5 array receiver",
    "source": "//@version=5\nindicator(\"receiver control\")\nf(array<int> values) =>\n    values.push(41)\n    values.unshift(2)\n    values.set(0,3)\n    values.insert(0,4)\n    values.get(1)\nplot(f(array.new<int>()))",
    "expected": 3
  },
  {
    "name": "v5 drawing receiver",
    "source": "//@version=5\nindicator(\"receiver control\")\nf(box value) =>\n    value.set_top(47)\n    value.get_top()\nplot(f(box.new(0,30,1,20)))",
    "expected": 47
  },
  {
    "name": "v5 UDT method",
    "source": "//@version=5\nindicator(\"receiver control\")\ntype Holder\n    int value\nmethod set_top(Holder value, int x) =>\n    x + value.value\nplot(Holder.new(2).set_top(47))",
    "expected": 49
  },
  {
    "name": "v6 array receiver",
    "source": "//@version=6\nindicator(\"receiver control\")\nf(array<int> values) =>\n    values.push(41)\n    values.unshift(2)\n    values.set(0,3)\n    values.insert(0,4)\n    values.get(1)\nplot(f(array.new<int>()))",
    "expected": 3
  },
  {
    "name": "v6 drawing receiver",
    "source": "//@version=6\nindicator(\"receiver control\")\nf(box value) =>\n    value.set_top(47)\n    value.get_top()\nplot(f(box.new(0,30,1,20)))",
    "expected": 47
  },
  {
    "name": "v6 UDT method",
    "source": "//@version=6\nindicator(\"receiver control\")\ntype Holder\n    int value\nmethod set_top(Holder value, int x) =>\n    x + value.value\nplot(Holder.new(2).set_top(47))",
    "expected": 49
  },
  {
    "name": "v5 set string False",
    "source": "//@version=5\nindicator(\"namespace string slots\")\nf(array) =>\n    array.set(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>(1,\"\")))",
    "expected": 2
  },
  {
    "name": "v5 insert string False",
    "source": "//@version=5\nindicator(\"namespace string slots\")\nf(array) =>\n    array.insert(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>()))",
    "expected": 2
  },
  {
    "name": "v5 set string True",
    "source": "//@version=5\nindicator(\"namespace string slots\")\nf(array<string> array) =>\n    array.set(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>(1,\"\")))",
    "expected": 2
  },
  {
    "name": "v5 insert string True",
    "source": "//@version=5\nindicator(\"namespace string slots\")\nf(array<string> array) =>\n    array.insert(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>()))",
    "expected": 2
  },
  {
    "name": "v6 set string False",
    "source": "//@version=6\nindicator(\"namespace string slots\")\nf(array) =>\n    array.set(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>(1,\"\")))",
    "expected": 2
  },
  {
    "name": "v6 insert string False",
    "source": "//@version=6\nindicator(\"namespace string slots\")\nf(array) =>\n    array.insert(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>()))",
    "expected": 2
  },
  {
    "name": "v6 set string True",
    "source": "//@version=6\nindicator(\"namespace string slots\")\nf(array<string> array) =>\n    array.set(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>(1,\"\")))",
    "expected": 2
  },
  {
    "name": "v6 insert string True",
    "source": "//@version=6\nindicator(\"namespace string slots\")\nf(array<string> array) =>\n    array.insert(array,0,\"OK\")\n    str.length(array.get(array,0))\nplot(f(array.new<string>()))",
    "expected": 2
  }
];
const bars = [0, 1, 2].map((index) => ({ time: 1_700_000_000_000 + index * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

describe('builtin namespaces coexist with same-name parameters', () => {
  it.each(cases)('$name', ({ source, expected }) => {
    const program = parse(source);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const compiled = tryCompile(program);
    expect(compiled.unsupported).toEqual([]);
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result!.errors).toEqual([]);
    expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    expect(result!.plots.map((plot) => plot.values)).toEqual([[expected, expected, expected]]);
  });
});
