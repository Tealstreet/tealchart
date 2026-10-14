import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../compat/sourceStages';
import { parse } from '../parser';
import { executeCompiled, tryCompile } from '../runtime/codegen/execute';
import { checkProgram } from './checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
const program = (body: string, version = 5) => `//@version=${version}\nindicator("Required overload identity")\n${body}\nplot(1)`;

// Native v60 attempt-v1: all three legal-literal forms refuse the second declaration.
describe('v5 ordinary optional-only overload identity', () => {
  it.each(['declaration', 'omitted', 'supplied'])('matches the native %s refusal', (form) => {
    const probe = `optional-only-overloads-v5-${form}-v60-v1`;
    const source = readFileSync(new URL(`../../oracle-probes/v60/${probe}.pine`, import.meta.url), 'utf8');
    const observation = JSON.parse(readFileSync(new URL(`../../oracle-probes/v60/captures/v60/${probe}/attempt-v1/observation-v4.json`, import.meta.url), 'utf8'));
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('COMPILE-ERROR');
    expect(observation.compilationStatus).toBe('REFUSED');
    expect(observation.nativeCompilationObserved).toBe(true);
    expect(errors(source)).toContainEqual(expect.objectContaining({
      code: 'invalid-overload',
      line: observation.markers[0].startLineNumber,
      column: observation.markers[0].startColumn,
      message: observation.markers[0].message,
    }));
    expect(createPineParseSemanticStageOutcomes(source)).toContainEqual(expect.objectContaining({
      stage: 'semantic', status: 'failed',
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'invalid-overload' })]),
    }));
  });

  it.each([
    'read(float a) => a\nread(float a, float b=3.0) => a+b',
    'read(float a, float b=3.0) => a+b\nread(float a) => a',
    'read(float a) => a\nread(float renamed, string text="x") => renamed',
    'read(float a, float b=3.0) => a+b\nread(float a, int b=2) => a+b',
    'read(float a) => a\nread(series float renamed, int b=2) => renamed+b',
    'read() => 1\nread(int extra=2) => extra',
  ])('rejects the shared required signature: %s', (body) => {
    expect(errors(program(body))).toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
    expect(createPineParseSemanticStageOutcomes(program(body))).toContainEqual(expect.objectContaining({
      stage: 'semantic', status: 'failed',
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'invalid-overload' })]),
    }));
  });

  it.each([
    ['required type', 'read(float a) => a\nread(string a, float b=3.0) => str.length(a)+b'],
    ['required count', 'read(float a) => a\nread(float a, float b) => a+b'],
    ['required qualifier', 'read(simple float a) => a\nread(series float a, float b=3.0) => a+b'],
    ['single declaration', 'read(float a, float b=3.0) => a+b'],
    ['collection kind', 'read(array<int> a) => array.size(a)\nread(array<float> a, int b=1) => array.size(a)+b'],
  ])('keeps %s distinct', (_, body) => {
    expect(errors(program(body))).toEqual([]);
    expect(tryCompile(parse(program(body))).success).toBe(true);
  });

  it('keeps the v6 ordinary refusal', () => {
    expect(errors(program('read(float a) => a\nread(float a, float b=3.0) => a+b', 6)))
      .toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
  });

  it('preserves the earlier-version admission', () => {
    expect(errors(program('read(float a) => a\nread(float a, float b=3.0) => a+b', 4))).toEqual([]);
  });
});

// Native v65 distinguishes typed-method refusal from unused untyped-function admission.
describe('v5 optional-only declaration boundaries', () => {
  const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/v65/${path}`, import.meta.url), 'utf8');

  it('matches the typed method refusal at the native declaration site', () => {
    const probe = 'v61-v5-optional-only-typed-method-declaration-g6-v1';
    const source = fixture(`${probe}.pine`);
    const observation = JSON.parse(fixture(`captures/v65/${probe}/attempt-v1/observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('COMPILE-ERROR');
    expect(observation.compilationStatus).toBe('REFUSED');
    expect(observation.markers).toContainEqual(expect.objectContaining({
      message: "The 'read' function has overloads with the same required parameters. The type of required parameters must be different in overloaded versions of functions.",
      startLineNumber: 4, startColumn: 12,
    }));
    expect(errors(source)).toEqual([expect.objectContaining({
      code: 'invalid-overload', line: 4, column: 12, message: observation.markers.find((marker: { severity: number }) => marker.severity === 8).message,
    })]);
    expect(createPineParseSemanticStageOutcomes(source)).toContainEqual(expect.objectContaining({ stage: 'semantic', status: 'failed' }));
  });

  it('preserves unused untyped declarations and every captured closed VALUE', () => {
    const probe = 'v61-v5-optional-only-untyped-function-declaration-g6-v1';
    const source = fixture(`${probe}.pine`);
    const observation = JSON.parse(fixture(`captures/v65/${probe}/attempt-v1/observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('RUNS');
    expect(observation.compilationStatus).toBe('ADMITTED');
    const [header, ...lines] = fixture(`captures/v65/${probe}/attempt-v1/native-v1.csv`).trim().split(/\r?\n/);
    expect(header).toBe('time,open,high,low,close,Volume,VALUE');
    const closed = lines.map(line => line.split(',')).filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(closed).toHaveLength(996);
    const bars = closed.map(([time, open, high, low, close, volume]) => ({ time: Number(time) * 1000, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) }));
    expect(errors(source)).toEqual([]);
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map(plot => plot.values)).toEqual([closed.map(row => Number(row[6]))]);
    expect(closed.every(row => row[6] === '1')).toBe(true);
  });

  it.each([
    'method read(float a) => a\nmethod read(float a, float b=3.0) => a+b',
    'method read(float a, float b=3.0) => a+b\nmethod read(float a) => a',
    'method read(float a) => a\nmethod read(float renamed, string text="x") => renamed',
    'method read(float a, float b=3.0) => a+b\nmethod read(float a, int b=2) => a+b',
    'method read(series float a) => a\nmethod read(series float renamed, int b=2) => renamed+b',
  ])('rejects typed methods sharing required parameters: %s', body => {
    expect(errors(program(body))).toContainEqual(expect.objectContaining({ code: 'invalid-overload', message: expect.stringContaining('same required parameters') }));
  });

  it.each([
    ['required type', 'method read(float a) => a\nmethod read(int a, float b=3.0) => a+b'],
    ['required count', 'method read(float a) => a\nmethod read(float a, float b) => a+b'],
    ['required qualifier', 'method read(simple float a) => a\nmethod read(series float a, float b=3.0) => a+b'],
    ['collection element', 'method read(array<int> a) => array.size(a)\nmethod read(array<float> a, int b=1) => array.size(a)+b'],
    ['single method', 'method read(float a, float b=3.0) => a+b'],
    ['untyped function', 'read(a) => a\nread(a, b=3.0) => a+b'],
    ['partly untyped function', 'read(float a) => a\nread(float a, b=3.0) => a+b'],
  ])('preserves the %s boundary', (_, body) => {
    expect(errors(program(body))).toEqual([]);
    expect(tryCompile(parse(program(body))).success).toBe(true);
  });
});
