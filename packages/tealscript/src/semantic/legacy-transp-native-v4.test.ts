import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

interface Marker {
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
  code?: string | null;
}
interface Capture {
  script: string;
  attempt: number;
  source_sha256: string;
  status: string;
  native_editor_markers: Marker[];
}
const observations = JSON.parse(
  readFileSync(new URL('../../oracle-probes/v4/captures/v4/outcomes-v4.json', import.meta.url), 'utf8'),
) as Capture[];
const names = [3, 4].flatMap((version) =>
  ['series', 'zero-control'].map((suffix) => `trace-bgcolor-offset-v${version}-${suffix}.pine`),
);

describe('captured legacy transp notices, census-v4 rank10', () => {
  it.each(names)('matches the captured transp markers without changing primary errors: %s', (name) => {
    const source = readFileSync(new URL(`../../oracle-probes/v4/${name}`, import.meta.url), 'utf8');
    const capture = observations.find((row) => row.script === name && row.attempt === 1)!;
    expect(capture).toBeDefined();
    expect(createHash('sha256').update(source).digest('hex')).toBe(capture.source_sha256);
    const native = [
      ...new Map(
        capture.native_editor_markers.map((marker) => {
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
    const actual = checkProgram(parse(source)).diagnostics;
    const rendered = actual.map((diagnostic) => ({
      message: diagnostic.message,
      severity: diagnostic.severity,
      line: diagnostic.line,
      column: diagnostic.column,
      code:
        diagnostic.nativeCode ??
        (/^(CE|CW)\d+$/.test(diagnostic.code) || diagnostic.code === 'PINE_VERSION_OUTDATED' ? diagnostic.code : null),
    }));
    if (name.includes('-v4-')) {
      expect(capture.status).toBe('RUNS');
      expect(rendered).toEqual(native);
    } else {
      expect(capture.status).toBe('COMPILE-ERROR');
      expect(native.some((marker) => marker.message.includes('transp'))).toBe(false);
      // v85 repeats these byte-identical sources with one exact Version 3 advisory.
      // v4 dependent errors remain pinned; primary bar_index columns remain held.
      const probe = `v85-${name.replace('.pine', '')}-1x-v1`;
      const observation = JSON.parse(readFileSync(new URL(
        `../../oracle-probes/v85/captures/v85/${probe}/attempt-v1/observation-v2.json`, import.meta.url,
      ), 'utf8')) as { sourceSha256: string; afterSettling: { source: string; markers: Marker[] } };
      expect(observation.sourceSha256).toBe(capture.source_sha256);
      expect(observation.afterSettling.source).toBe(source);
      const advisories = observation.afterSettling.markers.filter((marker) => marker.code === 'PINE_VERSION_OUTDATED');
      expect(advisories).toHaveLength(1);
      expect(rendered).toEqual([
        ...advisories.map((marker) => ({
          message: marker.message, severity: 'warning', line: marker.startLineNumber,
          column: marker.startColumn, code: marker.code,
        })),
        ...native.filter((marker) => marker.severity === 'error').map((marker) => ({
          ...marker,
          column: marker.message.includes('`bar_index`') ? 0 : marker.column,
        })),
      ]);
    }
  });
});
