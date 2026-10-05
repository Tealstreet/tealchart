import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Collection result kinds")\n${body}`)).diagnostics;
}

describe('collection ranks 241-280 result kinds', () => {
  for (const receiver of [false, true]) {
    const call = (member: string, arguments_: string = '') => receiver
      ? `a.${member}(${arguments_})`
      : `array.${member}(a${arguments_ ? `, ${arguments_}` : ''})`;

    it(`max preserves integer element kind, receiver=${receiver}`, () => {
      expect(diagnostics(`a = array.from(7, 3)\nseries int result = ${call('max', '0')}`)).toEqual([]);
    });

    it(`max preserves float element kind, receiver=${receiver}`, () => {
      expect(diagnostics(`a = array.from(7.5, 3.25)\nseries float result = ${call('max', '0')}`)).toEqual([]);
      expect(diagnostics(`a = array.from(7.5, 3.25)\nseries int result = ${call('max', '0')}`).some(diagnostic => diagnostic.code === 'type-mismatch')).toBe(true);
    });

    for (const [type, elements] of [['int', '7, 3'], ['float', '7.5, 3.25'], ['bool', 'true, false'], ['string', '"first", "last"']]) {
      it(`first preserves ${type} element kind, receiver=${receiver}`, () => {
        expect(diagnostics(`a = array.from(${elements})\nseries ${type} result = ${call('first')}`)).toEqual([]);
      });

      it(`first ${type} element kind retains the series floor, receiver=${receiver}`, () => {
        expect(diagnostics(`a = array.from(${elements})\nconst ${type} result = ${call('first')}`).some(diagnostic => diagnostic.code === 'qualifier-mismatch')).toBe(true);
      });
    }

    it(`first refuses float-to-integer narrowing, receiver=${receiver}`, () => {
      expect(diagnostics(`a = array.from(7.5, 3.25)\nseries int result = ${call('first')}`).some(diagnostic => diagnostic.code === 'type-mismatch')).toBe(true);
    });

    it(`indexof returns integer kind from a string array, receiver=${receiver}`, () => {
      expect(diagnostics(`a = array.from("first", "last")\nseries int result = ${call('indexof', '"last"')}`)).toEqual([]);
    });
  }
});
