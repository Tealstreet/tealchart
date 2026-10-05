import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Reference functions[57]: numeric gradient bounds precede two series colors.
// Corpus v7:439 supplies these bounds through a conditional UDT tuple.
// Stops can have unresolved kinds; known color slots distinguish the overload.
const tupleBounds = `
type Volume
    float buy = 0
    float sell = 0
var array<Volume> bars = array.new<Volume>()
getValues() =>
    if array.size(bars) > 0
        Volume last = array.get(bars, array.size(bars) - 1)
        [last.buy, last.sell]
    else
        [na, na]
[buy, sell] = getValues()
a = plot(buy)
b = plot(sell)
`;

function errors(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("Gradient inference")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

function conditionalBounds(kind: 'int' | 'float' | 'string' | 'bool', missingFirst = false) {
  const value = { int: '1', float: '1.0', string: '"bad"', bool: 'true' }[kind];
  const fields = '[last.top, last.bottom]';
  return `
type Bounds
    ${kind} top
    ${kind} bottom
var bars = array.new<Bounds>()
array.push(bars, Bounds.new(${value}, ${value}))
getBounds() =>
    if array.size(bars) > 0
        Bounds last = array.get(bars, 0)
        ${missingFirst ? '[na, na]' : fields}
    else
        ${missingFirst ? 'Bounds last = array.get(bars, 0)' : ''}
        ${missingFirst ? fields : '[na, na]'}
[top, bottom] = getBounds()
a = plot(close)
b = plot(open)
`;
}

describe('Pine gradient fill with inferred tuple bounds', () => {
  // Reference functions[57] allows int/float top_value and bottom_value.
  // A missing tuple arm must not hide a known nonnumeric UDT field kind.
  for (const version of [5, 6]) {
    for (const missingFirst of [false, true]) {
      for (const kind of ['string', 'bool'] as const) {
        for (const call of [
          'fill(a, b, top, bottom, color.red, color.blue)',
          'fill(a, b, top_value=top, bottom_value=bottom, top_color=color.red, bottom_color=color.blue)',
        ]) {
          it(`refuses conditional ${kind} bounds with missingFirst=${missingFirst} in v${version}: ${call}`, () => {
            expect(errors(conditionalBounds(kind, missingFirst) + call, version)).toEqual(
              expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
            );
          });
        }
      }
      for (const kind of ['int', 'float'] as const) {
        it(`accepts conditional ${kind} bounds with missingFirst=${missingFirst} in v${version}`, () => {
          expect(
            errors(conditionalBounds(kind, missingFirst) + 'fill(a, b, top, bottom, color.red, color.blue)', version),
          ).toEqual([]);
        });
      }
    }
  }

  for (const slot of ['top', 'bottom']) {
    it(`retains a nonnumeric ${slot} in a partially missing tuple`, () => {
      const body = conditionalBounds('string')
        .replace(`string ${slot === 'top' ? 'bottom' : 'top'}`, `float ${slot === 'top' ? 'bottom' : 'top'}`)
        .replace('Bounds.new("bad", "bad")', slot === 'top' ? 'Bounds.new("bad", 1.0)' : 'Bounds.new(1.0, "bad")')
        .replace('[na, na]', slot === 'top' ? '[na, 0.0]' : '[0.0, na]');
      expect(
        errors(body + 'fill(a, b, top_value=top, bottom_value=bottom, top_color=color.red, bottom_color=color.blue)'),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(`${slot}_value`) }),
        ]),
      );
    });
  }

  for (const version of [5, 6]) {
    for (const call of [
      'fill(a, b, math.max(buy, sell), math.min(buy, sell), color.red, color.blue)',
      'fill(a, b, math.max(buy, sell), math.min(buy, sell), buy > sell ? color.new(color.red, 50) : color(na), color.new(chart.bg_color, 100), "Gradient", display.none, false, true)',
    ]) {
      it(`selects gradient colors after unresolved bounds in v${version}: ${call}`, () => {
        expect(errors(tupleBounds + call, version)).toEqual([]);
      });
    }
  }

  it('retains explicitly named gradient binding', () => {
    expect(
      errors(
        tupleBounds +
          'fill(a, b, top_value=math.max(buy, sell), bottom_value=math.min(buy, sell), top_color=color.red, bottom_color=color.blue)',
      ),
    ).toEqual([]);
  });

  for (const call of [
    'fill(a, b, color.red, "Flat", false, 3, true, display.none)',
    'fill(a, b, color.red, "Flat", false, 3)',
  ]) {
    it(`retains positional flat fill binding: ${call}`, () => {
      expect(errors('a = plot(close)\nb = plot(open)\n' + call)).toEqual([]);
    });
  }

  it('retains numeric kind refusal for a known string gradient bound', () => {
    expect(errors('a = plot(close)\nb = plot(open)\nfill(a, b, "bad", 0, color.red, color.blue)')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });

  it('retains gradient color kind refusal', () => {
    expect(errors('a = plot(close)\nb = plot(open)\nfill(a, b, 10, 0, true, color.blue)')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('top_color') }),
      ]),
    );
  });
});
