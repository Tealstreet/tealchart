import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
describe('owner40 exact numeric receiver admission', () => {
  it.each([
    [
      'v56:1378',
      '//@version=5\nindicator("Unsupported array covariance chart point")\nleft = array.new<chart.point>()\nright = array.new<chart.point>()\nplot(array.covariance(left, right))\n',
    ],
    [
      'v56:1379',
      '//@version=5\nindicator("Unsupported array covariance table method")\nleft = array.new_table()\nright = array.new_table()\nplot(left.covariance(right))\n',
    ],
    [
      'v56:1437',
      '//@version=5\nindicator("Unsupported array.max UDT method")\ntype Point\n    float x\n\nvalues = array.from(Point.new(close))\nplot(values.max())\n',
    ],
    [
      'v56:1438',
      '//@version=5\nindicator("Unsupported array variance linefill")\nvalues = array.new_linefill(0)\nplot(array.variance(values))\n',
    ],
    [
      'v56:1674',
      '//@version=5\nindicator("Unsupported array.variance UDT method")\ntype Point\n    float x\n\nvalues = array.from(Point.new(close))\nplot(values.variance())\n',
    ],
  ])('%s refuses nonnumeric receiver', (_id, source) => {
    expect(errors(source).map((d) => d.code)).toContain('type-mismatch');
  });
  it.each([
    'left=array.from(1.0,2.0)\nright=array.from(2.0,4.0)\nplot(array.covariance(left,right))',
    'values=array.from(1,2)\nplot(values.max())',
    'values=array.from(1.0,2.0)\nplot(values.variance())',
  ])('keeps numeric receiver %s', (body) => {
    expect(errors('//@version=5\nindicator("numeric control")\n' + body)).toEqual([]);
  });
});
