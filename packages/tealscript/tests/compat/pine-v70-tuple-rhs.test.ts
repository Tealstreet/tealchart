import type { Program } from '../../src/parser';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

describe('v70 native v4 direct tuple RHS and function controls', () => {
  for (const shape of ['bool', 'string', 'identifier', 'numeric']) {
    for (const form of ['direct', 'function-control']) {
      const probe = `tuple-rhs-${shape}-v4-${form}-be-v1`;
      const root = new URL(`../../oracle-probes/v70/captures/v70/${probe}/attempt-v1/`, import.meta.url);
      const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
      const observation = JSON.parse(readFileSync(new URL('observation-v3.json', root), 'utf8'));

      it(`${probe} authenticates the captured source`, () => {
        expect(observation.executedSource).toBe(source);
        expect(observation.executedSha256).toBe(createHash('sha256').update(source).digest('hex'));
      });

      if (form === 'direct') {
        const marker = observation.markers.find((entry: { severity: number }) => entry.severity === 8);
        it(`${probe} matches the native parser refusal text and site`, () => {
          expect(observation.status).toBe('COMPILE-ERROR');
          expect(marker.message).toBe("Syntax error at input '['.");
          expect(marker.startLineNumber).toBe(5);
          expect(marker.startColumn).toBe(1);
          expect(marker.code).toBeUndefined();
          expect(() => parse(source)).toThrow(marker.message);
          try {
            parse(source);
          } catch (error) {
            expect(error).toBeInstanceOf(TealscriptParseError);
            expect((error as TealscriptParseError).location.start).toMatchObject({ line: 5, column: 1 });
          }
        });
        it(`${probe} matches the native refusal for an external AST`, () => {
          const ast = generated.parse(source, { pineVersion: 4 }) as Program;
          expect(checkProgram(ast).diagnostics).toContainEqual(
            expect.objectContaining({
              code: 'tuple-literal-initializer',
              severity: 'error',
              message: marker.message,
              line: 5,
              column: 1,
            }),
          );
        });
      } else {
        it(`${probe} retains admission and exact closed VALUE cells`, () => {
          expect(observation.status).toBe('RUNS');
          const ast = parse(source);
          expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
          const csv = readFileSync(new URL('native-v1.csv', root), 'utf8')
            .trim()
            .split(/\r?\n/)
            .slice(1)
            .map((line) => line.split(','));
          const closed = csv.filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
          expect(closed).toHaveLength(1786);
          const bars = closed.map((row) => ({
            time: Number(row[0]) * 1000,
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: Number(row[5]),
          }));
          const execution = executeCompiledScript(ast, bars);
          expect(execution.status).toBe('success');
          if (execution.status === 'success') {
            expect(execution.result.errors).toEqual([]);
            expect(execution.result.plots).toHaveLength(1);
            expect(execution.result.plots[0].values).toEqual(closed.map((row) => Number(row[6])));
            expect(execution.result.plots[0].values.every((value) => Object.is(value, 1))).toBe(true);
          }
        });
      }
    }
  }
});
