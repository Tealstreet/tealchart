import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../../src/compat/sourceStages';
import { parse, TealscriptParseError } from '../../src/parser';

const probes = [
  ...[4, 5].flatMap(version => ['bool', 'identifier', 'numeric', 'string'].map(shape => `v${version}-${shape}-tuple-rhs`)),
  'v5-call-tuple-rhs-float-first', 'v5-call-tuple-rhs-int-first', 'v5-mixed-tuple-rhs',
  ...['var', 'varip'].flatMap(kind => ['function', 'method'].map(form => `v5-${kind}-tuple-${form}`)),
];
interface Marker {
  code?: string | { value: string };
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
}
interface Observation {
  status: string;
  executedSource: string;
  executedSourceSha256: string;
  afterSettling: { source: string; markers: Marker[] };
}
const normalize = (marker: Marker) => ({
  code: marker.severity === 8 ? 'parse.error' : typeof marker.code === 'object' ? marker.code.value : marker.code,
  message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
  line: marker.startLineNumber, column: marker.startColumn,
});

describe('v84 advisory-first tuple refusal repetitions', () => {
  it.each(probes)('%s preserves all five complete native lists', probe => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const root = new URL(`../../oracle-probes/v84/captures/v84/v84-${probe}-g6-v1/attempt-v${attempt}/`, import.meta.url);
      const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
      const observation = JSON.parse(readFileSync(new URL('observation-v2.json', root), 'utf8')) as Observation;
      expect(observation.status).toBe('COMPILE-ERROR');
      expect(observation.executedSource).toBe(source);
      expect(observation.afterSettling.source).toBe(source);
      expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSourceSha256);
      expect(observation.afterSettling.markers).toHaveLength(2);
      expect(observation.afterSettling.markers.map(marker => marker.severity)).toEqual([4, 8]);
      expect(observation.afterSettling.markers[1].code).toBeUndefined();
      const diagnostics = observation.afterSettling.markers.map(normalize);
      let error: unknown;
      try { parse(source); } catch (caught) { error = caught; }
      expect(error).toBeInstanceOf(TealscriptParseError);
      const refusal = error as TealscriptParseError;
      expect(refusal.message).toBe(diagnostics[1].message);
      expect(refusal.location.start).toMatchObject({ line: diagnostics[1].line, column: diagnostics[1].column });
      expect(refusal).not.toHaveProperty('nativeCode');
      expect(refusal.diagnostics).toEqual(diagnostics);
      expect(createPineParseSemanticStageOutcomes(source)[0].diagnostics).toEqual(diagnostics);
    }
  });
});
