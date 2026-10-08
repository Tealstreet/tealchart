import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.format.
// Native CF027: oracle-probes/v2/captures/v2/evidence/conflicts-batch-23-v1-attempt1-error-v2.txt.
// Native CF028: oracle-probes/v2/captures/v2/evidence/conflicts-batch-24-v1-attempt1-error-v2.txt.
describe('native CF027/28: formatting runtime refusal', () => {
  it.each([
    ['CF027 unmatched braces', 'str.format("{0,number,#.#)", 1.34)', /unbalanced curly braces|Unmatched braces/],
    ['CF028 numeric array modifier', 'str.format("{0,number,#.#}", array.from(1.34, 2.56))', /Cannot format given Object as a Number/],
  ])('%s compiles and errors when executed', (_name, expression, message) => {
    const source = `//@version=6\nindicator("Native format errors")\nformattedValue = ${expression}\nplot(1, "After")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, compatibilityBars.slice(0, 1));
    if (!result) throw new Error('Native format fixture did not execute');
    expect.soft(result.errors).toEqual([expect.objectContaining({ message: expect.stringMatching(message) })]);
    expect.soft(result.profile.swallowedErrors ?? []).toEqual([]);
    const valid = runCompatScript('plot(str.format("{0,number,#.#}", 1.34) == "1.3" ? 1 : 0, "Valid")', { bars: compatibilityBars.slice(0, 1) });
    expect(valid.errors).toEqual([]);
    expect(getPlot(valid, 'Valid').values).toEqual([1]);
  });
});
