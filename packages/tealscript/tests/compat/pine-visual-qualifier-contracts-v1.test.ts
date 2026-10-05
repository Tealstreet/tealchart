import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Hand-reviewed function parameter displayTypes from the pinned v6 reference.
// Each parameter checks its declared qualifier and the next stronger qualifier;
// offset version rules and the hline input-color authority conflict are excluded.
const contracts = [
  {
    fn: 'plot',
    entry: 1,
    call: 'plot(1, $)',
    params: [
      ['series', 'series int/float'],
      ['title', 'const string'],
      ['color', 'series color'],
      ['linewidth', 'input int'],
      ['style', 'input plot_style'],
      ['trackprice', 'input bool'],
      ['histbase', 'input int/float'],
      ['join', 'input bool'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
      ['linestyle', 'input plot_line_style'],
    ],
  },
  {
    fn: 'plotshape',
    entry: 2,
    call: 'plotshape(true, $)',
    params: [
      ['series', 'series int/float/bool'],
      ['title', 'const string'],
      ['style', 'input string'],
      ['location', 'input string'],
      ['color', 'series color'],
      ['text', 'const string'],
      ['textcolor', 'series color'],
      ['editable', 'input bool'],
      ['size', 'const string'],
      ['show_last', 'input int'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'plotchar',
    entry: 3,
    call: 'plotchar(true, $)',
    params: [
      ['series', 'series int/float/bool'],
      ['title', 'const string'],
      ['char', 'input string'],
      ['location', 'input string'],
      ['color', 'series color'],
      ['text', 'const string'],
      ['textcolor', 'series color'],
      ['editable', 'input bool'],
      ['size', 'const string'],
      ['show_last', 'input int'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'plotarrow',
    entry: 4,
    call: 'plotarrow(1, $)',
    params: [
      ['series', 'series int/float'],
      ['title', 'const string'],
      ['colorup', 'series color'],
      ['colordown', 'series color'],
      ['minheight', 'input int'],
      ['maxheight', 'input int'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'plotbar',
    entry: 5,
    call: 'plotbar(1, 3, -1, 2, $)',
    params: [
      ['open', 'series int/float'],
      ['high', 'series int/float'],
      ['low', 'series int/float'],
      ['close', 'series int/float'],
      ['title', 'const string'],
      ['color', 'series color'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'plotcandle',
    entry: 6,
    call: 'plotcandle(1, 3, -1, 2, $)',
    params: [
      ['open', 'series int/float'],
      ['high', 'series int/float'],
      ['low', 'series int/float'],
      ['close', 'series int/float'],
      ['title', 'const string'],
      ['color', 'series color'],
      ['wickcolor', 'series color'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['bordercolor', 'series color'],
      ['display', 'input plot_display'],
      ['format', 'input string'],
      ['precision', 'input int'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'barcolor',
    entry: 7,
    call: 'barcolor(color=#123456, $)',
    params: [
      ['color', 'series color'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['title', 'const string'],
      ['display', 'input plot_simple_display'],
    ],
  },
  {
    fn: 'bgcolor',
    entry: 8,
    call: 'bgcolor(color=#123456, $)',
    params: [
      ['color', 'series color'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['title', 'const string'],
      ['display', 'input plot_simple_display'],
      ['force_overlay', 'const bool'],
    ],
  },
  {
    fn: 'hline',
    entry: 56,
    call: 'hline(100, $)',
    params: [
      ['price', 'input int/float'],
      ['title', 'const string'],
      ['linestyle', 'input hline_style'],
      ['linewidth', 'input int'],
      ['editable', 'input bool'],
      ['display', 'input plot_simple_display'],
    ],
  },
  {
    fn: 'fill',
    entry: 57,
    call: 'fill(a, b, top_value=3, bottom_value=-1, top_color=#123456, bottom_color=#654321, $)',
    params: [
      ['top_value', 'series int/float'],
      ['bottom_value', 'series int/float'],
      ['top_color', 'series color'],
      ['bottom_color', 'series color'],
      ['title', 'const string'],
      ['display', 'input plot_simple_display'],
      ['fillgaps', 'const bool'],
      ['editable', 'input bool'],
    ],
  },
  {
    fn: 'fill',
    entry: 58,
    call: 'fill(a, b, color=#123456, $)',
    params: [
      ['color', 'series color'],
      ['title', 'const string'],
      ['editable', 'input bool'],
      ['fillgaps', 'const bool'],
      ['display', 'input plot_simple_display'],
    ],
  },
  {
    fn: 'fill',
    entry: 59,
    call: 'fill(a, b, color=#123456, $)',
    params: [
      ['color', 'series color'],
      ['title', 'const string'],
      ['editable', 'input bool'],
      ['show_last', 'input int'],
      ['fillgaps', 'const bool'],
      ['display', 'input plot_simple_display'],
    ],
  },
] as const;

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Visual contracts")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

function argument(type: string, qualifier: string, name: string): string {
  let first = '2';
  let second = '3';
  if (type.includes('string')) {
    first =
      name === 'size'
        ? '"tiny"'
        : name === 'format'
          ? '"price"'
          : name === 'location'
            ? '"abovebar"'
            : name === 'style'
              ? '"xcross"'
              : name === 'char'
                ? '"★"'
                : '"Token"';
    second =
      name === 'size'
        ? '"huge"'
        : name === 'format'
          ? '"volume"'
          : name === 'location'
            ? '"belowbar"'
            : name === 'style'
              ? '"diamond"'
              : name === 'char'
                ? '"☆"'
                : '"Other"';
  }
  if (type.includes('bool')) {
    first = 'false';
    second = 'true';
  }
  if (type.includes('color')) {
    first = '#123456';
    second = '#654321';
  }
  if (type.includes('plot_style')) {
    first = 'plot.style_line';
    second = 'plot.style_circles';
  }
  if (type.includes('plot_line_style')) {
    first = 'plot.linestyle_dotted';
    second = 'plot.linestyle_dashed';
  }
  if (type.includes('hline_style')) {
    first = 'hline.style_dotted';
    second = 'hline.style_dashed';
  }
  if (type.includes('display')) {
    first = 'display.none';
    second = 'display.all';
  }
  if (qualifier === 'const') return first;
  if (qualifier === 'input') {
    if (first.startsWith('"')) return `input.string(${first})`;
    if (first.startsWith('#')) return `input.color(${first})`;
    if (first === 'false') return 'input.bool(false)';
    if (first === '2') return 'input.int(2)';
    return `input.bool(false) ? ${first} : ${second}`;
  }
  const condition = qualifier === 'simple' ? 'syminfo.mintick > 0' : 'bar_index > 0';
  return `${condition} ? ${first} : ${second}`;
}

function source(contract: (typeof contracts)[number], name: string, value: string) {
  const prelude =
    contract.entry === 58
      ? 'a = hline(3)\nb = hline(-1)\n'
      : contract.fn === 'fill'
        ? 'a = plot(3)\nb = plot(-1)\n'
        : '';
  let call: string = contract.call;
  call = call.replace(new RegExp(`([,(] ?)${name}=[^,]+, `), '$1');
  if (name === 'series') call = call.replace(/^[^(]+\((?:1|true), /, `${contract.fn}(`);
  if (['open', 'high', 'low', 'close', 'price'].includes(name)) {
    const defaults: Record<string, string> =
      contract.fn === 'hline' ? { price: '100' } : { open: '1', high: '3', low: '-1', close: '2' };
    const base = Object.entries(defaults)
      .filter(([slot]) => slot !== name)
      .map(([slot, expr]) => `${slot}=${expr}`)
      .join(', ');
    call = `${contract.fn}(${base ? `${base}, ` : ''}$)`;
  }
  return prelude + call.replace('$', `${name}=${value}`);
}

describe('Pine v6 visual parameter qualifier boundaries', () => {
  for (const contract of contracts) {
    for (const [name, type] of contract.params) {
      const maximum = type.split(' ')[0];
      it(`accepts ${contract.fn}:${name} ${maximum} [functions[${contract.entry}]]`, () => {
        expect(errors(source(contract, name, argument(type, maximum, name)))).toEqual([]);
      });
      if (maximum === 'series') continue;
      const stronger = maximum === 'const' ? 'input' : maximum === 'input' ? 'simple' : 'series';
      it(`refuses ${contract.fn}:${name} ${stronger} [functions[${contract.entry}]]`, () => {
        expect(errors(source(contract, name, argument(type, stronger, name)))).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(name) }),
          ]),
        );
      });
    }
  }
});
