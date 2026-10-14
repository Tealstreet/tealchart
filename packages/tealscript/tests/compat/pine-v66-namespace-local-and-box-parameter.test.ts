import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Observation {
  status: string;
  compilationStatus: string;
  executedSource: string;
  executedSha256: string;
  closedBarCutoff: string | null;
  csv?: { file: string; sha256: string; closedRowCount: number };
  markers: { severity: number; message: string; startLineNumber: number; startColumn: number }[];
}

const cases = [5, 6].flatMap((version) => [
  ...['color', 'label', 'line', 'linefill', 'table'].map((name) => ({
    label: `local ${name} v${version}`,
    round: 'v66',
    prefix: `ns-local-udt-no-call-${name}-v${version}`,
    suffix: 'v1',
    code: 'namespace-obscuring',
    line: 7,
    column: 5,
    value: 17,
  })),
  {
    label: `box handle parameter v${version}`,
    round: 'v62',
    prefix: `ns-param-naming-box-handle-builtin-dot-v${version}`,
    suffix: 'v61-v1',
    code: 'argument-count',
    line: 4,
    column: 5,
    value: 29,
  },
]);

function captured(testCase: (typeof cases)[number], form: string) {
  const probe = `${testCase.prefix}-${form}-${testCase.suffix}`;
  const root = new URL(
    `../../oracle-probes/${testCase.round}/captures/${testCase.round}/${probe}/attempt-v1/`,
    import.meta.url,
  );
  const source = readFileSync(new URL('executed-v1.pine', root), 'utf8');
  const observation = JSON.parse(readFileSync(new URL('observation-v3.json', root), 'utf8')) as Observation;
  expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
  expect(source).toBe(observation.executedSource);
  return { root, source, observation };
}

describe.each(cases)('native namespace boundary $label', (testCase) => {
  it('matches the refusal text and position', () => {
    const { source, observation } = captured(testCase, 'natural');
    expect(observation.status).toBe('COMPILE-ERROR');
    expect(observation.compilationStatus).toBe('REFUSED');
    const marker = observation.markers.find((value) => value.severity === 8)!;
    expect(marker).toBeDefined();
    expect(marker.startLineNumber).toBe(testCase.line);
    expect(marker.startColumn).toBe(testCase.column);
    expect(checkProgram(parse(source)).diagnostics.filter((value) => value.severity === 'error')).toEqual([
      expect.objectContaining({
        code: testCase.code,
        message: marker.message,
        line: marker.startLineNumber,
        column: marker.startColumn,
      }),
    ]);
  });

  it('matches every closed row of the renamed control', () => {
    const { root, source, observation } = captured(testCase, 'renamed-control');
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
    expect(checkProgram(ast).diagnostics.filter((value) => value.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    expect(result?.plots).toHaveLength(1);
    expect(result?.plots[0].values).toEqual(rows.map((row) => Number(row[6])));
    expect(rows.every((row) => row[6] === String(testCase.value))).toBe(true);
  });
});

// Explicit-ID controls bound the captured zero-argument refusal; no native value credit.
describe.each([5, 6])('explicit ID with a namespace-named box parameter v%s', (version) => {
  it.each(['box', 'id=box'])('admits box.get_top(%s)', (argument) => {
    const source = `//@version=${version}
indicator("Explicit box ID control")
f(box box) =>
    box.get_top(${argument})
b = box.new(bar_index,29.0,bar_index+1,1.0)
plot(f(b), "RESULT")
box.delete(b)`;
    const ast = parse(source);
    expect(checkProgram(ast).diagnostics.filter((value) => value.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    const bars: Bar[] = [1, 2, 3].map((time) => ({ time, open: 1, high: 2, low: 1, close: 2, volume: 1 }));
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    expect(result?.plots).toHaveLength(1);
    expect(result?.plots[0].values).toEqual([29, 29, 29]);
  });
});
