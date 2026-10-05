import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';

describe('non-dynamic local request compile refusal', () => {
  it.each([[5, ''], [5, ', dynamic_requests=false'], [6, ', dynamic_requests=false']])('refuses direct local requests in v%s with %s', (version, option) => {
    const result = tryCompile(parse(`//@version=${version}
indicator("Local scope compile"${option})
x = 0.0
if bar_index >= 0
    x := request.security(syminfo.tickerid, "2", close)
plot(x)
`));
    expect(result.success).toBe(false);
    expect(result.unsupported.join('; ')).toContain('local scopes require dynamic_requests=true');
  });

  it.each([[5, ', dynamic_requests=true'], [6, ''], [6, ', dynamic_requests=true']])('accepts dynamic local requests in v%s with %s', (version, option) => {
    expect(tryCompile(parse(`//@version=${version}
indicator("Dynamic local compile"${option})
x = 0.0
if bar_index >= 0
    x := request.security(syminfo.tickerid, "2", close)
plot(x)
`)).success).toBe(true);
  });

  it.each([3, 4, 5])('preserves non-exported local wrappers in v%s', (version) => {
    const requestName = version < 5 ? 'security' : 'request.security';
    expect(tryCompile(parse(`//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Legacy wrapper compile")
f() => ${requestName}(syminfo.tickerid, "2", close)
x = 0.0
if ${version === 3 ? 'n' : 'bar_index'} >= 0
    x := f()
plot(x)
`)).success).toBe(true);
  });

  it('preserves global static requests with dynamic requests disabled', () => {
    expect(tryCompile(parse(`//@version=6
indicator("Global static compile", dynamic_requests=false)
plot(request.security(syminfo.tickerid, "2", close))
`)).success).toBe(true);
  });
});
