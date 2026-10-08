import type { SemanticDiagnostic } from '../../src/semantic/checker';

import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

interface IntegerParameter {
  member: string;
  parameter: string;
  entries: { const: number; input: number; series: number };
  positional: (value: string) => string;
  named: (value: string) => string;
}

// Literal type oracles: pine-v6-reference-v1.json, parameter allowedTypeIDs.
// This certifies admission only; rolling arithmetic and missing-source semantics are separate.
const parameters: IntegerParameter[] = [
  {
    member: 'math.sum',
    parameter: 'length',
    entries: { const: 173, input: 173, series: 173 },
    positional: (value) => `math.sum(close, ${value})`,
    named: (value) => `math.sum(length=${value}, source=close)`,
  },
];

const floatCases = [
  { name: 'fractional const float', value: '1.5', qualifier: 'const', binding: 'positional' },
  { name: 'integral-valued explicit float', value: 'float(1)', qualifier: 'const', binding: 'named' },
  { name: 'input float', value: 'input.float(1.5)', qualifier: 'input', binding: 'named' },
  { name: 'series float', value: 'bar_index + 0.5', qualifier: 'series', binding: 'positional' },
] as const;

for (const parameter of parameters) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${parameter.member}`;
  const openDefect = `${parameter.member.replace('.', '-')}-admits-float-${parameter.parameter}`;
  const check = (call: string) =>
    checkProgram(parse(`//@version=6\nindicator("Selected integer parameter")\nvalue = ${call}\nplot(close)`));
  describe(`${parameter.member} ${parameter.parameter} integer contract`, () => {
    for (const testCase of floatCases) {
      describe(`${testCase.binding} ${testCase.name} [functions:${parameter.entries[testCase.qualifier]}] [FIXED-CONTRACT: ${openDefect}]`, () => {
        let diagnostics: SemanticDiagnostic[];
        beforeAll(() => {
          diagnostics = check(parameter[testCase.binding](testCase.value)).diagnostics;
          expect(
            diagnostics.filter(
              (diagnostic) =>
                diagnostic.code !== 'type-mismatch' ||
                !diagnostic.message.includes(`${parameter.member} ${parameter.parameter} must be an integer`),
            ),
            citation,
          ).toEqual([]);
        });
        it('refuses float arguments rather than truncating or admitting numeric values', () => {
          expect(diagnostics, citation).toEqual([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringContaining(`${parameter.member} ${parameter.parameter} must be an integer`),
            }),
          ]);
        });
      });
    }

    for (const [qualifier, value] of [
      ['const', '1'],
      ['input', 'input.int(1)'],
      ['series', 'bar_index'],
    ] as const) {
      it(`admits ${qualifier} int [functions:${parameter.entries[qualifier]}]`, () => {
        expect(check(parameter.named(value)).diagnostics, citation).toEqual([]);
      });
    }

    for (const [kind, value] of [
      ['string', '"1"'],
      ['boolean', 'true'],
    ] as const) {
      it(`refuses ${kind} rather than coercing it [functions:${parameter.entries.const}]`, () => {
        expect(check(parameter.positional(value)).diagnostics, citation).toEqual([
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringContaining(`${parameter.member} ${parameter.parameter} must be`),
          }),
        ]);
      });
    }
  });
}

it('math.sum preserves float source beside integer length [functions:173]', () => {
  const result = checkProgram(
    parse(`//@version=6\nindicator("Sum source type")\nvalue = math.sum(source=1.25, length=1)\nplot(value)`),
  );
  expect(result.diagnostics, 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.sum').toEqual([]);
});
