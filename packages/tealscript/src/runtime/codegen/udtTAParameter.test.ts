import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { analyze } from './analyzer';
import { executeCompiled, tryCompile } from './execute';

const cases = [
  {
    "name": "v5-sma-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "refuse",
    "expected": 41
  },
  {
    "name": "v5-sma-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v5-ema-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "refuse",
    "expected": 41
  },
  {
    "name": "v5-ema-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v5-change-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "builtin",
    "expected": 41
  },
  {
    "name": "v5-change-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v5-w0Value-ta",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v5-w0Value-holder",
    "source": "//@version=5\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v6-sma-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "refuse",
    "expected": 41
  },
  {
    "name": "v6-sma-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod sma(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.sma(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v6-ema-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "refuse",
    "expected": 41
  },
  {
    "name": "v6-ema-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod ema(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.ema(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v6-change-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "nativeOutcome": "builtin",
    "expected": 41
  },
  {
    "name": "v6-change-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod change(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.change(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v6-w0Value-ta",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder ta) =>\n    ta.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  },
  {
    "name": "v6-w0Value-holder",
    "source": "//@version=6\nindicator(\"TA receiver\")\ntype Holder\n    int value\nmethod w0Value(Holder self, int n) =>\n    self.value + n\nf(Holder holder) =>\n    holder.w0Value(13) * 2 + 1\nplot(f(Holder.new(7)))",
    "expected": 41
  }
];
const bars = [0, 1, 2].map((index) => ({ time: 1_700_000_000_000 + index * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

describe('UDT parameters named after namespaces follow native dispatch', () => {
  it.each(cases)('$name', ({ name, source, expected, nativeOutcome }) => {
    const program = parse(source);
    const errors = checkProgram(program).diagnostics.filter((d) => d.severity === 'error');
    if (nativeOutcome === 'refuse') {
      const method = name.includes('sma') ? 'sma' : 'ema';
      expect(errors).toEqual([{
        code: 'builtin-shadowing',
        ...(name.startsWith('v6') ? { nativeCode: 'CE10195' } : {}),
        severity: 'error',
        message: `ta.${method}() constructs cannot shadow existing built-in functions. Rename the method or the variable that it is called with.`,
        line: 8,
        column: 5,
      }]);
      return;
    }
    expect(errors).toEqual([]);
    if (nativeOutcome === 'builtin') expect(analyze(program).taCallSites).toHaveLength(1);
    else expect(analyze(program).taCallSites).toEqual([]);
    const compiled = tryCompile(program);
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    const result = executeCompiled(compiled, bars);
    expect(result!.errors).toEqual([]);
    expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    if (nativeOutcome === 'builtin') {
      const version = name.startsWith('v5') ? 5 : 6;
      const builtin = tryCompile(parse(`//@version=${version}\nindicator("Builtin change")\nplot(ta.change(13) * 2 + 1)`));
      expect(builtin.success).toBe(true);
      const nativeDispatch = executeCompiled(builtin, bars)!;
      expect(nativeDispatch.errors).toEqual([]);
      expect(nativeDispatch.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(result!.plots.map((plot) => plot.values)).toEqual(nativeDispatch.plots.map((plot) => plot.values));
      expect(result!.plots.map((plot) => plot.values.slice(1))).toEqual([[1, 1]]);
      expect(result!.plots[0]!.values).toHaveLength(bars.length);
    } else {
      expect(result!.plots.map((plot) => plot.values)).toEqual([[expected, expected, expected]]);
    }
  });
});


describe('builtin TA calls retain discovery', () => {
  for (const version of [5, 6]) {
    for (const method of ['sma', 'ema', 'change']) {
      it(`v${version} builtin ${method}`, () => {
        const program = parse(`//@version=${version}\nindicator("builtin TA")\nplot(ta.${method}(3, 1))`);
        expect(analyze(program).taCallSites).toHaveLength(1);
        const compiled = tryCompile(program);
        expect(compiled.success).toBe(true);
        expect(executeCompiled(compiled, bars)!.errors).toEqual([]);
      });
    }
  }
});
