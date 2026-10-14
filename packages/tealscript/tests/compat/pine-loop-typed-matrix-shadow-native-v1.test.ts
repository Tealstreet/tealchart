import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { tryCompile } from '../../src/runtime/codegen/execute';

it('v58 g04 typed matrix for-body declaration matches the complete native warning list', () => {
  const source = readFileSync(new URL('../../oracle-probes/v58/captures/v58/consumers/g04-v6-matrix-for-shadow-int-float-int-first-typed/default/attempt-v1/executed-v1.pine', import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe('a64c4b11f7d55a9e4b2a4bb619426823fc464a669549067cabf1e60929459352');
  const observationText = readFileSync(new URL('../../oracle-probes/v58/captures/v58/consumers/g04-v6-matrix-for-shadow-int-float-int-first-typed/default/attempt-v1/observation-v2.json', import.meta.url), 'utf8');
  expect(createHash('sha256').update(observationText).digest('hex')).toBe('47b1f3daec2af4622fa10583eb608011d4b09c8b4d001f72d53e7edb699598ce');
  const observation = JSON.parse(observationText) as {
    status: string; executedSource: string; executedSha256: string;
    markers: { message: string; severity: number; startLineNumber: number; startColumn: number; code: string }[];
  };
  expect(observation.status).toBe('RUNS');
  expect(observation.executedSource).toBe(source);
  expect(observation.executedSha256).toBe(createHash('sha256').update(source).digest('hex'));
  const nativeList = observation.markers.map(({ message, severity, startLineNumber, startColumn, code }) => ({
    message, severity: severity === 4 ? 'warning' : 'error', line: startLineNumber, column: startColumn, nativeCode: code,
  }));
  const semantic = checkProgram(parse(source));
  expect(semantic.diagnostics.map(({message, line, column, severity, nativeCode}) => ({message, line, column, severity, nativeCode}))).toEqual([{
    message: 'Shadowing variable "copied" which exists in parent scope. Did you want to use the ":=" operator instead of "=" ?',
    line: 8,
    column: 9,
    severity: 'warning',
    nativeCode: 'CW10013',
  }]);
  expect(semantic.diagnostics.map(({message, line, column, severity, nativeCode}) => ({message, line, column, severity, nativeCode}))).toEqual(nativeList);
  expect(tryCompile(parse(source)).success).toBe(true);
});

it("typed array loop-shadow route retains parent diagnostics", () => {
  const source = "//@version=6\nindicator(\"Typed array shadow boundary\")\nscore(array<int> xs) => 10\nscore(array<float> xs) => 20\nrelay(array<int> xs, array<float> ys) =>\n    copied = ys\n    for i = 0 to 1\n        copied = xs\n        score(copied)\nplot(relay(array.new<int>(1,3),array.new<float>(1,3)))";
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  expect(tryCompile(parse(source)).success).toBe(true);
});

it("typed map loop-shadow route retains parent diagnostics", () => {
  const source = "//@version=6\nindicator(\"Typed map shadow boundary\")\nscore(map<string,int> xs) => 10\nscore(map<string,float> xs) => 20\nrelay(map<string,int> xs, map<string,float> ys) =>\n    copied = ys\n    for i = 0 to 1\n        copied = xs\n        score(copied)\nplot(relay(map.new<string,int>(),map.new<string,float>()))";
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  expect(tryCompile(parse(source)).success).toBe(true);
});

it("captured untyped matrix companion keeps its complete warning list", () => {
  const source = "//@version=6\nindicator(\"G6 adversarial alias\")\nscore(matrix<int> xs) => 10\nscore(matrix<float> xs) => 20\nrelay(xs, ys) =>\n    copied = ys\n    for i = 0 to 1\n        copied = xs\n        score(copied)\nplot(relay(matrix.new<int>(1,1,3),matrix.new<float>(1,1,1.5)))";
  expect(checkProgram(parse(source)).diagnostics.map(({message, line, column, severity, nativeCode}) => ({message, line, column, severity, nativeCode}))).toEqual([{
    message: 'Shadowing variable "copied" which exists in parent scope. Did you want to use the ":=" operator instead of "=" ?',
    line: 8,
    column: 9,
    severity: 'warning',
    nativeCode: 'CW10013',
  }]);
  expect(tryCompile(parse(source)).success).toBe(true);
});
