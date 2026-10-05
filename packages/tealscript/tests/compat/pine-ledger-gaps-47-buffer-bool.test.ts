import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// execution-model/#historical-buffers: depth counts past values, plus current.
// migration-guides/to-pine-version-6/#explicit-bool-casting: zero/na are false;
// other numbers are true in v5, while v6 requires an explicit bool cast.
describe('ledger47 buffer and numeric bool boundaries', () => {
  it.each(['close', 'value'])('retains current plus two past slots for %s, rank1847', (name) => {
    const source = `//@version=6\nindicator("Depth")\nvalue=close+1\nplot(${name}[2], title="Past")`;
    const bars = compatibilityBars.slice(0, 5);
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars, undefined, { maxBarsBack: 2 });
    if (!result) throw new Error('Expected compiled depth result');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values).toEqual([
      null,
      null,
      ...bars.slice(0, -2).map((bar) => bar.close + (name === 'value' ? 1 : 0)),
    ]);
  });
  it('v5 implicitly converts zero, numeric na and nonzero numbers, rank1868', () => {
    const source =
      '//@version=5\nindicator("Bool")\nfloat missing=na\nplot(0 ? 1 : 0,title="Zero")\nplot(missing ? 1 : 0,title="Missing")\nplot(-2 ? 1 : 0,title="Nonzero")';
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(
      [0, 0, 1].map((value) => compatibilityBars.map(() => value)),
    );
  });
  it.each(['0', '-2', 'missing'])('v6 refuses implicit %s numeric bool, rank1868', (value) => {
    const source = `//@version=6\nindicator("Bool")\nfloat missing=na\nplot(${value} ? 1 : 0)`;
    expect(checkProgram(parse(source)).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'implicit-numeric-bool', severity: 'error' })]),
    );
  });
  it.each([5, 6])('v%i preserves explicit bool casts, rank1868 control', (version) => {
    const source = `//@version=${version}\nindicator("Bool")\nplot(bool(0) ? 1 : 0)\nplot(bool(na) ? 1 : 0)\nplot(bool(-2) ? 1 : 0)`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(
      [0, 0, 1].map((value) => compatibilityBars.map(() => value)),
    );
  });
});
