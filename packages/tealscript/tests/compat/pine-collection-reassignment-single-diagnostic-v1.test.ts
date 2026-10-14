import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { tryCompile } from '../../src/runtime/codegen/execute';

const fixtures = new URL('../../oracle-probes/', import.meta.url);

it("matches complete native list: v60/captures/v60/v60-array-reassign-v6-untyped-v1/attempt-v1", () => {
  const source = readFileSync(new URL("v60/captures/v60/v60-array-reassign-v6-untyped-v1/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("aa5621cd8642e8a553d659d7aacd026fa38ce184fc8c7abdd6e938819ac726d2");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"array<int>\" type to the \"copied\" variable. The variable is declared with the \"array<float>\" type.",
    "line": 7,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
  expect(tryCompile(parse(source)).success).toBe(false);
});

it("matches complete native list: v60/captures/v60/v60-map-reassign-v6-untyped-v1/attempt-v1", () => {
  const source = readFileSync(new URL("v60/captures/v60/v60-map-reassign-v6-untyped-v1/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("9109e6bc99b89a545cadd06771c969fc7e134e3e98b789f508cbea7100e9001b");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"map<string, int>\" type to the \"copied\" variable. The variable is declared with the \"map<string, float>\" type.",
    "line": 7,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
  expect(tryCompile(parse(source)).success).toBe(false);
});

it("matches complete native list: v64/captures/v64/v61-array-reassign-var-natural-v2/attempt-v1", () => {
  const source = readFileSync(new URL("v64/captures/v64/v61-array-reassign-var-natural-v2/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("0d170ef2f4bf5a86c341c20e16734c14c50d071db821108610a94ddcc4255f66");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"array<int>\" type to the \"copied\" variable. The variable is declared with the \"array<float>\" type.",
    "line": 5,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
});

it("matches complete native list: v64/captures/v64/v61-array-reassign-varip-natural-v2/attempt-v1", () => {
  const source = readFileSync(new URL("v64/captures/v64/v61-array-reassign-varip-natural-v2/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("1e93de566b05d572e09b163868ff9418babeea701a0180a28fb3f579313ffeb9");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"array<int>\" type to the \"copied\" variable. The variable is declared with the \"array<float>\" type.",
    "line": 5,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
});

it("matches complete native list: v64/captures/v64/v61-map-reassign-var-natural-v2/attempt-v1", () => {
  const source = readFileSync(new URL("v64/captures/v64/v61-map-reassign-var-natural-v2/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("194f9353775a139206c8be36d361199333c73c6494a798c9b26e20c97622d9d6");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"map<string, int>\" type to the \"copied\" variable. The variable is declared with the \"map<string, float>\" type.",
    "line": 5,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
});

it("matches complete native list: v64/captures/v64/v61-map-reassign-varip-natural-v2/attempt-v1", () => {
  const source = readFileSync(new URL("v64/captures/v64/v61-map-reassign-varip-natural-v2/attempt-v1/executed-v1.pine", fixtures), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe("aae229d2b711ce234dca82b8275dbed92a4198992810ca31f6a74024bb7ad0c4");
  const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
  expect(errors.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual([
  {
    "message": "Cannot assign a value of the \"map<string, int>\" type to the \"copied\" variable. The variable is declared with the \"map<string, float>\" type.",
    "line": 5,
    "column": 5,
    "severity": "error",
    "nativeCode": "CE10173"
  }
]);
});


it('retains compiler refusal with one primary diagnostic for an incompatible inherited alias', () => {
  const source = `//@version=6
indicator("Inherited alias refusal")
score(array<int> xs) => 10
score(array<float> xs) => 20
relay(xs, ys) =>
    copied = xs
    copied := ys
    score(copied)
plot(relay(array.new<int>(1,3),array.new<bool>(1,false)))`;
  const errors = checkProgram(parse(source)).diagnostics.filter(({ severity }) => severity === 'error');
  expect(errors).toEqual([{
    code: 'type-mismatch',
    message: 'Cannot assign a value of the "array<bool>" type to the "copied" variable. The variable is declared with the "array<int>" type.',
    severity: 'error',
    line: 7,
    column: 5,
  }]);
  expect(tryCompile(parse(source)).success).toBe(false);
});

 it('fresh local collection with an unrelated scalar parameter keeps parent admission', () => {
  const source = `//@version=6
indicator("Non-alias carrier boundary")
score(array<int> xs) => 10
score(array<float> xs) => 20
relay(tag) =>
    copied = array.new<int>(1,3)
    copied := array.new<bool>(1,false)
    score(copied) + tag
plot(relay(1))`;
  const semantic = checkProgram(parse(source));
  expect(semantic.inheritedCollectionAssignmentFailures ?? []).toEqual([]);
  expect(tryCompile(parse(source)).success).toBe(true);
 });
