import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Average inference")\n${body}`)).diagnostics.filter(d => d.severity === 'error');

describe('Array average documented return inference', () => {
  for (const call of ['array.avg(a)', 'a.avg()']) {
    it(`admits integer result from ${call}`, () => {
      expect(errors(`a = array.from(2, 5, 11)\nint mean = ${call}\nplot(mean)`)).toEqual([]);
    });
    it(`refuses simple float consumption of ${call}`, () => {
      expect(errors(`f(simple float s) => s\na = array.from(2.0, 5.0, 11.0)\nx = f(${call})`).length).toBeGreaterThan(0);
    });
  }
  it('admits literal integer control', () => {
    expect(errors('int mean = 6\nplot(mean)')).toEqual([]);
  });
  it('admits float mean', () => {
    expect(errors('a = array.from(2.0, 5.0, 11.0)\nfloat mean = array.avg(a)\nplot(mean)')).toEqual([]);
  });
  it('admits series float consumption', () => {
    expect(errors('f(series float s) => s\na = array.from(2.0, 5.0, 11.0)\nx = f(array.avg(a))')).toEqual([]);
  });
  it('preserves a custom average method contract', () => {
    expect(errors('method avg(array<float> a) => 2.0\nf(simple float s) => s\na = array.from(2.0)\nx = f(a.avg())')).toEqual([]);
  });
});
