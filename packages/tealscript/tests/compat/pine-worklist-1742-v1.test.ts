import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';

// Authority: other-timeframes-and-data/#dynamic-requests; P's 7286 scope proof.
describe('explicit dynamic request declaration disable', () => {
  it.each([5, 6])('disables direct local requests in v%s while retaining enabled and global controls', (version) => {
    const local = (enabled: boolean) =>
      parse(`//@version=${version}
indicator("Declaration disable", dynamic_requests=${enabled})
value = 0.0
if bar_index >= 0
    value := request.security(syminfo.tickerid, "2", close)
plot(value)
`);
    const disabled = tryCompile(local(false));
    expect(disabled.success).toBe(false);
    expect(disabled.unsupported).toContain(
      'request.* calls in local scopes require dynamic_requests=true: request.security',
    );
    expect(tryCompile(local(true)).success).toBe(true);
    expect(
      tryCompile(
        parse(`//@version=${version}
indicator("Global static control", dynamic_requests=false)
plot(request.security(syminfo.tickerid, "2", close))
`),
      ).success,
    ).toBe(true);
  });
});
