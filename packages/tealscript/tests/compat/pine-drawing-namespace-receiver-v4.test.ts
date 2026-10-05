import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

describe('drawing namespace and receiver separation', () => {
  it('accepts v4 namespace deletion of a previous line instance', () => {
    expect(
      errors(`//@version=4
study("previous line")
line target = line.new(0, close, bar_index, close)
line.delete(target[1])
plot(close)`),
    ).toEqual([]);
  });

  it('accepts v4 namespace coordinate setters on a typed missing line', () => {
    expect(
      errors(`//@version=4
study("line coordinates")
var line target = na
line.set_xy1(target, 0, close)
line.set_xy2(target, bar_index, close)
plot(close)`),
    ).toEqual([]);
  });

  it('accepts v4 namespace deletion of two persistent line IDs', () => {
    expect(
      errors(`//@version=4
study("two lines")
var line first = na
var line second = na
line.delete(first)
line.delete(second)
plot(close)`),
    ).toEqual([]);
  });

  for (const version of [5, 6]) {
    it(`preserves v${version} namespace line deletion`, () => {
      expect(
        errors(`//@version=${version}
indicator("line namespace")
line target = line.new(0, close, bar_index, close)
line.delete(target)
plot(close)`),
      ).toEqual([]);
    });
  }

  for (const declaration of ['string line = "bad"', 'int line = 1']) {
    it(`refuses a locally shadowed drawing receiver: ${declaration}`, () => {
      expect(
        errors(`//@version=4
study("shadowed receiver")
${declaration}
line.delete()
plot(close)`),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringContaining('drawing receiver'),
          }),
        ]),
      );
    });
  }
});
