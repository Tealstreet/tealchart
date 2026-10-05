import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: TV v2 linefill CE10123; v6 line/label reference admits equality.
// Other drawing families await separate v4 native outcome probes.
const constructors = [
  ['line', 'line.new(0,13,1,-7)'],
  ['label', 'label.new(0,13)'],
  ['box', 'box.new(0,13,1,-7)'],
  ['table', 'table.new(position.top_left,1,1)'],
  ['polyline', 'polyline.new(array.from(chart.point.from_index(0,13),chart.point.from_index(1,-7)))'],
  ['linefill', 'linefill.new(line.new(0,13,1,-7),line.new(0,19,1,-23),color.red)'],
  ['chart.point', 'chart.point.from_index(0,13)'],
] as const;
const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("ID operators")\n${body}`));
describe('Drawing equality authority boundaries', () => {
  for (const [family, create] of constructors.filter(([family]) => family === 'linefill')) {
    for (const operator of ['==']) {
      for (const expression of [
        `a ${operator} b`,
        `a ${operator} 1`,
        `1 ${operator} a`,
        `array.get(array.from(a),0) ${operator} b`,
      ]) {
        it(`refuses ${family} ${expression}`, () => {
          const result = check(`a=${create}\nb=a\nvalue=${expression}`);
          expect(result.diagnostics).toEqual([
            expect.objectContaining({
              code: 'invalid-operator-operands',
              message: expect.stringContaining(`Operator ${operator} does not support operands`),
            }),
          ]);
        });
      }
    }
    for (const expression of ['a != b', 'a != 1', '1 != a', 'array.get(array.from(a),0) != b']) {
      it.todo(`native-required: ${family} ${expression}; equality capture does not settle inequality`);
    }
  }
  for (const [family, create] of constructors.filter(([family]) => ['line', 'label'].includes(family))) {
    for (const operator of ['==', '!=']) {
      it(`${family} aliases allow ${operator}`, () => {
        const body = `a=${create}\nb=a\nplot(a ${operator} b ? 1 : 0,"OUTCOME")`;
        expect(check(body).diagnostics).toEqual([]);
        const result = runCompatScript(`//@version=6\nindicator("Reference equality")\n${body}`, {
          bars: compatibilityBars.slice(0, 1),
        });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'OUTCOME').values).toEqual([operator === '==' ? 1 : 0]);
      });
      it(`${family} method copies allow ${operator} and retain distinct identity`, () => {
        const body = `a=${create}\nb=a.copy()\nplot(a ${operator} b ? 1 : 0,"OUTCOME")`;
        expect(check(body).diagnostics).toEqual([]);
        const result = runCompatScript(`//@version=6\nindicator("Copy equality")\n${body}`, {
          bars: compatibilityBars.slice(0, 1),
        });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'OUTCOME').values).toEqual([operator === '==' ? 0 : 1]);
      });
    }
  }
  for (const [family, create] of constructors)
    it(`na predicate accepts ${family} references`, () => {
      expect(check(`a=${create}\nvalue=na(a)`).diagnostics).toEqual([]);
    });
  for (const [family, create] of constructors.filter(([family]) =>
    ['line', 'label', 'box', 'chart.point'].includes(family),
  )) {
    it(`${family} copy method retains its reference result type`, () => {
      const result = check(`a=${create}\nvalue=a.copy()`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind: family, qualifier: 'series' });
    });
  }
  for (const method of [false, true]) {
    for (const operator of ['==', '!='])
      it(`linefill parent line IDs allow method=${method} ${operator}`, () => {
        expect(
          check(
            `a=${constructors.find(([f]) => f === 'linefill')![1]}\nvalue=${method ? 'a.get_line1()' : 'linefill.get_line1(a)'} ${operator} ${method ? 'a.get_line2()' : 'linefill.get_line2(a)'}`,
          ).diagnostics,
        ).toEqual([]);
      });
  }
  for (const getter of ['get_line1', 'get_line2'])
    it(`linefill.${getter} method retains series line result`, () => {
      const result = check(`a=${constructors.find(([f]) => f === 'linefill')![1]}\nvalue=a.${getter}()`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind: 'line', qualifier: 'series' });
    });
  it('local copy method returning int keeps valid scalar equality', () => {
    expect(check(`method copy(line self)=>7\na=line.new(0,13,1,-7)\nvalue=a.copy()==7`).diagnostics).toEqual([]);
  });
  it('local parent getter returning string keeps valid scalar inequality', () => {
    expect(
      check(
        `method get_line1(linefill self)=>"local"\na=${constructors.find(([f]) => f === 'linefill')![1]}\nvalue=a.get_line1()!="other"`,
      ).diagnostics,
    ).toEqual([]);
  });
  for (const [type, left, right] of [
    ['int', '1', '2'],
    ['float', '1.25', '2.5'],
    ['bool', 'true', 'false'],
    ['color', 'color.red', 'color.blue'],
    ['string', '"a"', '"b"'],
  ] as const) {
    for (const operator of ['==', '!='])
      it(`${type} ${operator} remains valid`, () => {
        expect(check(`value=${left} ${operator} ${right}`).diagnostics).toEqual([]);
      });
  }
  for (const operator of ['==', '!='])
    it(`enum ${operator} remains valid`, () => {
      expect(
        check(`enum Choice\n    first\n    second\nvalue=Choice.first ${operator} Choice.second`).diagnostics,
      ).toEqual([]);
    });
});
