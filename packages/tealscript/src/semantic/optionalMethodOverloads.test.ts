import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Optional overloads")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

// UDF manual: optional parameters do not distinguish required signatures.
describe('optional-only method overload declarations', () => {
  it.each([
    ['explicit receiver', 'method read(float self)=>self\nmethod read(float self,float add=2)=>self+add\nplot(close.read(2))'],
    ['explicit function', 'method read(float self)=>self\nmethod read(float self,float add=2)=>self+add\nplot(read(close,2))'],
    ['unused declarations', 'method read(float self)=>self\nmethod read(float self,float add=2)=>self+add\nplot(close)'],
    ['optional kinds', 'method read(float self,int add=2)=>self+add\nmethod read(float self,string label="x")=>self\nplot(close.read(2))'],
    ['required rename', 'method read(float self)=>self\nmethod read(float value,float add=2)=>value+add\nplot(read(close,2))'],
    ['required qualifier', 'method read(series float self)=>self\nmethod read(series float self,float add=2)=>self+add\nplot(close.read(2))'],
  ])('refuses %s at declaration', (_, body) => {
    expect(errors(body)).toContainEqual(expect.objectContaining({
      code: 'invalid-overload', severity: 'error',
      message: expect.stringContaining('optional parameters'),
    }));
  });
  it('retains required arity and type distinctions', () => {
    expect(errors('method read(float self)=>self\nmethod read(float self,float add)=>self+add\nmethod read(int self)=>self\nplot(close.read())\nplot(close.read(2))\nplot(read(1))')).toEqual([]);
  });
});
