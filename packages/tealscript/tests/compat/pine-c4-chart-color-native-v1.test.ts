import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const source = readFileSync(new URL('../../oracle-probes/v4/trace-705-chart-fg-solid-background-v1.pine', import.meta.url), 'utf8');
const observations = readFileSync(new URL('../../oracle-probes/v4/captures/v4/outcomes-v4.json', import.meta.url), 'utf8');
const attempts = (JSON.parse(observations) as {
  script: string; attempt: number; source_sha256: string;
  native_editor_markers: { severity: number; message: string; code: string; startLineNumber: number; startColumn: number }[];
}[]).filter(attempt => attempt.script === 'trace-705-chart-fg-solid-background-v1.pine');
const diagnostics = (pine: string) => checkProgram(parse(pine)).diagnostics;

const advisory = (version: string) => version === '5' ? [{
  code: 'PINE_VERSION_OUTDATED', severity: 'warning', line: 1, column: 3,
  message: 'Version 5 of Pine Script® is outdated. We recommend using the current version, which is 6.',
}] : [];

describe('captured chart color tostring refusal details', () => {
  it('authenticates all seven native attempts and their source', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe('c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6');
    expect(createHash('sha256').update(observations).digest('hex')).toBe('23c510ed1486c3c3c7bbba345e6b6696d37236a12fc71cb88c8a08c072db8bd5');
    expect(attempts.map(attempt => attempt.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each(attempts)('whole ordered native error list, attempt $attempt', attempt => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(attempt.source_sha256);
    expect(attempt.native_editor_markers.map(marker => marker.severity)).toEqual([8, 8]);
    expect(diagnostics(source)).toEqual(attempt.native_editor_markers.map(marker => ({
      code: marker.code, message: marker.message, severity: 'error',
      line: marker.startLineNumber, column: marker.startColumn,
    })));
  });

  it.each(['5', '6'])('keeps ordinary accepted inputs unchanged in v%s', version => {
    expect(diagnostics(`//@version=${version}\nindicator("Control")\nplot(str.length(str.tostring(close)))\nplot(str.length(str.tostring(true)))\nplot(str.length(str.tostring("text")))`)).toEqual(advisory(version));
  });

  it.each([
    ['5', 'chart.bg_color', false], ['5', 'chart.fg_color', false],
    ['6', 'color.red', false], ['6', 'chart.bg_color', true], ['6', 'chart.fg_color', true],
  ] as const)('keeps generic refusal v%s %s formatted=%s', (version, value, formatted) => {
    const line = `plot(str.length(str.tostring(${value}${formatted ? ', "#"' : ''})))`;
    expect(diagnostics(`//@version=${version}\nindicator("Control")\n${line}`)).toEqual([...advisory(version), {
      code: 'type-mismatch', message: 'str.tostring value cannot be a color', severity: 'error',
      line: 3, column: line.indexOf(value) + 1,
    }]);
  });
});
