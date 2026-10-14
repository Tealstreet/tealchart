import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const families = [
  'method-cum',
  'method-sma',
  'nested-method-range',
  'nested-method-twice',
  'root-method-range',
  'root-method-twice',
];
const probes = [5, 6].flatMap((version) =>
  ['direct', 'security'].flatMap((context) => families.map((family) => `v${version}-${context}-${family}-omitted`)),
);
const fixture = (path: string) => new URL(`../../oracle-probes/v58/captures/v58/consumers/${path}`, import.meta.url);
const outdated = {
  message: 'Version 5 of Pine Script® is outdated. We recommend using the current version, which is 6.',
  severity: 'warning',
  line: 1,
  column: 3,
  code: 'PINE_VERSION_OUTDATED',
};

interface NativeMarker {
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
  code?: string | null;
}

// Rank4 preserves the parent advisory; its absence in these v5 captures is the separate rank9 root.
describe('captured rejected own-default receiver frontier, census-v4 rank4', () => {
  it.each(probes)('retains only the captured default error and parent advisory: %s', (probe) => {
    const directory = `${probe}/default/attempt-v1/`;
    const source = readFileSync(fixture(`${directory}executed-v1.pine`), 'utf8');
    const observation = JSON.parse(readFileSync(fixture(`${directory}observation-v1.json`), 'utf8')) as {
      executedSource: string;
      executedSha256: string;
      markers: NativeMarker[];
      status: string;
    };
    expect(source).toBe(observation.executedSource);
    expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
    expect(observation.status).toBe('COMPILE-ERROR');
    const native = [
      ...new Map(
        observation.markers.map((marker) => {
          const value = {
            message: marker.message,
            severity: marker.severity === 8 ? 'error' : 'warning',
            line: marker.startLineNumber,
            column: marker.startColumn,
            code: marker.code ?? null,
          };
          return [JSON.stringify(value), value];
        }),
      ).values(),
    ];
    const nativeErrors = native.filter((marker) => marker.severity === 'error');
    expect(nativeErrors).toHaveLength(1);
    for (const marker of native.filter((entry) => entry.severity === 'warning')) expect(marker).toEqual(outdated);
    const actual = checkProgram(parse(source)).diagnostics.map((diagnostic) => ({
      message: diagnostic.message,
      severity: diagnostic.severity,
      line: diagnostic.line,
      column: diagnostic.column,
      code:
        diagnostic.nativeCode ??
        (/^(?:CE|CW)\d+$/.test(diagnostic.code) || diagnostic.code === 'PINE_VERSION_OUTDATED'
          ? diagnostic.code
          : null),
    }));
    expect(actual).toEqual([...(probe.startsWith('v5-') ? [outdated] : []), ...nativeErrors]);
  });
});
