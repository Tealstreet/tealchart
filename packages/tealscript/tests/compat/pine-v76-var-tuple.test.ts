import type { Program } from '../../src/parser';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

describe('v76 native tuple persistence modifier refusals', () => {
  for (const version of [5, 6]) {
    for (const modifier of ['var', 'varip']) {
      for (const call of ['function', 'method']) {
        for (const role of ['target', 'control']) {
          const probe = `v76-${modifier}-tuple-${call}-v${version}-be-v1-${role}`;
          const root = new URL(`../../oracle-probes/v76/captures/v76/${probe}/attempt-v1/`, import.meta.url);
          const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
          const observation = JSON.parse(readFileSync(new URL('observation-v3.json', root), 'utf8'));

          it(`${probe} authenticates the exact executed source`, () => {
            expect(observation.executedSource).toBe(source);
            expect(observation.executedSha256).toBe(createHash('sha256').update(source).digest('hex'));
          });
          if (role === 'target') {
            const marker = observation.markers.find((entry: { severity: number }) => entry.severity === 8);
            const line = call === 'function' ? 4 : 7;
            const token = version === 6 ? `""${modifier}""` : `'${modifier}'`;
            const message = `${token} cannot be used as a variable or function name.`;
            it(`${probe} matches native parser text and modifier site`, () => {
              expect(observation.status).toBe('COMPILE-ERROR');
              expect(marker.message).toBe(message);
              expect(marker.startLineNumber).toBe(line);
              expect(marker.startColumn).toBe(1);
              if (version === 6) expect(marker.code).toBe('CE10150');
              else expect(marker.code).toBeUndefined();
              expect(() => parse(source)).toThrow(message);
              try {
                parse(source);
              } catch (error) {
                expect(error).toBeInstanceOf(TealscriptParseError);
                expect((error as TealscriptParseError).location.start).toMatchObject({ line, column: 1 });
              }
            });
            it(`${probe} matches native text/site for an external AST`, () => {
              const ast = generated.parse(source, { pineVersion: version }) as Program;
              expect(checkProgram(ast).diagnostics).toContainEqual(
                expect.objectContaining({
                  code: 'invalid-tuple-declaration',
                  severity: 'error',
                  message,
                  line,
                  column: 1,
                }),
              );
            });
          } else {
            it(`${probe} remains admitted with exact native closed values`, () => {
              expect(observation.status).toBe('RUNS');
              const ast = parse(source);
              expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
              const closed = readFileSync(new URL('native-v1.csv', root), 'utf8')
                .trim()
                .split(/\r?\n/)
                .slice(1)
                .map((row) => row.split(','))
                .filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
              expect(closed).toHaveLength(version === 5 ? 1930 : 1931);
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
                expect(execution.result.plots.map((plot) => plot.title)).toEqual(['A', 'B', 'VALUE']);
                expect(execution.result.plots.map((plot) => plot.values)).toEqual(
                  [6, 7, 8].map((column) => closed.map((row) => Number(row[column]))),
                );
              }
            });
          }
        }
      }
    }
  }

  for (const modifier of ['var', 'varip']) {
    it(`preserves unwitnessed v4 ${modifier} tuple parser admission and prior checker refusal`, () => {
      const source = `//@version=4\nstudy("Legacy tuple")\nf() => [1, 2]\n${modifier} [a, b] = f()\nplot(a)\nplot(b)`;
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
        {
          code: 'invalid-tuple-declaration',
          severity: 'error',
          line: 4,
          column: 1,
          message:
            'Tuple declarations cannot include type, qualifier, or declaration-mode keywords; use [a, b] = expression.',
        },
      ]);
    });
    for (const version of [5, 6]) {
      it(`preserves v${version} scalar ${modifier} declaration`, () => {
        const ast = parse(`//@version=${version}\nindicator("Scalar")\n${modifier} a = 1\nplot(a)`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      });
    }
  }
});
