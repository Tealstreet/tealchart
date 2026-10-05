import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const errors = (declarations: string) =>
  checkProgram(
    parse(`//@version=6
indicator("varip eligibility")
${declarations}
plot(close)`),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

describe('varip collection element eligibility', () => {
  it.each([
    ['int', '1'],
    ['float', '1.5'],
    ['bool', 'true'],
    ['color', 'color.red'],
    ['string', '"value"'],
  ])('admits fundamental %s variables', (kind, value) => {
    expect(errors(`varip ${kind} value = ${value}`)).toEqual([]);
  });

  it.each(['line', 'label', 'box', 'table'])('refuses map values containing %s IDs', (kind) => {
    expect(errors(`varip map<int, ${kind}> values = map.new<int, ${kind}>()`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });

  it.each(['array', 'matrix', 'map'])('refuses drawing fields in %s UDT elements', (kind) => {
    const template = kind === 'map' ? 'int, Item' : 'Item';
    expect(
      errors(`type Item
    line drawing
varip ${kind}<${template}> values = ${kind}.new<${template}>()`),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]));
  });

  it('refuses a drawing nested through a collection field', () => {
    expect(
      errors(`type Item
    map<int, line> drawings
varip array<Item> values = array.new<Item>()`),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]));
  });

  it('admits a direct UDT variable independently of its fields', () => {
    expect(
      errors(`type Item
    line drawing
varip Item value = Item.new()`),
    ).toEqual([]);
  });

  it('refuses imported UDT drawing fields through an exported collection wrapper', () => {
    const library = parse(`//@version=6
library("Eligibility")
export type Item
    line drawing
export type Wrapper
    array<Item> items`);
    const program = parse(`//@version=6
import Test/Eligibility/1 as eligibility
indicator("imported eligibility")
varip array<eligibility.Wrapper> values = array.new<eligibility.Wrapper>()
plot(close)`);
    expect(checkProgram(program, { libraries: new Map([['Test/Eligibility/1', library]]) }).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('varip') }),
      ]),
    );
  });

  it.each(['array', 'matrix', 'map'])('admits fundamental and chart.point fields in %s elements', (kind) => {
    const template = kind === 'map' ? 'int, Item' : 'Item';
    expect(
      errors(`type Item
    float value
    chart.point point
    array<float> samples
varip ${kind}<${template}> values = ${kind}.new<${template}>()`),
    ).toEqual([]);
  });
});
