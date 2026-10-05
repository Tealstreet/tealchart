import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Version-rules-v1#42, ledger rank463; official v4 migration guide.
describe('legacy hline style rename', () => {
  it('migrates v3 dotted to v4 hline.style_dotted (row463)', () => {
    expect(checkProgram(parse('//@version=3\nstudy("Old style")\nhline(1, linestyle=dotted)')).diagnostics).toEqual([]);
    expect(checkProgram(parse('//@version=4\nstudy("New style")\nhline(1, linestyle=hline.style_dotted)')).diagnostics).toEqual([]);
    const result = checkProgram(parse('//@version=4\nstudy("Old refusal")\nhline(1, linestyle=dotted)'));
    expect(result.diagnostics.some((d) => d.code === 'version-mismatch' && d.message.includes('hline.style_dotted'))).toBe(true);
  });
  it.each([4, 5, 6])('preserves a declared dotted variable in v%s', (version) => {
    const declaration = version === 4 ? 'study' : 'indicator';
    const result = checkProgram(parse(`//@version=${version}\n${declaration}("Local name")\ndotted = 3\nplot(dotted)`));
    expect(result.diagnostics).toEqual([]);
  });

  it('retains v4 raw string unique values independently of the old builtin name', () => {
    expect(checkProgram(parse('//@version=4\nstudy("Raw style")\nhline(1, linestyle="dotted")')).diagnostics).toEqual([]);
  });
});
