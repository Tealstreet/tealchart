import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Observation {
  status: string;
  executedSha256: string;
  compilationStatus: string;
  closedBarCutoff: string | null;
  csv?: { file: string; sha256: string; closedRowCount: number };
  renderedRuntimeMessages?: string[];
  runtimeDiagnostics?: { ctx: { code: string; bar_index: number }; stack_trace: { n: string; p: number }[] }[];
  markers: { severity: number; message: string; startLineNumber: number; startColumn: number }[];
}

function captured(probe: string) {
  const root = new URL(`../../oracle-probes/v59/captures/v59/${probe}/attempt-v1/`, import.meta.url);
  const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
  const observation = JSON.parse(readFileSync(new URL('observation-v4.json', root), 'utf8')) as Observation;
  expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
  return { root, source, observation };
}

const versions = [5, 6];
const fields = ['array', 'box', 'line', 'label', 'map', 'matrix', 'table'];
const namespaces = [
  'array',
  'box',
  'color',
  'label',
  'line',
  'linefill',
  'map',
  'math',
  'matrix',
  'polyline',
  'str',
  'table',
];
const refused = new Set(['box', 'color', 'label', 'line', 'linefill', 'table']);
const successful = [
  ...fields.map((name) => `udt-${name}-parameter`),
  'udt-renamed-control',
  'array-parameter',
  'array-parameter-renamed-control',
  'array-local',
  'array-local-renamed-control',
  'box-parameter',
  'box-parameter-renamed-control',
  ...namespaces.filter((name) => !refused.has(name)).map((name) => `namespace-call-${name}`),
];

// Native v59 separates field/namespace calls from custom dot calls and box-local admission.
describe.each(versions)('native namespace parameter naming v%s', (version) => {
  it.each(successful)('%s matches every closed native row', (facet) => {
    const { root, source, observation } = captured(`ns-param-naming-${facet}-v${version}-v59-v1`);
    expect(observation.status).toBe('RUNS');
    expect(observation.compilationStatus).toBe('ADMITTED');
    expect(observation.csv).toBeDefined();
    const csv = readFileSync(new URL(observation.csv!.file, root), 'utf8');
    expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv!.sha256);
    const rows = csv
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split(','))
      .filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(rows).toHaveLength(observation.csv!.closedRowCount);
    expect(rows.length).toBeGreaterThan(0);
    const bars: Bar[] = rows.map((row) => ({
      time: Number(row[0]) * 1000,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
    const ast = parse(source);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    expect(result?.plots).toHaveLength(1);
    expect(result?.plots[0].values).toEqual(rows.map((row) => Number(row[6])));
  });

  it.each([...refused])('%s custom dot call matches the native refusal', (name) => {
    const { source, observation } = captured(`ns-param-naming-namespace-call-${name}-v${version}-v59-v1`);
    expect(observation.status).toBe('COMPILE-ERROR');
    const marker = observation.markers.find((value) => value.severity === 8)!;
    expect(marker).toBeDefined();
    const errors = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([
      expect.objectContaining({
        code: 'namespace-method-name',
        message: marker.message,
        line: marker.startLineNumber,
        column: marker.startColumn,
      }),
    ]);
  });

  it.each(['box-local', 'box-local-renamed-control'])(
    '%s matches the historical-coordinate runtime boundary',
    (facet) => {
      const { source, observation } = captured(`ns-param-naming-${facet}-v${version}-v59-v1`);
      expect(observation.status).toBe('RUNTIME-ERROR');
      expect(observation.compilationStatus).toBe('ADMITTED');
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
        [],
      );
      const compiled = tryCompile(parse(source));
      expect(compiled.success).toBe(true);
      const bars: Bar[] = Array.from({ length: 10002 }, (_, index) => ({
        time: 1_700_000_000_000 + index * 60_000,
        open: 1,
        high: 2,
        low: 0,
        close: 1,
        volume: 1,
      }));
      const result = executeCompiled(compiled, bars);
      const native = observation.runtimeDiagnostics![0].ctx;
      expect(result?.errors).toEqual([
        expect.objectContaining({
          message: observation.renderedRuntimeMessages![0],
          code: native.code,
          barIndex: native.bar_index,
          line: observation.runtimeDiagnostics![0].stack_trace[0].p,
          runtimeError: expect.objectContaining({ stackTrace: observation.runtimeDiagnostics![0].stack_trace }),
        }),
      ]);
      expect(result?.profile.swallowedErrors ?? []).toEqual([]);
      expect(result?.plots[0].values).toHaveLength(10001);
      expect(result?.plots[0].values.every((value) => value === 29)).toBe(true);
    },
  );

  it.each([...refused])('%s renamed receiver remains callable (regression control)', (name) => {
    const { source } = captured(`ns-param-naming-namespace-call-${name}-v${version}-v59-v1`);
    const renamed = source.replace(`Holder ${name}`, 'Holder holder').replace(`${name}.w0Value`, 'holder.w0Value');
    const ast = parse(renamed);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    const bars: Bar[] = [0, 1, 2].map((index) => ({
      time: 1_700_000_000_000 + index * 120_000,
      open: 1,
      high: 2,
      low: 1,
      close: 2,
      volume: 10,
    }));
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual([41, 41, 41]);
  });
});
