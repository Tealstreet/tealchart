import type { Bar, ExecutionResult } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot } from './fixtures';

// https://www.tradingview.com/pine-script-docs/concepts/inputs/#price-input
// Engine descriptors and returned values only; marker interaction is host scope.
const bars: Bar[] = [
  { time: 1_700_000_000_000, open: 10, high: 13, low: 9, close: 12, volume: 100 },
  { time: 1_700_000_060_000, open: 11, high: 15, low: 10, close: 14, volume: 110 },
  { time: 1_700_000_120_000, open: 12, high: 16, low: 11, close: 15, volume: 120 },
];

const named = `//@version=6
indicator("Point descriptors")
t = input.time(defval=1700000000000, title="Time", confirm=true, inline="point", group="Anchors", tooltip="Time tip")
p = input.price(defval=101.25, title="Price", confirm=true, inline="point", group="Anchors", tooltip="Price tip")
plot(t, "Time value")
plot(p, "Price value")`;

const positional = `//@version=6
indicator("Positional point descriptors")
t = input.time(1700000000000, "Time", "Time tip", "point", "Anchors", true)
p = input.price(101.25, "Price", "Price tip", "point", "Anchors", true)
plot(t, "Time value")
plot(p, "Price value")`;

function run(source: string, compiled: boolean, inputs?: Map<string, unknown>): ExecutionResult {
  const ast = parse(source);
  if (!compiled) return executeScript(ast, bars, inputs);
  const program = tryCompile(ast);
  expect(program.success, JSON.stringify(program.unsupported)).toBe(true);
  const result = executeCompiled(program, bars, inputs);
  expect(result).not.toBeNull();
  return result!;
}

function values(result: ExecutionResult, title: string): Array<number | null> {
  return getPlot(result, title).values;
}

describe('rank 764 engine point-input descriptors', () => {
  for (const compiled of [false, true]) {
    describe(compiled ? 'direct executeCompiled' : 'public executeScript', () => {
      for (const [binding, source] of [
        ['named', named],
        ['positional', positional],
      ] as const) {
        it(`${binding} preserves both matching descriptors and their defaults`, () => {
          const result = run(source, compiled);
          expect(result.errors).toEqual([]);
          expect(result.inputs).toEqual([
            expect.objectContaining({
              type: 'time',
              title: 'Time',
              defval: 1_700_000_000_000,
              tooltip: 'Time tip',
              inline: 'point',
              group: 'Anchors',
              confirm: true,
            }),
            expect.objectContaining({
              type: 'price',
              title: 'Price',
              defval: 101.25,
              tooltip: 'Price tip',
              inline: 'point',
              group: 'Anchors',
              confirm: true,
            }),
          ]);
          expect(values(result, 'Time value')).toEqual([1_700_000_000_000, 1_700_000_000_000, 1_700_000_000_000]);
          expect(values(result, 'Price value')).toEqual([101.25, 101.25, 101.25]);
        });

        it(`${binding} returns independent zero and nondefault overrides without rewriting descriptors`, () => {
          const defaults = run(source, compiled);
          const timeId = defaults.inputs.find((input) => input.title === 'Time')!.id;
          const priceId = defaults.inputs.find((input) => input.title === 'Price')!.id;
          expect(timeId).not.toBe(priceId);
          const changed = run(
            source,
            compiled,
            new Map([
              [timeId, 0],
              [priceId, -12.375],
            ]),
          );
          expect(changed.errors).toEqual([]);
          expect(changed.inputs).toEqual(defaults.inputs);
          expect(values(changed, 'Time value')).toEqual([0, 0, 0]);
          expect(values(changed, 'Price value')).toEqual([-12.375, -12.375, -12.375]);
          const inverse = run(
            source,
            compiled,
            new Map([
              [timeId, 1_710_000_000_123],
              [priceId, 0],
            ]),
          );
          expect(inverse.errors).toEqual([]);
          expect(inverse.inputs).toEqual(defaults.inputs);
          expect(values(inverse, 'Time value')).toEqual([1_710_000_000_123, 1_710_000_000_123, 1_710_000_000_123]);
          expect(values(inverse, 'Price value')).toEqual([0, 0, 0]);
        });
      }

      it('preserves false confirmation and distinct case-sensitive identifiers', () => {
        const source = named.replace(
          'confirm=true, inline="point", group="Anchors"',
          'confirm=false, inline="Point", group="anchors"',
        );
        const result = run(source, compiled);
        expect(result.errors).toEqual([]);
        expect(result.inputs).toEqual([
          expect.objectContaining({ title: 'Time', confirm: false, inline: 'Point', group: 'anchors' }),
          expect.objectContaining({ title: 'Price', confirm: true, inline: 'point', group: 'Anchors' }),
        ]);
        expect(values(result, 'Price value')).toEqual([101.25, 101.25, 101.25]);
      });

      it('preserves omitted confirmation and empty inline/group without inventing pairing', () => {
        const result = run(
          `//@version=6
indicator("Unconfirmed inputs")
t = input.time(1700000000000, "Time", inline="", group="")
p = input.price(101.25, "Price", inline="", group="")
plot(t, "Time value")
plot(p, "Price value")`,
          compiled,
        );
        expect(result.errors).toEqual([]);
        expect(result.inputs).toEqual([
          expect.objectContaining({ type: 'time', title: 'Time', confirm: false, inline: '', group: '' }),
          expect.objectContaining({ type: 'price', title: 'Price', confirm: false, inline: '', group: '' }),
        ]);
        expect(values(result, 'Time value')).toEqual([1_700_000_000_000, 1_700_000_000_000, 1_700_000_000_000]);
      });
    });
  }
});
