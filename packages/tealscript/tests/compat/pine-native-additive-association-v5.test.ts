import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Exact v5 bundle source hashes and native first-four-row CSV values.
// Full capture and neighboring-column comparisons are retained in the proof archive.
const cases = [
  {
    probe: 'compound-additive-grouping-v1.pine',
    attempt: 1,
    column: 'root_plain',
    sourceSha256: '58150e75dd6ced3e5320eceb78fd7186b54db89fcae8801a751d0b4a05eb8596',
    captureSha256: '3ae0e774cc8d14f24d590fe03152ac7ded5a99852c569f053a0ece724846e1ca',
    expected: [0.0, 0.0, 0.0, 0.0],
  },
  {
    probe: 'compound-additive-grouping-v1.pine',
    attempt: 1,
    column: 'udf_plain',
    sourceSha256: '58150e75dd6ced3e5320eceb78fd7186b54db89fcae8801a751d0b4a05eb8596',
    captureSha256: '3ae0e774cc8d14f24d590fe03152ac7ded5a99852c569f053a0ece724846e1ca',
    expected: [0.0, 0.0, 0.0, 0.0],
  },
  {
    probe: 'compound-additive-grouping-v1.pine',
    attempt: 2,
    column: 'root_plain',
    sourceSha256: '58150e75dd6ced3e5320eceb78fd7186b54db89fcae8801a751d0b4a05eb8596',
    captureSha256: '758a22e0f86d8c86f38ca076eeccccf56bc6ae96c2153c95cc716f54d1666e6c',
    expected: [0.0, 0.0, 0.0, 0.0],
  },
  {
    probe: 'compound-additive-grouping-v1.pine',
    attempt: 2,
    column: 'udf_plain',
    sourceSha256: '58150e75dd6ced3e5320eceb78fd7186b54db89fcae8801a751d0b4a05eb8596',
    captureSha256: '758a22e0f86d8c86f38ca076eeccccf56bc6ae96c2153c95cc716f54d1666e6c',
    expected: [0.0, 0.0, 0.0, 0.0],
  },
  {
    probe: 'compound-operator-association-pine-v5-v1.pine',
    attempt: 1,
    column: 'add_grouped',
    sourceSha256: 'c46298afc7724a0cb2c2d856b8c08c48196f57379912fb7d03927456dde8ff46',
    captureSha256: '7021bc3fd76173874da847fc3dd9d324143a238077839a35191a2222a3ea476b',
    expected: [1.0, -1.0, 1.0, -1.0],
  },
  {
    probe: 'compound-operator-association-pine-v5-v1.pine',
    attempt: 1,
    column: 'add_two_subtractions',
    sourceSha256: 'c46298afc7724a0cb2c2d856b8c08c48196f57379912fb7d03927456dde8ff46',
    captureSha256: '7021bc3fd76173874da847fc3dd9d324143a238077839a35191a2222a3ea476b',
    expected: [2.0, -2.0, 2.0, -2.0],
  },
  {
    probe: 'compound-operator-association-pine-v5-v1.pine',
    attempt: 1,
    column: 'add_grouped_control',
    sourceSha256: 'c46298afc7724a0cb2c2d856b8c08c48196f57379912fb7d03927456dde8ff46',
    captureSha256: '7021bc3fd76173874da847fc3dd9d324143a238077839a35191a2222a3ea476b',
    expected: [1.0, -1.0, 1.0, -1.0],
  },
  {
    probe: 'compound-operator-association-pine-v6-v1.pine',
    attempt: 1,
    column: 'add_grouped',
    sourceSha256: '53fe243fb89dba8831789ea290ba9977b25532749053ddccf492cc8c4107e737',
    captureSha256: '97aee3f1fcf701c5375599e54a8414038e6df544ed9dc1a4c525b7a7e5b3d3e1',
    expected: [1.0, -1.0, 1.0, -1.0],
  },
  {
    probe: 'compound-operator-association-pine-v6-v1.pine',
    attempt: 1,
    column: 'add_two_subtractions',
    sourceSha256: '53fe243fb89dba8831789ea290ba9977b25532749053ddccf492cc8c4107e737',
    captureSha256: '97aee3f1fcf701c5375599e54a8414038e6df544ed9dc1a4c525b7a7e5b3d3e1',
    expected: [2.0, -2.0, 2.0, -2.0],
  },
  {
    probe: 'compound-operator-association-pine-v6-v1.pine',
    attempt: 1,
    column: 'add_grouped_control',
    sourceSha256: '53fe243fb89dba8831789ea290ba9977b25532749053ddccf492cc8c4107e737',
    captureSha256: '97aee3f1fcf701c5375599e54a8414038e6df544ed9dc1a4c525b7a7e5b3d3e1',
    expected: [1.0, -1.0, 1.0, -1.0],
  },
] as const;
const bars = [
  {
    time: 1788134400000,
    open: 77682.0,
    high: 77682.01,
    low: 77572.0,
    close: 77674.04,
    volume: 100,
  },
  {
    time: 1788134520000,
    open: 77674.5,
    high: 77780.34,
    low: 77646.0,
    close: 77758.24,
    volume: 100,
  },
  {
    time: 1788134640000,
    open: 77758.24,
    high: 77827.99,
    low: 77724.0,
    close: 77740.01,
    volume: 100,
  },
  {
    time: 1788134760000,
    open: 77740.01,
    high: 77751.37,
    low: 77490.0,
    close: 77508.86,
    volume: 100,
  },
];

describe('native additive association v5 capture cases', () => {
  const outputs = new Map<string, ReturnType<typeof executeScript>>();
  beforeAll(() => {
    for (const probe of new Set(cases.map((item) => item.probe))) {
      const source = fs.readFileSync(new URL(`../../oracle-probes/v5/${probe}`, import.meta.url), 'utf8');
      const expectedHash = cases.find((item) => item.probe === probe)!.sourceSha256;
      expect(createHash('sha256').update(source).digest('hex')).toBe(expectedHash);
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      outputs.set(probe, executeScript(ast, bars));
    }
  });
  for (const item of cases) {
    it(`${item.probe} attempt${item.attempt} ${item.column} [CSV ${item.captureSha256}]`, () => {
      const result = outputs.get(item.probe)!;
      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === item.column)?.values).toEqual(item.expected);
    });
  }
});
