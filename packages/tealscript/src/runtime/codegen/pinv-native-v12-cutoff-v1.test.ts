import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const cases = [
  {
    name: 'matrix-pinv-cutoff-zero-v1.pine',
    source:
      '//@version=6\nindicator("matrix-pinv-cutoff-zero-v1")\nvar m=matrix.new<float>(2,2,0.0)\nmatrix.set(m,0,0,1.0)\nmatrix.set(m,1,1,0.0)\np=matrix.pinv(m)\nplot(matrix.get(p,0,0),"pinv00")\nplot(matrix.get(p,1,1),"pinv11")\nplot(matrix.get(m,1,1),"source11")\n',
    sourceSha256: 'abb55cdbcef097fe692374804d42e697d86132311712b2926023bab62070a952',
    csvSha256: 'c9fceedbe3eeb4171a4e896d372b1584101717966371b88d4fcbeb963ae02a96',
    expected: {
      pinv00: 1.0,
      pinv11: 0.0,
      source11: 0.0,
    },
  },
  {
    name: 'matrix-pinv-cutoff-small8-v1.pine',
    source:
      '//@version=6\nindicator("matrix-pinv-cutoff-small8-v1")\nvar m=matrix.new<float>(2,2,0.0)\nmatrix.set(m,0,0,1.0)\nmatrix.set(m,1,1,1e-8)\np=matrix.pinv(m)\nplot(matrix.get(p,0,0),"pinv00")\nplot(matrix.get(p,1,1),"pinv11")\nplot(matrix.get(m,1,1),"source11")\n',
    sourceSha256: '6b8d76d0f67dee2fd37cbb340e1fbb4414e932c0ee2e61b8fb1a9ac57cfda964',
    csvSha256: 'f50ae86368fc672b1f0e73687c665fe54eb0509bdae80e6e3e42153587adb95b',
    expected: {
      pinv00: 1.0,
      pinv11: 100000000.0,
      source11: 1e-8,
    },
  },
  {
    name: 'matrix-pinv-cutoff-small12-v1.pine',
    source:
      '//@version=6\nindicator("matrix-pinv-cutoff-small12-v1")\nvar m=matrix.new<float>(2,2,0.0)\nmatrix.set(m,0,0,1.0)\nmatrix.set(m,1,1,1e-12)\np=matrix.pinv(m)\nplot(matrix.get(p,0,0),"pinv00")\nplot(matrix.get(p,1,1),"pinv11")\nplot(matrix.get(m,1,1),"source11")\n',
    sourceSha256: '6e42dc1fde7c2ef0e160b2657b924639ed441d5019d3fd1032c20bf1d31c883f',
    csvSha256: 'dd3eceee15ee169542d752b4f6f56e1dd2610ceee05c3d73fe5953ecdfed7f9d',
    expected: {
      pinv00: 1.0,
      pinv11: 1000000000000.0,
      source11: 1e-12,
    },
  },
  {
    name: 'matrix-pinv-cutoff-small16-v1.pine',
    source:
      '//@version=6\nindicator("matrix-pinv-cutoff-small16-v1")\nvar m=matrix.new<float>(2,2,0.0)\nmatrix.set(m,0,0,1.0)\nmatrix.set(m,1,1,1e-16)\np=matrix.pinv(m)\nplot(matrix.get(p,0,0),"pinv00")\nplot(matrix.get(p,1,1),"pinv11")\nplot(matrix.get(m,1,1),"source11")\n',
    sourceSha256: 'aa7e41eff80dc03a9e8e1f7edf84553caf984dc7e71717e0f670117664b3711a',
    csvSha256: '3bee6c957657958308c20654c35b09d9738d5db3b3e4d0de6ec48388993884d9',
    expected: {
      pinv00: 1.0,
      pinv11: 0.0,
      source11: 1e-16,
    },
  },
];
const bars = [
  { time: 120000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
  { time: 240000, open: 2, high: 3, low: 1, close: 2, volume: 1 },
];

describe('Exact v12 pinv native cutoff sources', () => {
  it.each(cases)('$name preserves captured plotted values', (witness) => {
    expect(createHash('sha256').update(witness.source).digest('hex')).toBe(witness.sourceSha256);
    const result = executeScript(parse(witness.source), bars);
    expect(result.errors).toEqual([]);
    for (const plot of result.plots) {
      expect(plot.values, witness.csvSha256).toEqual([
        witness.expected[plot.title as keyof typeof witness.expected],
        witness.expected[plot.title as keyof typeof witness.expected],
      ]);
    }
  });
});
