import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('published v5 ema to ta.ema rename', () => {
  // Ledger version-rules-v1#107 (global rank255).
  // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#renamed-functions-and-variables
  // Constant source after warmup also isolates namespace binding.
  it.each([
    { version: 4, declaration: 'study', call: 'ema(close, 2)' },
    { version: 5, declaration: 'indicator', call: 'ta.ema(close, 2)' },
    { version: 6, declaration: 'indicator', call: 'ta.ema(length=2, source=close)' },
  ])('accepts and evaluates v$version $call', ({ version, declaration, call }) => {
    const source = `//@version=${version}\n${declaration}("EMA rename")\nplot(${call.replace('close', '102')}, "EMA")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'EMA').values.slice(1)).toEqual([102, 102]);
  });

  // CF040 is settled by native TV v2 conflicts-batch-1-v1.csv: SMA warmup,
  // missing output on source holes, retained accumulator state afterwards.
  // ~/cs/docs/tealscript-parity-archive/conflicts-adjudicated-v1.md#cf040
  // packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv
  // Derived for length 2: seed=(102+105)/2=103.5; next=103.5+(2/3)*3.5.
  // The capture settles v6; v4/v5 cases retain versioned namespace coverage.
  it.each([
    { version: 4, declaration: 'study', call: 'ema(close, 2)' },
    { version: 5, declaration: 'indicator', call: 'ta.ema(close, 2)' },
    { version: 6, declaration: 'indicator', call: 'ta.ema(length=2, source=close)' },
  ])('uses TV-settled SMA-seeded EMA startup in v$version', ({ version, declaration, call }) => {
    const result = runCompatScript(`//@version=${version}\n${declaration}("SMA-seeded EMA startup")\nplot(${call}, "EMA")`, {
      bars: compatibilityBars.slice(0, 3),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'EMA').values).toEqual([null, 103.5, 105.83333333333333]);
  });

  it.each([5, 6])('refuses bare ema in v%i', (version) => {
    const result = checkProgram(
      parse(`//@version=${version}
indicator("EMA rename")
plot(ema(close, 2))
`),
    );
    expect(result.diagnostics).toMatchObject([
      {
        code: 'version-mismatch',
        message: `ema() is a legacy Pine v3-v4 global. Use ta.ema() in Pine v${version}.`,
      },
    ]);
  });
});
