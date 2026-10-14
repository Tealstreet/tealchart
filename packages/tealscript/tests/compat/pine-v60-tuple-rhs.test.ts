import type { Program } from '../../src/parser';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const probes = [
  'tuple-rhs-literal-v5-v60-v1',
  'tuple-rhs-mixed-v5-v60-v1',
  'tuple-rhs-literal-v6-v60-v1',
  'tuple-rhs-mixed-v6-v60-v1',
];
describe('v60 native numeric and mixed-call tuple RHS refusals', () => {
  for (const probe of probes) {
    const root = new URL('../../oracle-probes/v60/captures/v60/' + probe + '/attempt-v1/', import.meta.url);
    const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
    const observation = JSON.parse(readFileSync(new URL('observation-v4.json', root), 'utf8'));
    const marker = observation.markers.find((m: { severity: number }) => m.severity === 8);
    it(probe + ' parser matches native opening bracket', () => {
      expect(observation.status).toBe('COMPILE-ERROR');
      expect(observation.executedSource).toBe(source);
      expect(observation.executedSha256).toBe(createHash('sha256').update(source).digest('hex'));
      expect(marker.startLineNumber).toBe(3);
      expect(marker.startColumn).toBe(7);
      if (probe.includes('-v6-')) expect(marker.code).toBe('CE10156');
      expect(() => parse(source)).toThrow(marker.message);
      try {
        parse(source);
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        expect((error as TealscriptParseError).location.start).toMatchObject({ line: 3, column: 7 });
      }
    });
    it(probe + ' external AST checker refuses', () => {
      const ast = generated.parse(source, { pineVersion: probe.includes('-v5-') ? 5 : 6 }) as Program;
      expect(checkProgram(ast).diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'tuple-literal-initializer',
          message: marker.message,
          severity: 'error',
        }),
      );
    });
  }
  for (const version of [5, 6])
    for (const rhs of ['[1,2]', '[array.size(array.new<int>(1,0)),2]']) {
      it(version + rhs + ' function tuple return remains valid', () => {
        const ast = parse(
          '//@version=' + version + '\nindicator("Valid pair")\npair() => ' + rhs + '\n[x,y]=pair()\nplot(x)\nplot(y)',
        );
        expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        const execution = executeCompiledScript(ast, [
          { time: Date.UTC(2026, 0, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        ]);
        expect(execution.status).toBe('success');
        if (execution.status === 'success') {
          expect(execution.result.errors).toEqual([]);
          expect(execution.result.plots.map((p) => p.values)).toEqual([[1], [2]]);
        }
      });
    }
});
