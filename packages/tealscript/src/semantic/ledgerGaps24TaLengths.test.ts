import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const members = [
  ['correlation', 'source1=close, source2=open', 'close, open', 927],
  ['percentrank', 'source=close', 'close', 937],
  ['mfi', 'source=hlc3', 'hlc3', 951],
  ['cci', 'source=close', 'close', 960],
] as const;
const qualifiers = ['const', 'input', 'simple', 'series'] as const;

function declaration(kind: 'int' | 'float', qualifier: (typeof qualifiers)[number]): string {
  const literal = kind === 'int' ? '3' : '3.0';
  const value =
    qualifier === 'input'
      ? `input.${kind}(${literal}, "Length")`
      : qualifier === 'series'
        ? kind === 'int'
          ? 'bar_index % 3 + 1'
          : 'close'
        : literal;
  return `${qualifier} ${kind} length = ${value}`;
}

function diagnostics(version: number, definition: string, call: string) {
  return checkProgram(parse(`//@version=${version}\nindicator("Ledger gaps 24")\n${definition}\nplot(${call})`))
    .diagnostics;
}

// Reference integer lengths: type-qualifier-system-v3 rows377/381/392/409.
describe.each([5, 6])('ledger gaps 24 integer lengths, v%i', (version) => {
  describe.each(members)('ta.%s', (member, namedSources, positionalSources) => {
    it.each(qualifiers)('rejects %s float length in named and positional calls', (qualifier) => {
      for (const call of [
        `ta.${member}(${namedSources}, length=length)`,
        `ta.${member}(${positionalSources}, length)`,
      ]) {
        expect
          .soft(diagnostics(version, declaration('float', qualifier), call))
          .toEqual([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringContaining(`ta.${member} length must be an integer, got`),
            }),
          ]);
      }
    });

    it.each(qualifiers)('accepts %s integer length in named and positional calls', (qualifier) => {
      for (const call of [
        `ta.${member}(${namedSources}, length=length)`,
        `ta.${member}(${positionalSources}, length)`,
      ]) {
        expect(diagnostics(version, declaration('int', qualifier), call)).toEqual([]);
      }
    });
  });
});
