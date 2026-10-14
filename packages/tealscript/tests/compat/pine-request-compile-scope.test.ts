import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

describe('non-dynamic local request compile refusal', () => {
  it('matches the v4 attempt-1 v5 omitted-option refusal at the request call', () => {
    const source = readFileSync(
      new URL('../../oracle-probes/v4/corpus5-v5-local-request-v1.pine', import.meta.url),
      'utf8',
    );
    const outcomes = JSON.parse(
      readFileSync(new URL('../../oracle-probes/v4/captures/v4/outcomes-v4.json', import.meta.url), 'utf8'),
    ) as {
      script: string;
      attempt: number;
      status: string;
      source_sha256: string;
      diagnostic: { text: string; line: number; column: number; code: null };
    }[];
    const native = outcomes.find(
      (attempt) => attempt.script === 'corpus5-v5-local-request-v1.pine' && attempt.attempt === 1,
    )!;
    expect(native.status).toBe('COMPILE-ERROR');
    expect(createHash('sha256').update(source).digest('hex')).toBe(native.source_sha256);
    expect(native.diagnostic.code).toBeNull();
    const ast = parse(source);
    const message =
      'Cannot use `request.*()` call within loops or conditional structures, when `dynamic_requests` is `false` in the `indicator()` function.';
    expect(native.diagnostic).toMatchObject({ text: message, line: 5, column: 10 });
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
      expect.objectContaining({ message, line: 5, column: 10 }),
    ]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(false);
    expect(compiled.unsupported).toEqual([message]);
    expect(compiled.diagnostics).toEqual([{ message, line: 5, column: 10 }]);
  });
  it.each([
    [5, ', dynamic_requests=false'],
    [6, ', dynamic_requests=false'],
  ])('refuses direct local requests in v%s with %s', (version, option) => {
    const result = tryCompile(
      parse(`//@version=${version}
indicator("Local scope compile"${option})
x = 0.0
if bar_index >= 0
    x := request.security(syminfo.tickerid, "2", close)
plot(x)
`),
    );
    expect(result.success).toBe(false);
    expect(result.unsupported.join('; ')).toContain('local scopes require dynamic_requests=true');
  });

  it.each([
    [5, ', dynamic_requests=true'],
    [6, ''],
    [6, ', dynamic_requests=true'],
  ])('accepts dynamic local requests in v%s with %s', (version, option) => {
    expect(
      tryCompile(
        parse(`//@version=${version}
indicator("Dynamic local compile"${option})
x = 0.0
if bar_index >= 0
    x := request.security(syminfo.tickerid, "2", close)
plot(x)
`),
      ).success,
    ).toBe(true);
  });

  it.each([3, 4, 5])('preserves non-exported local wrappers in v%s', (version) => {
    const requestName = version < 5 ? 'security' : 'request.security';
    expect(
      tryCompile(
        parse(`//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Legacy wrapper compile")
f() => ${requestName}(syminfo.tickerid, "2", close)
x = 0.0
if ${version === 3 ? 'n' : 'bar_index'} >= 0
    x := f()
plot(x)
`),
      ).success,
    ).toBe(true);
  });

  it('preserves global static requests with dynamic requests disabled', () => {
    expect(
      tryCompile(
        parse(`//@version=6
indicator("Global static compile", dynamic_requests=false)
plot(request.security(syminfo.tickerid, "2", close))
`),
      ).success,
    ).toBe(true);
  });
});
