import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    id: 'v5-array-int-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-array-int-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    score(a)\nouter(array<int> xs,array<int> ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-array-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-array-float-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-array-float-d1-udt-field-other-kind',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-array-float-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    score(a)\nouter(array<float> xs,array<float> ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-array-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    score(a)\nouter(array<float> xs,array<float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-array-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-d1-udt-field-other-kind',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    score(a)\nouter(matrix<int> xs,matrix<int> ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-d1-forward-constructor-mismatch',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    score(a)\nouter(matrix<int> xs,matrix<int> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-matrix-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-d1-udt-field-other-kind',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    score(a)\nouter(matrix<float> xs,matrix<float> ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    score(a)\nouter(matrix<float> xs,matrix<float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-matrix-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-int-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-int-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    score(a)\nouter(map<string,int> xs,map<string,int> ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-map-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-float-d1-alias-written-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-float-d1-udt-field-other-kind',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v5-map-float-d1-forward-write-bool',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    score(a)\nouter(map<string,float> xs,map<string,float> ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-map-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    score(a)\nouter(map<string,float> xs,map<string,float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v5-map-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=5\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-int-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-int-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    score(a)\nouter(array<int> xs,array<int> ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-array-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(array<int> xs,array<int> ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<int>(1,int(close))\nys = array.new<int>(1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-float-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    array.set(a,0,true)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-float-d1-udt-field-other-kind',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-array-float-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    score(a)\nouter(array<float> xs,array<float> ys) =>\n    array.set(xs,0,true)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-array-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    array<int> value\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    score(a)\nouter(array<float> xs,array<float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-array-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\npick(array<int> first,array<int> second) => 100+array.get(first,0)+array.get(second,0)\npick(array<float> first,array<float> second) => 200+array.get(first,0)+array.get(second,0)\nrelay(array<float> xs,array<float> ys) =>\n    a = xs\n    fromOther = ys\n    array.set(fromOther,0,true)\n    pick(a,fromOther)\nxs = array.new<float>(1,close+0.5)\nys = array.new<float>(1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-d1-udt-field-other-kind',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    score(a)\nouter(matrix<int> xs,matrix<int> ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-d1-forward-constructor-mismatch',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<float> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    score(a)\nouter(matrix<int> xs,matrix<int> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-matrix-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(matrix<int> xs,matrix<int> ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<int>(1,1,int(close))\nys = matrix.new<int>(1,1,int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    matrix.set(a,0,0,true)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-d1-udt-field-other-kind',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    score(a)\nouter(matrix<float> xs,matrix<float> ys) =>\n    matrix.set(xs,0,0,true)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    matrix<int> value\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    score(a)\nouter(matrix<float> xs,matrix<float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-matrix-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\npick(matrix<int> first,matrix<int> second) => 100+matrix.get(first,0,0)+matrix.get(second,0,0)\npick(matrix<float> first,matrix<float> second) => 200+matrix.get(first,0,0)+matrix.get(second,0,0)\nrelay(matrix<float> xs,matrix<float> ys) =>\n    a = xs\n    fromOther = ys\n    matrix.set(fromOther,0,0,true)\n    pick(a,fromOther)\nxs = matrix.new<float>(1,1,close+0.5)\nys = matrix.new<float>(1,1,close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-int-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-int-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    score(a)\nouter(map<string,int> xs,map<string,int> ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-map-int-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(map<string,int> xs,map<string,int> ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,int>()\nys = map.new<string,int>()\nmap.put(xs,"v",int(close))\nmap.put(ys,"v",int(close)+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-float-d1-alias-written-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    map.put(a,"v",true)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-float-d1-udt-field-other-kind',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    holder = Holder.new(a)\n    score(a)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
  {
    id: 'v6-map-float-d1-forward-write-bool',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    score(a)\nouter(map<string,float> xs,map<string,float> ys) =>\n    map.put(xs,"v",true)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-map-float-d1-forward-constructor-mismatch',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(xs,ys) =>\n    a = xs\n    score(a)\nouter(xs,ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\ntype Holder\n    map<string,int> value\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    score(a)\nouter(map<string,float> xs,map<string,float> ys) =>\n    holder = Holder.new(xs)\n    relay(xs,ys)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(outer(xs,ys))\n',
  },
  {
    id: 'v6-map-float-d1-mixed-depth-other-write',
    untyped:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(xs,ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
    typed:
      '//@version=6\nindicator("G6 whitelist depth boundary")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\npick(map<string,int> first,map<string,int> second) => 100+map.get(first,"v")+map.get(second,"v")\npick(map<string,float> first,map<string,float> second) => 200+map.get(first,"v")+map.get(second,"v")\nrelay(map<string,float> xs,map<string,float> ys) =>\n    a = xs\n    fromOther = ys\n    map.put(fromOther,"v",true)\n    pick(a,fromOther)\nxs = map.new<string,float>()\nys = map.new<string,float>()\nmap.put(xs,"v",close+0.5)\nmap.put(ys,"v",close+0.5+70)\nplot(relay(xs,ys))\n',
  },
];

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('single collection aliases inherit call-site element validation', () => {
  for (const { id, untyped, typed } of cases) {
    it(id, () => {
      const expected = errors(typed);
      expect(expected.length).toBeGreaterThan(0);
      const actual = errors(untyped);
      for (const { code, message } of expected) {
        expect(actual).toContainEqual(expect.objectContaining({ code, message }));
      }
    });
  }
});

describe('typed callers forward inherited collection validation', () => {
  for (const { id, untyped, typed } of cases.filter((entry) => entry.id.endsWith('-alias-written-bool'))) {
    const parameterType = typed.match(/relay\((.*?) xs,/)![1];
    const forward = (source: string) =>
      source
        .replace('xs = ', `outer(${parameterType} first,${parameterType} second) => relay(first,second)\nxs = `)
        .replace('plot(relay(xs,ys))', 'plot(outer(xs,ys))');
    it(id, () => {
      const expected = errors(forward(typed));
      expect(expected.length).toBeGreaterThan(0);
      for (const { code, message } of expected) {
        expect(errors(forward(untyped))).toContainEqual(expect.objectContaining({ code, message }));
      }
    });
  }
});
