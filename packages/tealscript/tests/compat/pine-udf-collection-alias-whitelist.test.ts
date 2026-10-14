import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    id: 'v5-array-float-udt-other-kind-constructor',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-udt-other-kind-constructor',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-udt-other-kind-constructor',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-float-udt-other-kind-constructor',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-float-udt-other-kind-constructor',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-udt-other-kind-constructor',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-udt-other-kind-constructor',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-float-udt-other-kind-constructor',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-array-float-udt-other-kind-field-write',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    array.set(holder.value,0,91)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    array.set(holder.value,0,91)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-udt-other-kind-field-write',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-udt-other-kind-field-write',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-float-udt-other-kind-field-write',
    untyped:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    map.put(holder.value,"v",91)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    map.put(holder.value,"v",91)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-float-udt-other-kind-field-write',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    array.set(holder.value,0,91)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    array.set(holder.value,0,91)\n    score(c)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-udt-other-kind-field-write',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-udt-other-kind-field-write',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    matrix.set(holder.value,0,0,91)\n    score(c)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-float-udt-other-kind-field-write',
    untyped:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    map.put(holder.value,"v",91)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 mutation graph boundary")\ntype OtherHolder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    b = a\n    c = b\n    holder = OtherHolder.new(b)\n    map.put(holder.value,"v",91)\n    score(c)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
];

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('collection alias chains refuse constructor escapes', () => {
  for (const { id, untyped, typed } of cases) {
    it(id, () => {
      expect(errors(typed).some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
      expect(errors(untyped).length).toBeGreaterThan(0);
    });
  }
});

const landedAliases = [
  {
    id: 'v5-array-int-terminal-named-after-if',
    untyped:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(array<int> xs) => 10\nscore(array<float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        array.size(copied)\n    score(xs=copied)\nplot(relay(array.new<int>(1,3),array.new<float>(1,1.5)))\n',
    typed:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(array<int> xs) => 10\nscore(array<float> xs) => 20\nrelay(array<int> xs, array<float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        array.size(copied)\n    score(xs=copied)\nplot(relay(array.new<int>(1,3),array.new<float>(1,1.5)))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v5-matrix-int-terminal-named-after-if',
    untyped:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(matrix<int> xs) => 10\nscore(matrix<float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        matrix.elements_count(copied)\n    score(xs=copied)\nplot(relay(matrix.new<int>(1,1,3),matrix.new<float>(1,1,1.5)))\n',
    typed:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(matrix<int> xs) => 10\nscore(matrix<float> xs) => 20\nrelay(matrix<int> xs, matrix<float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        matrix.elements_count(copied)\n    score(xs=copied)\nplot(relay(matrix.new<int>(1,1,3),matrix.new<float>(1,1,1.5)))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v5-map-int-terminal-named-after-if',
    untyped:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(map<string,int> xs) => 10\nscore(map<string,float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        map.size(copied)\n    score(xs=copied)\nplot(relay(map.new<string,int>(),map.new<string,float>()))\n',
    typed:
      '//@version=5\nindicator("G6 alias terminal boundary")\nscore(map<string,int> xs) => 10\nscore(map<string,float> xs) => 20\nrelay(map<string,int> xs, map<string,float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        map.size(copied)\n    score(xs=copied)\nplot(relay(map.new<string,int>(),map.new<string,float>()))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v6-array-int-terminal-named-after-if',
    untyped:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(array<int> xs) => 10\nscore(array<float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        array.size(copied)\n    score(xs=copied)\nplot(relay(array.new<int>(1,3),array.new<float>(1,1.5)))\n',
    typed:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(array<int> xs) => 10\nscore(array<float> xs) => 20\nrelay(array<int> xs, array<float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        array.size(copied)\n    score(xs=copied)\nplot(relay(array.new<int>(1,3),array.new<float>(1,1.5)))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v6-matrix-int-terminal-named-after-if',
    untyped:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(matrix<int> xs) => 10\nscore(matrix<float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        matrix.elements_count(copied)\n    score(xs=copied)\nplot(relay(matrix.new<int>(1,1,3),matrix.new<float>(1,1,1.5)))\n',
    typed:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(matrix<int> xs) => 10\nscore(matrix<float> xs) => 20\nrelay(matrix<int> xs, matrix<float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        matrix.elements_count(copied)\n    score(xs=copied)\nplot(relay(matrix.new<int>(1,1,3),matrix.new<float>(1,1,1.5)))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v6-map-int-terminal-named-after-if',
    untyped:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(map<string,int> xs) => 10\nscore(map<string,float> xs) => 20\nrelay(xs, ys) =>\n    copied = xs\n    if bar_index >= 0\n        map.size(copied)\n    score(xs=copied)\nplot(relay(map.new<string,int>(),map.new<string,float>()))\n',
    typed:
      '//@version=6\nindicator("G6 alias terminal boundary")\nscore(map<string,int> xs) => 10\nscore(map<string,float> xs) => 20\nrelay(map<string,int> xs, map<string,float> ys) =>\n    copied = xs\n    if bar_index >= 0\n        map.size(copied)\n    score(xs=copied)\nplot(relay(map.new<string,int>(),map.new<string,float>()))\n',
    expected: [10, 10, 10, 10, 10],
  },
  {
    id: 'v5-array-int-terminal-after-benign-loop',
    untyped:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = array.get(copied,0)\n        i += 1\n    score(copied)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = array.get(copied,0)\n        i += 1\n    score(copied)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
  {
    id: 'v5-matrix-int-terminal-after-benign-loop',
    untyped:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = matrix.get(copied,0,0)\n        i += 1\n    score(copied)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = matrix.get(copied,0,0)\n        i += 1\n    score(copied)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
  {
    id: 'v5-map-int-terminal-after-benign-loop',
    untyped:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = map.get(copied,"v")\n        i += 1\n    score(copied)\nxs = map.new<string,int>()\nmap.put(xs,"v",int(close))\nys = map.new<string,int>()\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 persistent alias state")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = map.get(copied,"v")\n        i += 1\n    score(copied)\nxs = map.new<string,int>()\nmap.put(xs,"v",int(close))\nys = map.new<string,int>()\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
  {
    id: 'v6-array-int-terminal-after-benign-loop',
    untyped:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = array.get(copied,0)\n        i += 1\n    score(copied)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = array.get(copied,0)\n        i += 1\n    score(copied)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
  {
    id: 'v6-matrix-int-terminal-after-benign-loop',
    untyped:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = matrix.get(copied,0,0)\n        i += 1\n    score(copied)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = matrix.get(copied,0,0)\n        i += 1\n    score(copied)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
  {
    id: 'v6-map-int-terminal-after-benign-loop',
    untyped:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = map.get(copied,"v")\n        i += 1\n    score(copied)\nxs = map.new<string,int>()\nmap.put(xs,"v",int(close))\nys = map.new<string,int>()\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 persistent alias state")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    var copied = xs\n    i = 0\n    while i < 1\n        unused = map.get(copied,"v")\n        i += 1\n    score(copied)\nxs = map.new<string,int>()\nmap.put(xs,"v",int(close))\nys = map.new<string,int>()\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    expected: [123, 123, 123, 123, 123],
  },
];

function values(source: string) {
  const ast = parse(source);
  expect(errors(source)).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const bars = [23, 25, 29, 31, 37].map((close, index) => ({
    time: Date.UTC(2026, 9, 2) + index * 60000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 17,
  }));
  const result = executeCompiled(compiled, bars, undefined, { runtime: { timeframe: { period: '1' } } });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

describe('landed single aliases keep their v4 admission and runtime values', () => {
  for (const { id, untyped, typed, expected } of landedAliases) {
    it(id, () => {
      expect(values(typed)).toEqual([expected]);
      expect(values(untyped)).toEqual([expected]);
    });
  }
});
