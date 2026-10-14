import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixtures = new URL('../../oracle-probes/v85/', import.meta.url);
const probes = [
  ['v85-trace-bgcolor-offset-v3-series-1x-v1', '605ab6938f7b6f0940c5300c11f9efe5c6ac710dd5c9d862e1bff02b60f557fe'],
  ['v85-trace-bgcolor-offset-v3-zero-control-1x-v1', '1be260a87df772d3d4e2bb92b0f7cfe4b24043a378b423bf7dfee999ac38ceec'],
  ['v85-v5-direct-method-cum-omitted-1x-v1', '5c19ddbf3a764e42b6c8cdeb159169cee36432ab444031cc90e068e7ce66c76e'],
  ['v85-v5-direct-nested-method-range-omitted-1x-v1', '621a4e69482e49063e44d4427b4f94bebfa08996b036eb9a6813cc304a99e58f'],
] as const;

interface Marker {
  code?: string;
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
}

describe('v85 stable version-header advisory presence', () => {
  it.each(probes)('%s matches all five native editor repetitions', (probe, sourceSha256) => {
    const source = readFileSync(new URL(`${probe}.pine`, fixtures), 'utf8');
    expect(createHash('sha256').update(source).digest('hex')).toBe(sourceSha256);
    const result = checkProgram(parse(source));
    expect(result.diagnostics.some(({ severity }) => severity === 'error')).toBe(true);
    const actual = result.diagnostics.filter(({ code }) => code === 'PINE_VERSION_OUTDATED');
    for (let repetition = 1; repetition <= 5; repetition++) {
      // Authority: v85/captures/v85/<probe>/attempt-v<repetition>/observation-v2.json; presence only.
      const observation = JSON.parse(readFileSync(new URL(
        `captures/v85/${probe}/attempt-v${repetition}/observation-v2.json`, fixtures,
      ), 'utf8')) as {
        sourceSha256: string;
        status: string;
        afterSettling: { source: string; markers: Marker[] };
      };
      expect(observation.sourceSha256).toBe(sourceSha256);
      expect(observation.afterSettling.source).toBe(source);
      expect(observation.status).toBe('COMPILE-ERROR');
      const expected = observation.afterSettling.markers.filter(({ code }) => code === 'PINE_VERSION_OUTDATED');
      expect(expected).toHaveLength(1);
      expect(actual).toEqual(expected.map((marker) => ({
        code: marker.code,
        message: marker.message,
        severity: 'warning',
        line: marker.startLineNumber,
        column: marker.startColumn,
      })));
    }
  });

  it.each([
    ['v4 LF', '//@version=4\n', 1],
    ['v5 LF', '//@version=5\n', 1],
    ['v6 LF', '//@version=6\n', 0],
    ['v1 LF', '//@version=1\n', 0],
    ['v2 LF', '//@version=2\n', 0],
    ['implicit', '', 0],
    ['v3 CRLF', '//@version=3\r\n', 0],
    ['v3 leading line', '\n//@version=3\n', 0],
    ['v3 spaced directive', '// @version=3\n', 0],
  ])('retains the parent header boundary %s', (_name, directive, count) => {
    // Uncaptured directive layouts are regression controls; they receive no native credit.
    const source = `${directive}study("header control")\nplot(close)`;
    expect(checkProgram(parse(source)).diagnostics.filter(({ code }) => code === 'PINE_VERSION_OUTDATED'))
      .toHaveLength(count as number);
  });
});
