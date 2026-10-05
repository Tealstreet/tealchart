import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Authority: pine-v6-reference-v1.json input and each input.<modern> entry.
// Legacy selectors and the split are specified by the official v5 guide:
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#split-of-input-into-several-functions
// Values are independent defaults/sentinel strings, not wrapper comparisons.
const bars: Bar[] = [30, -4, 8, 2].map((close, index) => ({
  time: (index + 1) * 60_000, open: close - 0.5, high: close + 1,
  low: close - 1, close, volume: 10,
}));

const cases = [
  { legacy: 'integer', modern: 'int', defval: '7', expression: 'value', values: [7, 7, 7, 7] },
  { legacy: 'float', modern: 'float', defval: '-2.75', expression: 'value', values: [-2.75, -2.75, -2.75, -2.75] },
  { legacy: 'bool', modern: 'bool', defval: 'false', expression: 'value ? 7 : -2', values: [-2, -2, -2, -2] },
  { legacy: 'color', modern: 'color', defval: '#112233', expression: 'color.r(value) + 2 * color.g(value) + 3 * color.b(value)', values: [238, 238, 238, 238] },
  { legacy: 'resolution', modern: 'timeframe', defval: '"120"', expression: 'value == "120" ? 7 : -2', values: [7, 7, 7, 7] },
  { legacy: 'session', modern: 'session', defval: '"0930-1600"', expression: 'value == "0930-1600" ? 7 : -2', values: [7, 7, 7, 7] },
  // Nonmonotonic source bars catch scalar freezing and accidental open/high
  // source selection. This must remain a source input, not a float input.
  { legacy: 'source', modern: 'source', defval: 'close', expression: 'value', values: [30, -4, 8, 2] },
  { legacy: 'string', modern: 'string', defval: '"EMA"', expression: 'value == "EMA" ? 7 : -2', values: [7, 7, 7, 7] },
  { legacy: 'symbol', modern: 'symbol', defval: '"NASDAQ:AAPL"', expression: 'value == "NASDAQ:AAPL" ? 7 : -2', values: [7, 7, 7, 7] },
  { legacy: 'time', modern: 'time', defval: '1514764800000', expression: 'value', values: [1514764800000, 1514764800000, 1514764800000, 1514764800000] },
];

function source(version: number, body: string): string {
  return `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Input split reference")\n${body}`;
}

function errors(version: number, body: string) {
  return checkProgram(parse(source(version, body))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented v5 input split', () => {
  // Red proof: refuse legacy generic type selectors in v4 and corrupt runtime
  // inferred types (int -> float, every other type -> int). All 20 ordinary
  // cases fail; restoring those implementations makes them pass unchanged.
  // Each entry's metadata type and runtime values must both match. This rejects
  // replacing every selector with a numeric/string input despite a usable value.
  it.each(cases)('replaces input.$legacy with input.$modern()', ({ legacy, modern, defval, expression, values }) => {
    for (const version of [4, 5, 6]) {
      const call = version === 4
        ? `input(${defval}, "Chosen", type=input.${legacy})`
        : `input.${modern}(title="Chosen", defval=${defval})`;
      const body = `value = ${call}\nplot(${expression})`;
      expect(errors(version, body)).toEqual([]);
      const result = executeScript(parse(source(version, body)), bars);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0]).toMatchObject({ type: modern, title: 'Chosen' });
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].values).toEqual(values);
    }
    // Generic input(type=...) survives only in the legacy versions.
    for (const version of [5, 6]) {
      expect(errors(version, `value = input(${defval}, type=input.${legacy})`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('type') }),
      ]));
    }
  });

  // Reference input defval types: int, float, bool, string, color and source.
  // A fractional/negative default, false and a changing source discriminate
  // numeric coercion, truthiness defaults, and frozen-source inference.
  it.each([
    { name: 'int', defval: '7', expression: 'value', values: [7, 7, 7, 7] },
    { name: 'float', defval: '-2.75', expression: 'value', values: [-2.75, -2.75, -2.75, -2.75] },
    { name: 'bool', defval: 'false', expression: 'value ? 7 : -2', values: [-2, -2, -2, -2] },
    { name: 'string', defval: '"EMA"', expression: 'value == "EMA" ? 7 : -2', values: [7, 7, 7, 7] },
    { name: 'string', defval: '"#112233"', expression: 'value == "#112233" ? 7 : -2', values: [7, 7, 7, 7] },
    { name: 'source', defval: 'close', expression: 'value', values: [30, -4, 8, 2] },
  ])('infers modern generic input $name from $defval [input]', ({ name, defval, expression, values }) => {
    for (const version of [5, 6]) {
      const body = `value = input(${defval}, "Chosen")\nplot(${expression})`;
      expect(errors(version, body)).toEqual([]);
      const result = executeScript(parse(source(version, body)), bars);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0]).toMatchObject({ type: name, title: 'Chosen' });
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].values).toEqual(values);
    }
  });

  // Fixed by verified lane G input metadata/type inference; this was an
  // open defect, not an authority-conflict marker. Reference input defval:
  // color creates a color input, string creates a text input. The same bytes
  // with and without quotes reject a runtime string-pattern guessing repair.
  // Inverse proof: preserve ColorLiteral defval type in emitted input metadata
  // and select a color input from that descriptor, leaving strings as strings.
  it('GENERIC_INPUT_COLOR_LITERAL_IS_STRING [input]', () => {
    for (const version of [5, 6]) {
      const body = `tint = input(#112233, "Tint")
inputText = input("#112233", "Text")
plot(color.r(tint))
plot(inputText == "#112233" ? 7 : -2)`;
      expect(errors(version, body)).toEqual([]);
      const result = executeScript(parse(source(version, body)), bars);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toHaveLength(2);
      expect(result.inputs[0]).toMatchObject({ type: 'color', title: 'Tint' });
      expect(result.inputs[1]).toMatchObject({ type: 'string', title: 'Text' });
      expect(result.plots.map((plot) => plot.values)).toEqual([[17, 17, 17, 17], [7, 7, 7, 7]]);
    }
  });

  // Reference input's modern signature omits these slots; input.int/string
  // own them. Test each slot individually so one unknown argument cannot
  // conceal acceptance of another removed argument.
  it.each([
    { name: 'minval', legacy: 'input(3, type=input.integer, minval=1)', modern: 'input.int(3, minval=1)', generic: 'input(3, minval=1)' },
    { name: 'maxval', legacy: 'input(3, type=input.integer, maxval=9)', modern: 'input.int(3, maxval=9)', generic: 'input(3, maxval=9)' },
    { name: 'step', legacy: 'input(3, type=input.integer, step=2)', modern: 'input.int(3, step=2)', generic: 'input(3, step=2)' },
    { name: 'options', legacy: 'input("EMA", type=input.string, options=["SMA", "EMA"])', modern: 'input.string("EMA", options=["SMA", "EMA"])', generic: 'input("EMA", options=["SMA", "EMA"])' },
  ])('moves the generic $name slot to its typed helper [input]', ({ name, legacy, modern, generic }) => {
    expect(errors(4, `value = ${legacy}`)).toEqual([]);
    for (const version of [5, 6]) {
      expect(errors(version, `value = ${modern}`)).toEqual([]);
      expect(errors(version, `value = ${generic}`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-argument', message: expect.stringContaining(`Unknown argument '${name}' for input()`) }),
      ]));
    }
  });
});
