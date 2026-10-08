import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Pine v6 reference: math.round precision, math.random seed, math.sum length are int.
const slots = [
  {
    member: 'math.round',
    slot: 'precision',
    positional: (v: string) => `math.round(2.125, ${v})`,
    named: (v: string) => `math.round(precision=${v}, number=2.125)`,
  },
  {
    member: 'math.random',
    slot: 'seed',
    positional: (v: string) => `math.random(0, 10, ${v})`,
    named: (v: string) => `math.random(seed=${v}, max=10, min=0)`,
  },
  {
    member: 'math.sum',
    slot: 'length',
    positional: (v: string) => `math.sum(close, ${v})`,
    named: (v: string) => `math.sum(length=${v}, source=close)`,
  },
] as const;

describe('documented v6 math integer slots', () => {
  for (const contract of slots) {
    for (const form of ['positional', 'named'] as const) {
      it.each(['1.0', '1.125'])(`refuses ${contract.member} ${contract.slot}=%s (${form})`, (value) => {
        const source = `//@version=6\nindicator("Integer slots")\nplot(${contract[form](value)})`;
        const ast = parse(source);
        expect(checkProgram(ast).diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringContaining(`${contract.member} ${contract.slot} must be an integer`),
            }),
          ]),
        );
      });
    }

    it(`admits integer qualifiers and named binding for ${contract.member}`, () => {
      for (const declaration of [
        'const int n = 2',
        'n = input.int(2)',
        'simple int n = 2',
        'series int n = bar_index + 1',
      ]) {
        const ast = parse(`//@version=6\nindicator("Integer controls")\n${declaration}\nplot(${contract.named('n')})`);
        expect(checkProgram(ast).diagnostics).toEqual([]);
        expect(tryCompile(ast).success).toBe(true);
      }
    });
  }

  it('retains omitted options and fractional numeric operands', () => {
    const source = `//@version=6
indicator("Math controls")
plot(math.round(2.125), title="Round")
plot(math.round(number=2.125, precision=2), title="Precision")
plot(math.random(min=0.25, max=0.75), title="Random")
plot(math.sum(source=1.125, length=2), title="Sum")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Round').values[0]).toBe(2);
    expect(getPlot(result, 'Precision').values[0]).toBe(2.13);
    const random = getPlot(result, 'Random').values;
    expect(random).toHaveLength(compatibilityBars.length);
    expect(random.every((v) => v !== null && v >= 0.25 && v < 0.75)).toBe(true);
    expect(getPlot(result, 'Sum').values[1]).toBe(2.25);
  });

  it('preserves local callable names and receiver methods', () => {
    const source = `//@version=6
indicator("Math shadows")
round(float n, float precision) => n + precision
random(float seed) => seed + 1
sum(float source, float length) => source + length
type Holder
    float value
method round(Holder self, float precision) => self.value + precision
holder = Holder.new(2)
plot(round(2, 1.125), title="Round")
plot(random(1.125), title="Random")
plot(sum(2, 1.125), title="Sum")
plot(holder.round(1.125), title="Method")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Round').values[0]).toBe(3.125);
    expect(getPlot(result, 'Random').values[0]).toBe(2.125);
    expect(getPlot(result, 'Sum').values[0]).toBe(3.125);
    expect(getPlot(result, 'Method').values[0]).toBe(3.125);
  });
});
