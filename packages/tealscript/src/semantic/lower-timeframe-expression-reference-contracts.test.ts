import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// fun_request.security_lower_tf expression: collections require an object field wrapper.
describe('lower timeframe request expression collections', () => {
  it.each([
    ['array', 'array.from(close)'],
    ['matrix', 'matrix.new<float>(1, 1, close)'],
    ['map', 'map.new<string, float>()'],
    ['tuple containing an array', '[close, array.from(close)]'],
  ])('rejects a directly returned %s', (_name, expression) => {
    const result = checkProgram(parse(`//@version=6
indicator("Lower timeframe collection")
requested = request.security_lower_tf("TEST", "1", ${expression})`));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'request-expression-collection', severity: 'error' }),
    ]));
  });

  it('rejects a collection returned through a user function', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Lower timeframe collection")
collection() => array.from(close)
requested = request.security_lower_tf(expression=collection(), symbol="TEST", timeframe="1")`));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'request-expression-collection', severity: 'error' }),
    ]));
  });

  it.each(['array<float>', 'matrix<float>', 'map<string, float>'])('allows a %s inside an object field', (fieldType) => {
    const initial = fieldType === 'array<float>' ? 'array.from(close)'
      : fieldType === 'matrix<float>' ? 'matrix.new<float>(1, 1, close)' : 'map.new<string, float>()';
    const result = checkProgram(parse(`//@version=6
indicator("Lower timeframe wrapped collection")
type Packet
    ${fieldType} values
requested = request.security_lower_tf("TEST", "1", Packet.new(${initial}))`));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'requested')?.type)
      .toMatchObject({ kind: 'array', elementType: { kind: 'udt', name: 'Packet' } });
  });
});
