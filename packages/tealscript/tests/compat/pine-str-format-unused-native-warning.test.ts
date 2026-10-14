import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const sourcePath = 'v2/outcome-only/conflicts-batch-23-v1.pine';
const source = readFileSync(new URL(`../../oracle-probes/${sourcePath}`, import.meta.url), 'utf8');
const captured = JSON.parse(readFileSync(new URL('../../oracle-probes/v2/captures/v2/outcomes-v2.json', import.meta.url), 'utf8'));
const outcome = captured.outcomes.find((entry: { probe: string; attempt: number }) => entry.probe === 'conflicts-batch-23-v1.pine' && entry.attempt === 1);

// Authority: v2 conflicts-batch-23 attempt1 compiler_markers, CW10023.
// Runtime unmatched-brace behavior is separate from this compile warning.
describe('captured str.format unused value warning', () => {
  it('matches the complete native warning list on the unchanged source', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe('0e4cf9d693b660fcdb131928882e186f990d6705e1b59bf1e71e817828ace262');
    const expected = outcome.runtime.error.compiler_markers.map((marker: { code: string; message: string; startLineNumber: number; startColumn: number }) => ({
      code: marker.code, message: marker.message, severity: 'warning', line: marker.startLineNumber, column: marker.startColumn,
    }));
    expect(expected).toHaveLength(1);
    expect(checkProgram(parse(source)).diagnostics.map(({ nativeCode, code, ...diagnostic }) => ({ ...diagnostic, code: nativeCode ?? code }))).toEqual(expected);
  });

  it.each([
    ['valid number pattern', '//@version=6\nindicator("control")\nplot(str.length(str.format("{0,number,#.#}",1.34)))'],
    ['literal pattern without a value', '//@version=6\nindicator("control")\nplot(str.length(str.format("{0,number,#.#)")))'],
    ['different malformed pattern', '//@version=6\nindicator("control")\nplot(str.length(str.format("ab {0",1.34)))'],
    ['two supplied values', '//@version=6\nindicator("control")\nplot(str.length(str.format("{0,number,#.#)",1.34,2)))'],
    ['named format', '//@version=6\nindicator("control")\nplot(str.length(str.format(format="{0,number,#.#)",arg0=1.34)))'],
    ['v5 pattern', '//@version=5\nindicator("control")\nplot(str.length(str.format("{0,number,#.#)",1.34)))'],
  ])('preserves unwitnessed warning policy: %s', (_label, input) => {
    expect(checkProgram(parse(input)).diagnostics.filter(({ nativeCode }) => nativeCode === 'CW10023')).toEqual([]);
  });
});
