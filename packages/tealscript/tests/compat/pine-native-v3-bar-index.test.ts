import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';

// v4 outcomes-v4: trace-bgcolor-offset-v3 series/zero attempts pin the native diagnostic.
// Native v4 evidence: exact v3 sources fail on undeclared bar_index;
// that refusal does not settle the masked bgcolor offset question.
describe('native v3 bar_index availability', () => {
  for (const name of ['trace-bgcolor-offset-v3-series', 'trace-bgcolor-offset-v3-zero-control']) {
    it(`rejects the exact native-refused ${name} source`, () => {
      const source = readFileSync(new URL(`./fixtures/native-v4-errors/${name}.pine`, import.meta.url), 'utf8');
      const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'unknown-identifier', message: 'Undeclared identifier `bar_index`;', line: 3 }),
      );
      // Native v4/captures/v4/outcomes-v4.json: both trace-bgcolor-offset-v3 sources, attempt 1.
      // Primary bar_index columns remain a separate hold; dependent-symbol sites are exact.
      expect(errors.map(({ code, message, severity, line, column, nativeCode }) => ({
        code, message, severity, line, nativeCode,
        ...(message.includes('`bar_index`') ? {} : { column }),
      }))).toEqual(
        JSON.parse(readFileSync(new URL('../../oracle-probes/v4/captures/v4/outcomes-v4.json', import.meta.url), 'utf8'))
          .find((outcome: { script: string; attempt: number }) => outcome.script === `${name}.pine` && outcome.attempt === 1)
          .native_editor_markers.filter((marker: { severity: number }) => marker.severity === 8)
          .map((marker: { message: string; startLineNumber: number; startColumn: number; code?: string }) => ({
            code: 'unknown-identifier', message: marker.message, severity: 'error', line: marker.startLineNumber,
            nativeCode: marker.code ?? undefined,
            ...(marker.message.includes('`bar_index`') ? {} : { column: marker.startColumn }),
          })),
      );
    });
    it(`refuses unchecked compilation of ${name}`, () => {
      const source = readFileSync(new URL(`./fixtures/native-v4-errors/${name}.pine`, import.meta.url), 'utf8');
      const result = compile(parse(source));
      expect(result.success).toBe(false);
      expect(result.unsupported).toContain('Undeclared identifier `bar_index`;');
    });
  }

  for (const [name, source] of [
    ['v3 legacy n', '//@version=3\nstudy("n")\nplot(n)'],
    ['v3 local bar_index', '//@version=3\nstudy("local")\nbar_index = 7\nplot(bar_index)'],
    ['v3 parameter bar_index', '//@version=3\nstudy("parameter")\nf(bar_index) => bar_index + 1\nplot(f(7))'],
    ['v4 builtin bar_index', '//@version=4\nstudy("index")\nplot(bar_index)'],
    ['v5 builtin bar_index', '//@version=5\nindicator("index")\nplot(bar_index)'],
    ['v6 builtin bar_index', '//@version=6\nindicator("index")\nplot(bar_index)'],
  ]) {
    it(`retains ${name}`, () => {
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(compile(parse(source)).success).toBe(true);
    });
  }
});
