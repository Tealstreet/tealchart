import type { Program } from '../../src/parser';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { checkProgram } from '../../src/semantic/checker';

const consumers = [
  'v5-direct-int-first-function-v1',
  'v5-direct-int-first-method-v1',
  'v5-direct-float-first-function-v1',
  'v5-direct-float-first-method-v1',
  'v6-direct-int-first-function-v1',
  'v6-direct-int-first-method-v1',
  'v6-direct-float-first-function-v1',
  'v6-direct-float-first-method-v1',
  'v5-direct-array-int-first-untyped-v1',
  'v5-direct-array-int-first-typed-v1',
  'v5-direct-array-float-first-untyped-v1',
  'v5-direct-array-float-first-typed-v1',
  'v5-direct-matrix-int-first-untyped-v1',
  'v5-direct-matrix-int-first-typed-v1',
  'v5-direct-matrix-float-first-untyped-v1',
  'v5-direct-matrix-float-first-typed-v1',
  'v5-direct-map-int-first-untyped-v1',
  'v5-direct-map-int-first-typed-v1',
  'v5-direct-map-float-first-untyped-v1',
  'v5-direct-map-float-first-typed-v1',
  'v6-direct-array-int-first-untyped-v1',
  'v6-direct-array-int-first-typed-v1',
  'v6-direct-array-float-first-untyped-v1',
  'v6-direct-array-float-first-typed-v1',
  'v6-direct-matrix-int-first-untyped-v1',
  'v6-direct-matrix-int-first-typed-v1',
  'v6-direct-matrix-float-first-untyped-v1',
  'v6-direct-matrix-float-first-typed-v1',
  'v6-direct-map-int-first-untyped-v1',
  'v6-direct-map-int-first-typed-v1',
  'v6-direct-map-float-first-untyped-v1',
  'v6-direct-map-float-first-typed-v1',
  'v5-direct-array-int-first-untyped',
  'v5-direct-array-int-first-typed',
  'v5-direct-array-float-first-untyped',
  'v5-direct-array-float-first-typed',
  'v5-direct-matrix-int-first-untyped',
  'v5-direct-matrix-int-first-typed',
  'v5-direct-matrix-float-first-untyped',
  'v5-direct-matrix-float-first-typed',
  'v5-direct-map-int-first-untyped',
  'v5-direct-map-int-first-typed',
  'v5-direct-map-float-first-untyped',
  'v5-direct-map-float-first-typed',
  'v6-direct-array-int-first-untyped',
  'v6-direct-array-int-first-typed',
  'v6-direct-array-float-first-untyped',
  'v6-direct-array-float-first-typed',
  'v6-direct-matrix-int-first-untyped',
  'v6-direct-matrix-int-first-typed',
  'v6-direct-matrix-float-first-untyped',
  'v6-direct-matrix-float-first-typed',
  'v6-direct-map-int-first-untyped',
  'v6-direct-map-int-first-typed',
  'v6-direct-map-float-first-untyped',
  'v6-direct-map-float-first-typed',
  'v5-direct-array-int-first-untyped-var',
  'v5-direct-array-int-first-typed-var',
  'v5-direct-array-float-first-untyped-var',
  'v5-direct-array-float-first-typed-var',
  'v5-direct-matrix-int-first-untyped-var',
  'v5-direct-matrix-int-first-typed-var',
  'v5-direct-matrix-float-first-untyped-var',
  'v5-direct-matrix-float-first-typed-var',
  'v5-direct-map-int-first-untyped-var',
  'v5-direct-map-int-first-typed-var',
  'v5-direct-map-float-first-untyped-var',
  'v5-direct-map-float-first-typed-var',
  'v6-direct-array-int-first-untyped-var',
  'v6-direct-array-int-first-typed-var',
  'v6-direct-array-float-first-untyped-var',
  'v6-direct-array-float-first-typed-var',
  'v6-direct-matrix-int-first-untyped-var',
  'v6-direct-matrix-int-first-typed-var',
  'v6-direct-matrix-float-first-untyped-var',
  'v6-direct-matrix-float-first-typed-var',
  'v6-direct-map-int-first-untyped-var',
  'v6-direct-map-int-first-typed-var',
  'v6-direct-map-float-first-untyped-var',
  'v6-direct-map-float-first-typed-var',
];
type NativeMarker = { severity: number; message: string; startLineNumber: number; startColumn: number };
type NativeObservation = {
  status: string;
  nativeCompilationObserved: boolean;
  executedSource: string;
  executedSha256: string;
  markers: NativeMarker[];
};
const cases = consumers.map((consumer) => {
  const root = new URL(
    `../../oracle-probes/v58/captures/v58/consumers/${consumer}/default/attempt-v1/`,
    import.meta.url,
  );
  const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
  const observation = JSON.parse(readFileSync(new URL('observation-v1.json', root), 'utf8')) as NativeObservation;
  return { consumer, source, observation };
});

describe('native direct all-call bracket tuple refusals', () => {
  for (const { consumer, source, observation } of cases) {
    it(consumer + ' parser', () => {
      expect(observation.status).toBe('COMPILE-ERROR');
      expect(observation.nativeCompilationObserved).toBe(true);
      expect(source).toBe(observation.executedSource);
      expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
      const markers = observation.markers.filter((marker) => marker.severity === 8);
      expect(markers.length).toBeGreaterThan(0);
      const marker = markers[0];
      expect(marker.message).toContain('Syntax error at input');
      expect(
        markers.every(
          (value) =>
            value.message === marker.message &&
            value.startLineNumber === marker.startLineNumber &&
            value.startColumn === marker.startColumn,
        ),
      ).toBe(true);
      expect(() => parse(source)).toThrow(marker.message);
      try {
        parse(source);
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        expect((error as TealscriptParseError).location.start).toMatchObject({
          line: marker.startLineNumber,
          column: marker.startColumn,
        });
      }
    });
    it(consumer + ' checker', () => {
      const version = source.includes('version=5') ? 5 : 6;
      const ast = generated.parse(source, { pineVersion: version }) as Program;
      const marker = observation.markers.find((value) => value.severity === 8)!;
      expect(checkProgram(ast).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'tuple-literal-initializer', message: marker.message, severity: 'error' }),
        ]),
      );
    });
  }
  for (const v of [5, 6])
    for (const family of ['array', 'matrix', 'map'])
      it('valid generic tuple-return ' + v + family, () => {
        const constructor =
          family === 'map'
            ? 'map.new<string,int>()'
            : family === 'matrix'
              ? 'matrix.new<int>(1,1,0)'
              : 'array.new<int>(1,0)';
        const ast = parse(
          '//@version=' +
            v +
            '\nindicator("Valid generic")\npair() => [' +
            constructor +
            ',' +
            constructor +
            ']\n[x,y]=pair()\nplot(1)',
        );
        expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      });
});

describe('v60 observed direct tuple RHS refusals', () => {
  for (const v of [5, 6])
    for (const rhs of ['[1,2]', '[array.size(array.new<int>(1,0)),2]'])
      it(v + rhs, () => {
        // v60 tuple-rhs-literal/mixed-v5/v6 observations refuse the opening bracket.
        expect(() => parse('//@version=' + v + '\nindicator("Unobserved shape")\n[x,y]=' + rhs + '\nplot(x)')).toThrow(
          v === 6 ? 'Syntax error at input "["' : "Syntax error at input '['",
        );
      });
});
