import type { Bar } from '../context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars: Bar[] = [2, 5, 8].map((volume, index) => ({
  time: (index + 1) * 60000,
  open: 10,
  high: 11,
  low: 9,
  close: 10 + index,
  volume,
}));
function values(body: string) {
  const ast = parse(`//@version=6\nindicator("default bar dependencies")\n${body}`);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result.plots[0].values;
}
describe('bar fields used only by omitted UDF defaults', () => {
  it('captures volume without an unrelated root reference', () => {
    expect(values('f(series float src=volume) => src\nplot(f())')).toEqual([2, 5, 8]);
  });
  it('captures time without an unrelated root reference', () => {
    expect(values('f(series int src=time) => src\nplot(f())')).toEqual([60000, 120000, 180000]);
  });
  it('captures volume inside a default expression', () => {
    expect(values('f(series float src=volume*2) => src\nplot(f())')).toEqual([4, 10, 16]);
  });
  it('captures a method optional default', () => {
    expect(
      values(
        'type Point\n    float x\nmethod read(Point p,series float src=volume) => src+p.x\np=Point.new(1)\nplot(p.read())',
      ),
    ).toEqual([3, 6, 9]);
  });
  it('preserves default-source parameter history', () => {
    expect(values('f(series float src=volume) => src-src[1]\nplot(f())')).toEqual([null, 3, 3]);
  });
  it('keeps an explicit bar-field argument', () => {
    expect(values('f(series float src=volume) => src\nplot(f(volume))')).toEqual([2, 5, 8]);
  });
  it('keeps a price default', () => {
    expect(values('f(series float src=close) => src\nplot(f())')).toEqual([10, 11, 12]);
  });
  it('keeps a constant default', () => {
    expect(values('f(float src=7) => src\nplot(f())')).toEqual([7, 7, 7]);
  });
});
