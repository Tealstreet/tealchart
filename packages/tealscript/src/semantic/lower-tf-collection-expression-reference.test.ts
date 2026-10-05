import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const declarations = `type Packet
    array<float> values
    matrix<float> grid
    map<string, float> lookup`;

function diagnostics(expression: string) {
  return checkProgram(
    parse(`//@version=6
indicator("Lower timeframe collection expression")
${declarations}
result = request.security_lower_tf(symbol=syminfo.tickerid, timeframe="1", expression=${expression})`),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

// fun_request.security_lower_tf expression forbids direct collections and permits collection fields in UDTs.
// Native scalar/tuple captures remain controls, not proof of this unobserved refusal's wording.
describe('lower timeframe collection expression reference', () => {
  it.each([
    'array.new_float(1, close)',
    'matrix.new<float>(1, 1, close)',
    'map.new<string, float>()',
    '[close, array.new_float(1, close)]',
  ])('refuses a direct collection expression %s', (expression) => {
    expect(diagnostics(expression).map((diagnostic) => diagnostic.code)).toContain('request-expression-collection');
  });

  it.each([
    'close',
    '[close, high]',
    'Packet.new(array.new_float(1, close), matrix.new<float>(1, 1, close), map.new<string, float>())',
  ])('admits scalar, tuple or wrapped collection expression %s', (expression) => {
    expect(diagnostics(expression)).toEqual([]);
  });
});
