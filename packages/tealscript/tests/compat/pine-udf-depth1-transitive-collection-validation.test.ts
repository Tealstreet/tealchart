import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    id: 'v5-array-helper',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutate(values) => array.set(values,0,true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutate(array<int> values) => array.set(values,0,true)\nrelay(array<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-typed-method',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forward(array<int> values) => relay(values)\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forward(array<int> values) => relay(values)\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v5-matrix-helper',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutate(values) => matrix.set(values,0,0,true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutate(matrix<int> values) => matrix.set(values,0,0,true)\nrelay(matrix<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-typed-method',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forward(matrix<int> values) => relay(values)\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forward(matrix<int> values) => relay(values)\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v5-map-helper',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutate(values) => map.put(values,"v",true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutate(map<string,int> values) => map.put(values,"v",true)\nrelay(map<string,int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-typed-method',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forward(map<string,int> values) => relay(values)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forward(map<string,int> values) => relay(values)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-array-helper',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutate(values) => array.set(values,0,true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutate(array<int> values) => array.set(values,0,true)\nrelay(array<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-typed-method',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forward(array<int> values) => relay(values)\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forward(array<int> values) => relay(values)\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-matrix-helper',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutate(values) => matrix.set(values,0,0,true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutate(matrix<int> values) => matrix.set(values,0,0,true)\nrelay(matrix<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-typed-method',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forward(matrix<int> values) => relay(values)\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forward(matrix<int> values) => relay(values)\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-map-helper',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutate(values) => map.put(values,"v",true)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutate(map<string,int> values) => map.put(values,"v",true)\nrelay(map<string,int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-typed-method',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forward(map<string,int> values) => relay(values)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forward(map<string,int> values) => relay(values)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
  },
  {
    id: 'v5-array-helper-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutateLeaf(values) => array.set(values,0,true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutateLeaf(array<int> values) => array.set(values,0,true)\nmutate(array<int> values) => mutateLeaf(values)\nrelay(array<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-typed-method-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forwardLeaf(array<int> values) => relay(values)\nmethod forward(array<int> values) => values.forwardLeaf()\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forwardLeaf(array<int> values) => relay(values)\nmethod forward(array<int> values) => values.forwardLeaf()\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v5-matrix-helper-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutateLeaf(values) => matrix.set(values,0,0,true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutateLeaf(matrix<int> values) => matrix.set(values,0,0,true)\nmutate(matrix<int> values) => mutateLeaf(values)\nrelay(matrix<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-typed-method-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forwardLeaf(matrix<int> values) => relay(values)\nmethod forward(matrix<int> values) => values.forwardLeaf()\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forwardLeaf(matrix<int> values) => relay(values)\nmethod forward(matrix<int> values) => values.forwardLeaf()\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v5-map-helper-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutateLeaf(values) => map.put(values,"v",true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutateLeaf(map<string,int> values) => map.put(values,"v",true)\nmutate(map<string,int> values) => mutateLeaf(values)\nrelay(map<string,int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-typed-method-two-hop',
    untyped:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forwardLeaf(map<string,int> values) => relay(values)\nmethod forward(map<string,int> values) => values.forwardLeaf()\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
    typed:
      '//@version=5\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forwardLeaf(map<string,int> values) => relay(values)\nmethod forward(map<string,int> values) => values.forwardLeaf()\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-array-helper-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutateLeaf(values) => array.set(values,0,true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nmutateLeaf(array<int> values) => array.set(values,0,true)\nmutate(array<int> values) => mutateLeaf(values)\nrelay(array<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = array.new<int>(1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-typed-method-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forwardLeaf(array<int> values) => relay(values)\nmethod forward(array<int> values) => values.forwardLeaf()\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(array<int> values) => 100+array.get(values,0)\nscore(array<float> values) => 200+array.get(values,0)\nrelay(array<int> values) =>\n    a = values\n    array.set(a,0,true)\n    score(a)\nmethod forwardLeaf(array<int> values) => relay(values)\nmethod forward(array<int> values) => values.forwardLeaf()\nxs = array.new<int>(1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-matrix-helper-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutateLeaf(values) => matrix.set(values,0,0,true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nmutateLeaf(matrix<int> values) => matrix.set(values,0,0,true)\nmutate(matrix<int> values) => mutateLeaf(values)\nrelay(matrix<int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = matrix.new<int>(1,1,3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-typed-method-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forwardLeaf(matrix<int> values) => relay(values)\nmethod forward(matrix<int> values) => values.forwardLeaf()\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(matrix<int> values) => 100+matrix.get(values,0,0)\nscore(matrix<float> values) => 200+matrix.get(values,0,0)\nrelay(matrix<int> values) =>\n    a = values\n    matrix.set(a,0,0,true)\n    score(a)\nmethod forwardLeaf(matrix<int> values) => relay(values)\nmethod forward(matrix<int> values) => values.forwardLeaf()\nxs = matrix.new<int>(1,1,3)\nplot(xs.forward())\n',
  },
  {
    id: 'v6-map-helper-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutateLeaf(values) => map.put(values,"v",true)\nmutate(values) => mutateLeaf(values)\nrelay(values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 helper")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nmutateLeaf(map<string,int> values) => map.put(values,"v",true)\nmutate(map<string,int> values) => mutateLeaf(values)\nrelay(map<string,int> values) =>\n    a = values\n    mutate(a)\n    score(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-typed-method-two-hop',
    untyped:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forwardLeaf(map<string,int> values) => relay(values)\nmethod forward(map<string,int> values) => values.forwardLeaf()\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
    typed:
      '//@version=6\nindicator("G6 reduced D1 typed-method")\nscore(map<string,int> values) => 100+map.get(values,"v")\nscore(map<string,float> values) => 200+map.get(values,"v")\nrelay(map<string,int> values) =>\n    a = values\n    map.put(a,"v",true)\n    score(a)\nmethod forwardLeaf(map<string,int> values) => relay(values)\nmethod forward(map<string,int> values) => values.forwardLeaf()\nxs = map.new<string,int>()\nmap.put(xs,"v",3)\nplot(xs.forward())\n',
  },
] as const;

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('inherited collection writes through selected helpers and method entries', () => {
  for (const { id, untyped, typed } of cases) {
    it(id, () => {
      const expected = errors(typed);
      expect(expected.length).toBeGreaterThan(0);
      for (const { code, message } of expected) {
        expect(errors(untyped)).toContainEqual(expect.objectContaining({ code, message }));
      }
    });
  }
});
