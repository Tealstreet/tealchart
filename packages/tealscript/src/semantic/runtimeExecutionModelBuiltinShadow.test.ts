import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const authority = 'https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Builtin shadow warning")\n${body}`)).diagnostics;
}

describe(`runtime execution model row1800 global builtin shadow warning [${authority}]`, () => {
  it.each(['close', 'bar_index', 'volume'])('warns for global builtin %s without rejecting the declaration', (name) => {
    const result = diagnostics(`int ${name} = 17\nplot(${name})`);
    expect(result.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result).toContainEqual(
      expect.objectContaining({ code: 'builtin-shadow', severity: 'warning', message: expect.stringContaining(name) }),
    );
  });

  it.each(['global', 'local'])('warns for a builtin in a %s tuple declaration', (scope) => {
    const declaration =
      scope === 'global'
        ? '[close, kept] = pair()\nplot(kept)'
        : 'if true\n    [close, kept] = pair()\n    observed := kept\nplot(observed)';
    const result = diagnostics(`pair() => [17, 19]\nint observed = 0\n${declaration}`);
    expect(result.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result).toContainEqual(
      expect.objectContaining({
        code: 'builtin-shadow',
        severity: 'warning',
        message: expect.stringContaining('close'),
      }),
    );
  });
});
