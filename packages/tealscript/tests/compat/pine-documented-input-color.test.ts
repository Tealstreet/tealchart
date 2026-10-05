import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const genericInputs = [
  { entry: 35, defval: 'false', widget: 'bool', kind: 'bool', qualifier: 'input', display: 0 },
  { entry: 37, defval: '-7', widget: 'int', kind: 'int', qualifier: 'input', display: 31 },
  { entry: 38, defval: '-1.25', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  { entry: 39, defval: '"#112233"', widget: 'string', kind: 'string', qualifier: 'input', display: 31 },
  {
    entry: 36,
    defval: '#112233',
    widget: 'color',
    kind: 'color',
    qualifier: 'input',
    display: 0,
  },
  {
    entry: 36,
    defval: 'color.rgb(17, 43, 91)',
    widget: 'color',
    kind: 'color',
    qualifier: 'input',
    display: 0,
  },
  { entry: 36, defval: 'color.red', widget: 'color', kind: 'color', qualifier: 'input', display: 0 },
  { entry: 36, defval: 'color.new(#112233, 0)', widget: 'color', kind: 'color', qualifier: 'input', display: 0 },
  {
    entry: 36,
    setup: 'c = color.rgb(17, 43, 91)\n',
    defval: 'c',
    widget: 'color',
    kind: 'color',
    qualifier: 'input',
    display: 0,
  },
  {
    entry: 38,
    defval: 'float(1)',
    widget: 'float',
    kind: 'float',
    qualifier: 'input',
    display: 31,
  },
  { entry: 38, defval: '1.0', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  { entry: 38, defval: '-1.0', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  { entry: 38, setup: 'float f = 1\n', defval: 'f', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  { entry: 38, defval: 'color.r(#112233)', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  { entry: 38, defval: '1.0 + 2', widget: 'float', kind: 'float', qualifier: 'input', display: 31 },
  {
    entry: 40,
    defval: 'close',
    widget: 'source',
    kind: 'float',
    qualifier: 'series',
    display: 31,
  },
];

// Official v6 reference functions categoryIndex, captured 2026-10-03. These
// assert runtime metadata only, not the host's widget rendering/interaction.
const typedInputs = [
  { member: 'input.bool', entry: 41, defval: 'false', widget: 'bool', display: 0 },
  { member: 'input.int', entry: 42, defval: '-7', widget: 'int', display: 31 },
  { member: 'input.float', entry: 44, defval: '1.0', widget: 'float', display: 31 },
  { member: 'input.string', entry: 46, defval: '"value"', widget: 'string', display: 31 },
  { member: 'input.text_area', entry: 47, defval: '"value"', widget: 'text_area', display: 0 },
  { member: 'input.symbol', entry: 48, defval: '"NASDAQ:AAPL"', widget: 'symbol', display: 31 },
  { member: 'input.timeframe', entry: 49, defval: '"60"', widget: 'timeframe', display: 31 },
  { member: 'input.session', entry: 50, defval: '"0930-1600"', widget: 'session', display: 31 },
  { member: 'input.color', entry: 52, defval: '#112233', widget: 'color', display: 0 },
  { member: 'input.time', entry: 53, defval: '1700000000000', widget: 'time', display: 0 },
  { member: 'input.price', entry: 54, defval: '1.25', widget: 'price', display: 31 },
];

describe('Pine documented input contracts', () => {
  for (const row of genericInputs) {
    const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_input';
    it(`input(${row.defval}) classifies ${row.widget} [functions:${row.entry}]`, () => {
      // Rejects runtime typeof classification: hex-looking strings are strings,
      // colors are colors, integral floats remain floats, and sources are series.
      const source = `//@version=6\nindicator("Input classification")\n${'setup' in row ? row.setup : ''}x = input(${row.defval}, "Choice")\nplot(bar_index)`;
      const semantic = checkProgram(parse(source));
      expect(semantic.diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0], citation).toMatchObject({ type: row.widget, display: row.display, active: true });
      expect(semantic.symbols.find((symbol) => symbol.name === 'x')?.type, citation).toMatchObject({
        kind: row.kind,
        qualifier: row.qualifier,
      });
    });
  }

  for (const row of typedInputs) {
    it(`${row.member} [functions:${row.entry}] retains constructor kind and documented display default`, () => {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${row.member}`;
      // Rejects deriving kind solely from JS value (all numbers/strings share
      // runtime types), defaulting display.all for bool/color/time/text_area,
      // and confusing active=true with confirm=false.
      const result = runCompatScript(
        `//@version=6\nindicator("Typed input")\nx = ${row.member}(${row.defval}, "Choice")\nplot(bar_index)`,
      );
      expect(result.errors).toEqual([]);
      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0], citation).toMatchObject({
        type: row.widget,
        display: row.display,
        active: true,
        confirm: false,
      });
    });
  }

  it('input.int/float [functions:42,44] retain bounds and step without snapping defaults', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_input.int
    // https://www.tradingview.com/pine-script-reference/v6/#fun_input.float
    // Rejects positive-only bounds, dropped step, and snapping to step multiples.
    const result = runCompatScript(`//@version=6
indicator("Range metadata")
i = input.int(-3, "Integer", minval=-8, maxval=9, step=4)
f = input.float(-0.125, "Float", minval=-1.5, maxval=2.5, step=0.25)
plot(i, "i")
plot(f, "f")
`);
    expect(result.errors).toEqual([]);
    expect(result.inputs[0]).toMatchObject({ defval: -3, minval: -8, maxval: 9, step: 4 });
    expect(result.inputs[1]).toMatchObject({ defval: -0.125, minval: -1.5, maxval: 2.5, step: 0.25 });
    expect(getPlot(result, 'i').values).toEqual(compatibilityBars.map(() => -3));
    expect(getPlot(result, 'f').values).toEqual(compatibilityBars.map(() => -0.125));
  });

  it('input.string [functions:46] preserves options ordering and explicit metadata', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_input.string
    // Rejects sorted options, renamed groups/inline, and display default
    // overriding an explicit choice. Only engine metadata is tested.
    const result = runCompatScript(`//@version=6
indicator("Input metadata")
enabled = input.bool(false, "Enabled")
mode = input.string("Z", "Mode", options=["Z", "A", "M"], tooltip="Help", inline="rowA", group="Mixed CASE", confirm=true, display=display.data_window, active=enabled)
plot(mode == "Z" ? 1 : 0, "mode")
`);
    expect(result.errors).toEqual([]);
    // The output schema encodes display.data_window as bit 2.
    expect(result.inputs[1]).toMatchObject({
      options: ['Z', 'A', 'M'],
      tooltip: 'Help',
      inline: 'rowA',
      group: 'Mixed CASE',
      confirm: true,
      display: 2,
      active: false,
    });
    expect(getPlot(result, 'mode').values).toEqual(compatibilityBars.map(() => 1));
  });

  it('input.source [functions:51] preserves a varying composite instead of scalar caching', () => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_input.source
    // Only defval/title: conflicting positional UI order is not scored here.
    // Unsorted prices reject first/last-bar caching and choosing close instead.
    const bars = compatibilityBars
      .slice(0, 3)
      .map((bar, index) => ({ ...bar, high: [16, 8, 30][index], low: [4, 2, 10][index] }));
    const result = runCompatScript(
      '//@version=6\nindicator("Source")\nx = input.source(hl2, "Source")\nplot(x, "source")',
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.inputs[0].type).toBe('source');
    expect(getPlot(result, 'source').values).toEqual([10, 5, 20]);
  });
});

const colorContracts = [
  {
    name: 'rgb distinct channels and default opacity',
    entry: 13,
    member: 'color.rgb',
    expression: 'color.rgb(17, 43, 91)',
    expected: '#112B5B',
    rejects: 'swapping RGB channels, grayscale, and nonopaque default',
  },
  {
    name: 'rgb named channels bind in reference order',
    entry: 13,
    member: 'color.rgb',
    expression: 'color.rgb(blue=91, red=17, green=43)',
    expected: '#112B5B',
    rejects: 'named-argument insertion order and missing named channels',
  },
  {
    name: 'rgb transparency endpoints',
    entry: 13,
    member: 'color.rgb',
    expression: 'color.rgb(17, 43, 91, 100)',
    expected: '#112B5B00',
    rejects: 'opacity/transparency reversal and ignoring transparency',
  },
  {
    name: 'new replaces rather than compounds existing transparency',
    entry: 9,
    member: 'color.new',
    expression: 'color.new(color.rgb(17, 43, 91, 100), 0)',
    expected: '#112B5B',
    rejects: 'compounding alpha and preserving old transparency',
  },
  {
    name: 'rgb supports fractional transparency',
    entry: 13,
    member: 'color.rgb',
    expression: 'color.rgb(17, 43, 91, 12.5)',
    expected: '#112B5BDF',
    rejects: 'rounding transparency before 8-bit alpha conversion',
  },
  {
    name: 'new supports fractional transparency',
    entry: 9,
    member: 'color.new',
    expression: 'color.new(#112B5B, 12.5)',
    expected: '#112B5BDF',
    rejects: 'rounding transparency before alpha conversion and discarding RGB',
  },
  {
    name: 'gradient clamps below bottom',
    entry: 33,
    member: 'color.from_gradient',
    expression: 'color.from_gradient(-4, 0, 8, #14283C, #6490B4)',
    expected: '#14283C',
    rejects: 'extrapolation and swapped endpoints',
  },
  {
    name: 'gradient clamps above top',
    entry: 33,
    member: 'color.from_gradient',
    expression: 'color.from_gradient(12, 0, 8, #14283C, #6490B4)',
    expected: '#6490B4',
    rejects: 'extrapolation and returning the bottom endpoint',
  },
  {
    name: 'gradient interpolates channels at an asymmetric fraction',
    entry: 33,
    member: 'color.from_gradient',
    expression: 'color.from_gradient(2, 0, 8, #14283C, #6490B4)',
    expected: '#28425A',
    rejects: 'midpoint-only interpolation, endpoint selection, and nonlinear interpolation',
  },
];

describe('Pine documented color contracts', () => {
  for (const row of colorContracts) {
    it(`${row.name} [functions:${row.entry}]`, () => {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${row.member}`;
      // Float transparency rule: https://www.tradingview.com/pine-script-docs/visuals/colors/#transparency
      // Gradient interpolation/clamping: https://www.tradingview.com/pine-script-docs/visuals/colors/#colorfrom_gradient
      const result = runCompatScript(
        `//@version=6\nindicator("Color contract")\nplot(bar_index, "p", color=${row.expression})`,
      );
      expect(result.errors).toEqual([]);
      // Six-digit opaque RGB and eight-digit RGBA ending FF are equivalent
      // colors. Normalize that representation only; preserve all other alpha.
      const colors = getPlot(result, 'p').color;
      expect(Array.isArray(colors)).toBe(true);
      const normalized = Array.isArray(colors)
        ? colors.map((color) => color?.replace(/^(#[0-9A-F]{6})FF$/i, '$1'))
        : colors;
      expect(normalized, `Rejects ${row.rejects}; ${citation}`).toEqual(compatibilityBars.map(() => row.expected));
    });
  }

  for (const [member, entry, expected] of [
    ['color.r', 17, 17],
    ['color.g', 21, 43],
    ['color.b', 25, 91],
    ['color.t', 29, 100],
  ] as const) {
    it(`${member} [functions:${entry}] extracts the requested channel`, () => {
      // Distinct channels reject copying any other channel; transparency 100
      // rejects returning opacity 0 or byte alpha instead of percent.
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${member}`;
      const result = runCompatScript(
        `//@version=6\nindicator("Channel extraction")\nplot(${member}(color.rgb(17, 43, 91, 100)), "p")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'p').values, citation).toEqual(compatibilityBars.map(() => expected));
    });
  }
});
