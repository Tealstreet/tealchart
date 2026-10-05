import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';

const tuple = (count: number) => `[${Array.from({ length: count }, (_, index) => `close + ${index}`).join(',')}]`;
const request = (count: number, prefix: string, symbol: string, expression = tuple(count)) => {
  const names = Array.from({ length: count }, (_, index) => `${prefix}${index}`);
  return `[${names.join(',')}] = request.security("${symbol}", "1", ${expression})\nplot(${names.join('+')})`;
};
const result = (body: string) => compile(parse(`//@version=6\nindicator("Request tuple limit")\n${body}`));
const reference = 'https://www.tradingview.com/pine-script-docs/writing/limitations/#tuple-element-limit';

describe('The documented combined request tuple budget', () => {
  it('does not count a request in an uncalled UDF', () => {
    expect(result(`unused() => request.security("ALT", "1", ${tuple(128)})\nplot(close)`).success).toBe(true);
  });
  it('counts seed tuple elements with the existing request tuple metadata', () => {
    expect(
      result(
        `[${Array.from({ length: 128 }, (_, index) => `s${index}`).join(',')}] = request.seed("repo", "DATA", ${tuple(128)})\nplot(s0+s127)`,
      ).success,
    ).toBe(false);
  });
  it('admits a single127-element tuple', () => {
    expect(result(request(127, 'v', 'ALT')).success, reference).toBe(true);
  });
  it('refuses a single128-element tuple', () => {
    const compiled = result(request(128, 'v', 'ALT'));
    expect(compiled.success, reference).toBe(false);
    expect(compiled.unsupported.join(' ')).toMatch(/127.*tuple|tuple.*127/i);
  });
  it('admits64 plus63 tuple elements across two requests', () => {
    expect(result(`${request(64, 'a', 'ALT')}\n${request(63, 'b', 'OTHER')}`).success, reference).toBe(true);
  });
  it('refuses64 plus64 tuple elements across two requests', () => {
    expect(result(`${request(64, 'a', 'ALT')}\n${request(64, 'b', 'OTHER')}`).success, reference).toBe(false);
  });
  // Native v10 admits two requests sharing the same64-element tuple UDF.
  it('admits the native shared UDF expression tuple return', () => {
    expect(
      result(
        `values() => ${tuple(64)}\n${request(64, 'a', 'ALT', 'values()')}\n${request(64, 'b', 'OTHER', 'values()')}`,
      ).success,
      reference,
    ).toBe(true);
  });
});
