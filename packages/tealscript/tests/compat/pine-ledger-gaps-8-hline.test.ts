import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Independent contracts: reference/pine-v6-reference-v1.json functions[56].
// Ledger ranks 301-305: input price/linewidth/editable; const title/color.
// https://www.tradingview.com/pine-script-reference/v6/#fun_hline
const slots = [
  { name: 'price', allowed: 'value = input.float(17.5)', simple: 'simple float value = 17.5', series: 'value = close', qualifier: 'input' },
  { name: 'title', allowed: 'const string value = "Threshold"', simple: 'value = input.string("Threshold")', series: 'value = str.tostring(close)', qualifier: 'const' },
  { name: 'color', allowed: 'const color value = color.red', simple: 'simple color value = color.red', series: 'value = close > open ? color.red : color.green', qualifier: 'input' },
  { name: 'linewidth', allowed: 'value = input.int(2)', simple: 'simple int value = 2', series: 'value = bar_index + 1', qualifier: 'input' },
  { name: 'editable', allowed: 'value = input.bool(true)', simple: 'simple bool value = true', series: 'value = close > open', qualifier: 'input' },
] as const;

function call(slot: string, named: boolean): string {
  if (named) return slot === 'price' ? 'hline(price=value)' : `hline(price=17.5, ${slot}=value)`;
  const args = ['17.5', '"Threshold"', 'color.red', 'hline.style_solid', '2', 'true'];
  args[['price', 'title', 'color', 'linestyle', 'linewidth', 'editable'].indexOf(slot)] = 'value';
  return `hline(${args.join(', ')})`;
}

function check(declaration: string, source: string) {
  return checkProgram(parse(`//@version=6\nindicator("Hline qualifiers")\n${declaration}\n${source}`));
}

describe('ledger gaps 8: fixed hline argument qualifiers', () => {
  const cases = slots.flatMap((slot) => [
    { ...slot, strength: slot.name === 'title' ? 'input' : 'simple', declaration: slot.simple },
    { ...slot, strength: 'series', declaration: slot.series },
  ]);
  for (const named of [false, true]) {
    it.each(cases)('rejects $strength $name with ' + (named ? 'named' : 'positional') + ' arguments', (slot) => {
      const source = call(slot.name, named);
      expect(check(slot.allowed, source).diagnostics).toEqual([]);
      expect(check(slot.declaration, source).diagnostics).toEqual([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining(`to ${slot.qualifier} parameter '${slot.name}' for hline`),
        }),
      ]);
    });
  }
});
