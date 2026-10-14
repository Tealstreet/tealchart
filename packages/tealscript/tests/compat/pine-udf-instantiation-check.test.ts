import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    id: 'v5-array-three-level-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmiddle(array<int> values) => leaf(values)\nouter(array<int> values) => middle(values)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-branch-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-for-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-while-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-method-method-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmethod inner(array<int> values) => leaf(values)\nmethod outer(array<int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmethod inner(array<int> values) => leaf(values)\nmethod outer(array<int> values) => values.inner()\nrelay(array<int> xs) =>\n    a = xs\n    a.outer()\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-array-udt-field-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    array<int> values\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = array.new<int>(1,23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    array<int> values\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = array.new<int>(1,23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v5-matrix-three-level-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmiddle(matrix<int> values) => leaf(values)\nouter(matrix<int> values) => middle(values)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-branch-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-for-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-while-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-method-method-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmethod inner(matrix<int> values) => leaf(values)\nmethod outer(matrix<int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmethod inner(matrix<int> values) => leaf(values)\nmethod outer(matrix<int> values) => values.inner()\nrelay(matrix<int> xs) =>\n    a = xs\n    a.outer()\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-matrix-udt-field-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    matrix<int> values\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = matrix.new<int>(1,1,23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    matrix<int> values\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = matrix.new<int>(1,1,23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v5-map-three-level-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmiddle(map<string,int> values) => leaf(values)\nouter(map<string,int> values) => middle(values)\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-branch-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-for-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-while-loop-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-method-method-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmethod inner(map<string,int> values) => leaf(values)\nmethod outer(map<string,int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmethod inner(map<string,int> values) => leaf(values)\nmethod outer(map<string,int> values) => values.inner()\nrelay(map<string,int> xs) =>\n    a = xs\n    a.outer()\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v5-map-udt-field-invalid',
    untyped:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    map<string,int> values\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=5\nindicator("W0 paired transitive writes")\ntype Holder\n    map<string,int> values\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v6-array-three-level-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmiddle(array<int> values) => leaf(values)\nouter(array<int> values) => middle(values)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-branch-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-for-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-while-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nouter(array<int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    array.get(values,0)\nrelay(array<int> xs) =>\n    a = xs\n    outer(a)\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-method-method-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmethod inner(array<int> values) => leaf(values)\nmethod outer(array<int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nmethod inner(array<int> values) => leaf(values)\nmethod outer(array<int> values) => values.inner()\nrelay(array<int> xs) =>\n    a = xs\n    a.outer()\nxs = array.new<int>(1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-array-udt-field-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    array<int> values\nleaf(values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = array.new<int>(1,23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    array<int> values\nleaf(array<int> values) =>\n    array.set(values,0,"wrong")\n    array.get(values,0)\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = array.new<int>(1,23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v6-matrix-three-level-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmiddle(matrix<int> values) => leaf(values)\nouter(matrix<int> values) => middle(values)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-branch-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-for-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-while-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nouter(matrix<int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    matrix.get(values,0,0)\nrelay(matrix<int> xs) =>\n    a = xs\n    outer(a)\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-method-method-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmethod inner(matrix<int> values) => leaf(values)\nmethod outer(matrix<int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nmethod inner(matrix<int> values) => leaf(values)\nmethod outer(matrix<int> values) => values.inner()\nrelay(matrix<int> xs) =>\n    a = xs\n    a.outer()\nxs = matrix.new<int>(1,1,23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-matrix-udt-field-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    matrix<int> values\nleaf(values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = matrix.new<int>(1,1,23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    matrix<int> values\nleaf(matrix<int> values) =>\n    matrix.set(values,0,0,"wrong")\n    matrix.get(values,0,0)\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = matrix.new<int>(1,1,23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v6-map-three-level-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmiddle(values) => leaf(values)\nouter(values) => middle(values)\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmiddle(map<string,int> values) => leaf(values)\nouter(map<string,int> values) => middle(values)\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-branch-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    if bar_index % 2 == 0\n        leaf(values)\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-for-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    for i = 0 to 1\n        leaf(values)\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    for i = 0 to 1\n        leaf(values)\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-while-loop-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nouter(map<string,int> values) =>\n    int i = 0\n    while i < 2\n        leaf(values)\n        i += 1\n    map.get(values,"v")\nrelay(map<string,int> xs) =>\n    a = xs\n    outer(a)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-method-method-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmethod inner(map<string,int> values) => leaf(values)\nmethod outer(map<string,int> values) => values.inner()\nrelay(xs) =>\n    a = xs\n    a.outer()\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nmethod inner(map<string,int> values) => leaf(values)\nmethod outer(map<string,int> values) => values.inner()\nrelay(map<string,int> xs) =>\n    a = xs\n    a.outer()\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(xs))\n',
  },
  {
    id: 'v6-map-udt-field-invalid',
    untyped:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    map<string,int> values\nleaf(values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nrelay(xs) =>\n    a = xs\n    leaf(a.values)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(Holder.new(xs)))\n',
    typed:
      '//@version=6\nindicator("W0 paired transitive writes")\ntype Holder\n    map<string,int> values\nleaf(map<string,int> values) =>\n    map.put(values,"v","wrong")\n    map.get(values,"v")\nrelay(Holder xs) =>\n    a = xs\n    leaf(a.values)\nxs = map.new<string,int>()\nmap.put(xs,"v",23)\nplot(relay(Holder.new(xs)))\n',
  },
  {
    id: 'v5-bool-scalar-assignment',
    untyped:
      '//@version=5\nindicator("Instantiated scalar parameter")\nleaf(value) =>\n    int checked = value\n    1\nouter(value) => leaf(value)\nplot(outer(true))\n',
    typed:
      '//@version=5\nindicator("Instantiated scalar parameter")\nleaf(bool value) =>\n    int checked = value\n    1\nouter(bool value) => leaf(value)\nplot(outer(true))\n',
  },
  {
    id: 'v5-string-scalar-assignment',
    untyped:
      '//@version=5\nindicator("Instantiated scalar parameter")\nleaf(value) =>\n    int checked = value\n    1\nouter(value) => leaf(value)\nplot(outer("wrong"))\n',
    typed:
      '//@version=5\nindicator("Instantiated scalar parameter")\nleaf(string value) =>\n    int checked = value\n    1\nouter(string value) => leaf(value)\nplot(outer("wrong"))\n',
  },
  {
    id: 'v5-bool-scalar-constructor',
    untyped:
      '//@version=5\nindicator("Instantiated scalar constructor")\ntype Holder\n    int value\nleaf(value) =>\n    holder = Holder.new(value)\n    1\nouter(value) => leaf(value)\nplot(outer(true))\n',
    typed:
      '//@version=5\nindicator("Instantiated scalar constructor")\ntype Holder\n    int value\nleaf(bool value) =>\n    holder = Holder.new(value)\n    1\nouter(bool value) => leaf(value)\nplot(outer(true))\n',
  },
  {
    id: 'v6-bool-scalar-assignment',
    untyped:
      '//@version=6\nindicator("Instantiated scalar parameter")\nleaf(value) =>\n    int checked = value\n    1\nouter(value) => leaf(value)\nplot(outer(true))\n',
    typed:
      '//@version=6\nindicator("Instantiated scalar parameter")\nleaf(bool value) =>\n    int checked = value\n    1\nouter(bool value) => leaf(value)\nplot(outer(true))\n',
  },
  {
    id: 'v6-string-scalar-assignment',
    untyped:
      '//@version=6\nindicator("Instantiated scalar parameter")\nleaf(value) =>\n    int checked = value\n    1\nouter(value) => leaf(value)\nplot(outer("wrong"))\n',
    typed:
      '//@version=6\nindicator("Instantiated scalar parameter")\nleaf(string value) =>\n    int checked = value\n    1\nouter(string value) => leaf(value)\nplot(outer("wrong"))\n',
  },
  {
    id: 'v6-bool-scalar-constructor',
    untyped:
      '//@version=6\nindicator("Instantiated scalar constructor")\ntype Holder\n    int value\nleaf(value) =>\n    holder = Holder.new(value)\n    1\nouter(value) => leaf(value)\nplot(outer(true))\n',
    typed:
      '//@version=6\nindicator("Instantiated scalar constructor")\ntype Holder\n    int value\nleaf(bool value) =>\n    holder = Holder.new(value)\n    1\nouter(bool value) => leaf(value)\nplot(outer(true))\n',
  },
  {
    id: 'v5-bool-block-scope',
    untyped:
      '//@version=5\nindicator("Instantiated block-scoped parameter")\nleaf(value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = true\n    if true\n        leaf(localArg)\nplot(1)\n',
    typed:
      '//@version=5\nindicator("Instantiated block-scoped parameter")\nleaf(bool value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = true\n    if true\n        leaf(localArg)\nplot(1)\n',
  },
  {
    id: 'v5-string-block-scope',
    untyped:
      '//@version=5\nindicator("Instantiated block-scoped parameter")\nleaf(value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = "wrong"\n    if true\n        leaf(localArg)\nplot(1)\n',
    typed:
      '//@version=5\nindicator("Instantiated block-scoped parameter")\nleaf(string value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = "wrong"\n    if true\n        leaf(localArg)\nplot(1)\n',
  },
  {
    id: 'v6-bool-block-scope',
    untyped:
      '//@version=6\nindicator("Instantiated block-scoped parameter")\nleaf(value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = true\n    if true\n        leaf(localArg)\nplot(1)\n',
    typed:
      '//@version=6\nindicator("Instantiated block-scoped parameter")\nleaf(bool value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = true\n    if true\n        leaf(localArg)\nplot(1)\n',
  },
  {
    id: 'v6-string-block-scope',
    untyped:
      '//@version=6\nindicator("Instantiated block-scoped parameter")\nleaf(value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = "wrong"\n    if true\n        leaf(localArg)\nplot(1)\n',
    typed:
      '//@version=6\nindicator("Instantiated block-scoped parameter")\nleaf(string value) =>\n    int checked = value\n    1\nfor i=0 to 0\n    localArg = "wrong"\n    if true\n        leaf(localArg)\nplot(1)\n',
  },
  {
    id: 'v5-scalar-function-value-namespace',
    untyped:
      '//@version=5\nindicator("Instantiated function namespace")\nleaf(value) =>\n    int checked = value\n    1\nleaf = 0\nplot(leaf(true))\n',
    typed:
      '//@version=5\nindicator("Instantiated function namespace")\nleaf(bool value) =>\n    int checked = value\n    1\nleaf = 0\nplot(leaf(true))\n',
  },
  {
    id: 'v5-array-function-value-namespace',
    untyped:
      '//@version=5\nindicator("Instantiated function namespace")\nleaf(value) =>\n    array.set(value,0,"wrong")\n    1\nleaf = 0\nplot(leaf(array.new<int>(1,23)))\n',
    typed:
      '//@version=5\nindicator("Instantiated function namespace")\nleaf(array<int> value) =>\n    array.set(value,0,"wrong")\n    1\nleaf = 0\nplot(leaf(array.new<int>(1,23)))\n',
  },
  {
    id: 'v6-scalar-function-value-namespace',
    untyped:
      '//@version=6\nindicator("Instantiated function namespace")\nleaf(value) =>\n    int checked = value\n    1\nleaf = 0\nplot(leaf(true))\n',
    typed:
      '//@version=6\nindicator("Instantiated function namespace")\nleaf(bool value) =>\n    int checked = value\n    1\nleaf = 0\nplot(leaf(true))\n',
  },
  {
    id: 'v6-array-function-value-namespace',
    untyped:
      '//@version=6\nindicator("Instantiated function namespace")\nleaf(value) =>\n    array.set(value,0,"wrong")\n    1\nleaf = 0\nplot(leaf(array.new<int>(1,23)))\n',
    typed:
      '//@version=6\nindicator("Instantiated function namespace")\nleaf(array<int> value) =>\n    array.set(value,0,"wrong")\n    1\nleaf = 0\nplot(leaf(array.new<int>(1,23)))\n',
  },
] as const;

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('written calls instantiate untyped local callable bodies', () => {
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
