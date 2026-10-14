import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const entries = [
  {
    "attempt": "v58/captures/v58/consumers/default-presence-overload-explicit-v1/default/attempt-v1",
    "sha256": "42e5bfc483cee4d19f25b252945324d1d2a42f80088b83d40b1e0b6a0850197c"
  },
  {
    "attempt": "v58/captures/v58/consumers/default-presence-overload-omitted-v1/default/attempt-v1",
    "sha256": "918380e2e81542281854d2145ae78cf89eb7a34fe9f04cb9496b9c7109be3c23"
  },
  {
    "attempt": "v58/captures/v58/consumers/parameter-reference-explicit-v1/default/attempt-v1",
    "sha256": "e967d49f3257d8b6ebb69e0f2e85375d9a81e525dabc779901994e0ec3edf64d"
  },
  {
    "attempt": "v58/captures/v58/consumers/parameter-reference-omitted-v1/default/attempt-v1",
    "sha256": "7eaf2fee8d1523765a0f3cafbaa438037a5b3194b28ac2c8809e9261c53df676"
  }
] as const;

type NativeMarker = { message: string; severity: number; startLineNumber: number; startColumn: number; code?: string };
const normalize = (marker: NativeMarker) => ({
  message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
  line: marker.startLineNumber, column: marker.startColumn, nativeCode: marker.code ?? null,
});
const diagnostics = (source: string) => checkProgram(parse(source)).diagnostics;
const sourceFor = (id: string) => fixture(`${entries.find(({ attempt }) => attempt.includes(id))!.attempt}/executed-v1.pine`);

describe('v58 default-expression secondary frontiers', () => {
  it.each(entries)('$attempt', ({ attempt, sha256 }) => {
    const source = fixture(`${attempt}/executed-v1.pine`);
    const observation = JSON.parse(fixture(`${attempt}/observation-v1.json`));
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
    expect(observation.executedSha256).toBe(sha256);
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('COMPILE-ERROR');
    const expected = (observation.markers as NativeMarker[]).map(normalize)
      .filter((marker, index, list) => list.findIndex((prior) => JSON.stringify(prior) === JSON.stringify(marker)) === index);
    expect(expected).toHaveLength(1);
    expect(diagnostics(source).map(({ message, severity, line, column, nativeCode }) => ({
      message, severity, line, column, nativeCode: nativeCode ?? null,
    }))).toEqual(expected);
  });

  // Uncaptured neighboring shapes preserve their parent diagnostics; these are regression controls.
  it('keeps unresolved parameter references without an overloaded-method dependency', () => {
    const source = '//@version=6\nindicator("control")\nread(float a=2,float b=a+close)=>b\nplot(read())';
    expect(diagnostics(source).map(({ code }) => code)).toEqual(['invalid-parameter-default', 'unknown-identifier']);
  });

  it('keeps duplicate overload errors without a conflicting method dependency', () => {
    const source = '//@version=6\nindicator("control")\nseed()=>close\nread(float a)=>a\nread(float a,float b=seed())=>a+b\nplot(read(2))';
    expect(diagnostics(source).map(({ code }) => code)).toEqual(['invalid-parameter-default', 'ambiguous-call', 'invalid-overload']);
  });

  it('keeps the v5 parameter-reference frontier unchanged', () => {
    const source = sourceFor('parameter-reference-explicit').replace('//@version=6', '//@version=5');
    expect(diagnostics(source).map(({ code }) => code)).toEqual([
      'PINE_VERSION_OUTDATED', 'overload-global-variable', 'invalid-parameter-default', 'unknown-identifier',
    ]);
  });

  it('keeps the v5 default-presence overload frontier unchanged', () => {
    const source = sourceFor('default-presence-overload-omitted').replace('//@version=6', '//@version=5');
    expect(diagnostics(source).map(({ code }) => code)).toEqual([
      'PINE_VERSION_OUTDATED', 'invalid-parameter-default', 'ambiguous-call', 'invalid-overload',
    ]);
  });

  it('keeps an unrelated overloaded-method global error', () => {
    const source = sourceFor('parameter-reference-explicit')
      + '\nmethod unrelated(int self)=>unused\nmethod unrelated(float self)=>self';
    expect(diagnostics(source).filter(({ code }) => code === 'overload-global-variable')
      .map(({ message }) => message)).toEqual([
      'Cannot use global variable "unused" in the local scope of overloaded function "unrelated()"',
    ]);
  });

  it('keeps an unrelated overload declaration and call ambiguity', () => {
    const source = sourceFor('default-presence-overload-omitted')
      + '\nother(float a)=>a\nother(float a,float b=2)=>a+b\nplot(other(2))';
    expect(diagnostics(source).filter(({ code }) => code === 'invalid-overload' || code === 'ambiguous-call')
      .map(({ message }) => message)).toEqual([
      'Ambiguous call to function other: multiple overloads are equally specific',
      'Overloads of other must differ in the number or qualified types of required parameters; names and optional parameters do not distinguish overloads.',
    ]);
  });

  it('retains the third literal-default overload ambiguity at 9:6', () => {
    const source = "//@version=6\nindicator(\"Third optional default frontier\")\nfloat unused=close\nmethod pick(int self)=>unused\nmethod pick(float self)=>self\nread(float a)=>a\nread(float a,float b=close.pick())=>a+b\nread(float a,float c=2)=>a+c\nplot(read(2))\n";
    expect(createHash('sha256').update(source).digest('hex')).toBe("1ae4ba5053353f0cc2c23f62a1f8e5841d6b3ebda329388c5dc36fcd07a7e8d0");
    expect(diagnostics(source).filter(({ code }) => code === 'ambiguous-call')
      .map(({ message, line, column }) => ({ message, line, column }))).toEqual([{
      message: 'Ambiguous call to function read: multiple overloads are equally specific', line: 9, column: 6,
    }]);
    expect(diagnostics(source).filter(({ code }) => code === 'invalid-overload')
      .map(({ line, column }) => ({ line, column }))).toEqual([{ line: 8, column: 1 }]);
  });


  it('retains both written-call ambiguities with a third captured-source overload', () => {
    const source = sourceFor('default-presence-overload-omitted')
      + '\nread(float a,float c=2)=>a+c\nplot(read(2))';
    expect(diagnostics(source).filter(({ code }) => code === 'ambiguous-call')
      .map(({ line, column }) => ({ line, column }))).toEqual([{ line: 14, column: 10 }, { line: 17, column: 6 }]);
  });

  it('retains the independent ambiguity when the literal overload precedes the rejected one', () => {
    const source = "//@version=6\nindicator(\"Third optional default frontier\")\nfloat unused=close\nmethod pick(int self)=>unused\nmethod pick(float self)=>self\nread(float a)=>a\nread(float a,float c=2)=>a+c\nread(float a,float b=close.pick())=>a+b\nplot(read(2))\n";
    expect(diagnostics(source).filter(({ code }) => code === 'ambiguous-call')
      .map(({ line, column }) => ({ line, column }))).toEqual([{ line: 9, column: 6 }]);
  });

  it('retains the two remaining overloads ambiguity without the rejected declaration', () => {
    const source = "//@version=6\nindicator(\"Third optional default frontier\")\nfloat unused=close\nmethod pick(int self)=>unused\nmethod pick(float self)=>self\nread(float a)=>a\nread(float a,float c=2)=>a+c\nplot(read(2))\n";
    expect(diagnostics(source).filter(({ code }) => code === 'ambiguous-call')
      .map(({ line, column }) => ({ line, column }))).toEqual([{ line: 8, column: 6 }]);
  });

});
