import type { Program } from '../../src/parser';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = [{ time: Date.UTC(2026, 0, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('v61 native homogeneous tuple RHS refusals', () => {
  for (const shape of ['booleans', 'strings', 'identifiers']) {
    for (const version of [5, 6]) {
      const probe = `tuple-rhs-${shape}-v${version}-v61-v1`;
      const root = new URL(`../../oracle-probes/v61/captures/v61/${probe}/attempt-v1/`, import.meta.url);
      const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
      const observation = JSON.parse(readFileSync(new URL('observation-v3.json', root), 'utf8'));
      const marker = observation.markers.find((entry: { severity: number }) => entry.severity === 8);
      const line = shape === 'identifiers' ? 5 : 3;

      it(`${probe} matches the captured parser message and site`, () => {
        expect(observation.status).toBe('COMPILE-ERROR');
        expect(observation.executedSource).toBe(source);
        expect(observation.executedSha256).toBe(createHash('sha256').update(source).digest('hex'));
        expect(marker.startLineNumber).toBe(line);
        expect(marker.startColumn).toBe(7);
        if (version === 6) expect(marker.code).toBe('CE10156');
        expect(() => parse(source)).toThrow(marker.message);
        try {
          parse(source);
        } catch (error) {
          expect(error).toBeInstanceOf(TealscriptParseError);
          expect((error as TealscriptParseError).location.start).toMatchObject({ line, column: 7 });
        }
      });

      it(`${probe} rejects an external AST at the captured site`, () => {
        const ast = generated.parse(source, { pineVersion: version }) as Program;
        expect(checkProgram(ast).diagnostics).toContainEqual(
          expect.objectContaining({
            code: 'tuple-literal-initializer',
            message: marker.message,
            severity: 'error',
            line,
            column: 7,
          }),
        );
      });

      it(`${probe} preserves a function-returned tuple`, () => {
        const rhs = shape === 'booleans' ? '[true,false]' : shape === 'strings' ? '["a","b"]' : '[a,b]';
        const prefix = shape === 'identifiers' ? 'a=1\nb=2\n' : '';
        const ast = parse(
          `//@version=${version}\nindicator("Tuple return")\n${prefix}pair() => ${rhs}\n[x,y]=pair()\nplot(str.length(str.tostring(x)))\nplot(str.length(str.tostring(y)))`,
        );
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const execution = executeCompiledScript(ast, bars);
        expect(execution.status).toBe('success');
        if (execution.status === 'success') {
          expect(execution.result.errors).toEqual([]);
          expect(execution.result.plots.map((plot) => plot.values)).toEqual(
            shape === 'booleans' ? [[4], [5]] : [[1], [1]],
          );
        }
      });
    }
  }

  for (const version of [5, 6]) {
    for (const rhs of ['[1,"a"]', '[true,1]', '[a,1]', '[array.size(array.new<int>(1,0)),"a"]']) {
      it(`v${version} leaves the unwitnessed mixture ${rhs} admitted`, () => {
        const ast = parse(`//@version=${version}\nindicator("Unwitnessed mixture")\na=1\n[x,y]=${rhs}\nplot(1)`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      });
    }
  }
});
