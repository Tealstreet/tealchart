import type { CompiledBarContext } from './compile';

import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 32 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: i + 1,
  high: i + 3,
  low: i,
  close: i + 2,
  volume: 1,
}));

it('constructs static named-default input metadata once per execution', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("named input cache")
x = input.int(defval=7, title="Count", tooltip="count")
plot(x)`),
  );
  expect(compiled.success).toBe(true);
  let metadataReads = 0;
  const onBar = compiled.ScriptClass.prototype.onBar;
  compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    const input = ctx.input;
    ctx.input = (...callArgs: Parameters<typeof input>) => {
      const named = callArgs[3];
      Object.defineProperty(named, 'tooltip', {
        configurable: true,
        get: () => {
          metadataReads++;
          return 'count';
        },
      });
      return input(...callArgs);
    };
    try {
      return onBar.call(this, ctx);
    } finally {
      ctx.input = input;
    }
  };
  const result = executeCompiled(compiled, bars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(Array(32).fill(7));
  expect(metadataReads).toBe(1);
});

it('retains named source inputs as live series values', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("source input cache control")
x = input.source(defval=close, title="Source")
plot(x)`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(bars.map((bar) => bar.close));
});

it('keeps distinct named defaults, titles, and options at separate call sites', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("input call identity")
a = input.int(defval=7, title="Same", options=[7, 9])
b = input.int(defval=9, title="Same", options=[7, 9])
c = input.int(defval=7, title="Other", options=[7, 11])
plot(a)
plot(b)
plot(c)`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots.map((plot) => plot.values)).toEqual([7, 9, 7].map((value) => Array(32).fill(value)));
  expect(result?.inputs.map((input) => ({ title: input.title, defval: input.defval, options: input.options }))).toEqual(
    [
      { title: 'Same', defval: 7, options: [7, 9] },
      { title: 'Same', defval: 9, options: [7, 9] },
      { title: 'Other', defval: 7, options: [7, 11] },
    ],
  );
});

it('rebuilds metadata and reads changed overrides on a new execution', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("input execution identity")
x = input.int(defval=7, title="Count", options=[7, 9])
plot(x)`),
  );
  expect(compiled.success).toBe(true);
  const first = executeCompiled(compiled, bars, new Map([['input_Count', 9]]));
  const second = executeCompiled(compiled, bars);
  expect(first?.errors).toEqual([]);
  expect(second?.errors).toEqual([]);
  expect(first?.plots[0].values).toEqual(Array(32).fill(9));
  expect(second?.plots[0].values).toEqual(Array(32).fill(7));
  expect(first?.inputs).toEqual(second?.inputs);
});
