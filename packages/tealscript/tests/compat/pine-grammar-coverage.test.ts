import { describe, expect, it } from 'vitest';

import {
  PINE_V6_GRAMMAR_CONSTRUCTS,
  PINE_V6_KNOWN_MISSING_GRAMMAR,
  summarizePineV6GrammarCoverage,
  type PineV6GrammarConstruct,
} from '../../src/compat/pineV6GrammarReference';
import { parse, TealscriptParseError } from '../../src/parser';
import type { Program } from '../../src/parser/ast';
import { checkProgram } from '../../src/semantic';

interface GrammarCheckOutcome {
  passed: boolean;
  stage?: 'parse' | 'semantic';
  message?: string;
}

function checkConstruct(construct: PineV6GrammarConstruct): GrammarCheckOutcome {
  let program: Program;
  try {
    program = parse(construct.snippet);
  } catch (error) {
    const message = error instanceof TealscriptParseError ? error.message : String(error);
    return { passed: false, stage: 'parse', message };
  }

  const diagnostics = checkProgram(program, { libraries: GRAMMAR_COVERAGE_LIBRARIES }).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  if (diagnostics.length > 0) {
    return {
      passed: false,
      stage: 'semantic',
      message: diagnostics.map((diagnostic) => diagnostic.message).join('; '),
    };
  }

  return { passed: true };
}

const GRAMMAR_COVERAGE_LIBRARIES = new Map<string, Program>([
  [
    'TestUser/RangeTools/1',
    parse(`
//@version=6
library("RangeTools")
export spread(float highValue, float lowValue) => highValue - lowValue
`),
  ],
]);

describe('Pine v6 grammar coverage inventory', () => {
  const knownMissing = new Set<string>(PINE_V6_KNOWN_MISSING_GRAMMAR);
  const coveredConstructs = PINE_V6_GRAMMAR_CONSTRUCTS.filter((construct) => !knownMissing.has(construct.id));
  const missingConstructs = PINE_V6_GRAMMAR_CONSTRUCTS.filter((construct) => knownMissing.has(construct.id));

  it.each(coveredConstructs)('parses and typechecks $id', (construct) => {
    expect(checkConstruct(construct)).toEqual({ passed: true });
  });

  it('keeps known-missing grammar allowlist current', () => {
    expect(PINE_V6_KNOWN_MISSING_GRAMMAR).toEqual([]);

    const constructIds = new Set(PINE_V6_GRAMMAR_CONSTRUCTS.map((construct) => construct.id));
    for (const missingId of PINE_V6_KNOWN_MISSING_GRAMMAR) {
      expect(constructIds.has(missingId)).toBe(true);
    }

    const unexpectedlyPassing = missingConstructs
      .filter((construct) => checkConstruct(construct).passed)
      .map((construct) => construct.id);

    expect(unexpectedlyPassing).toEqual([]);
  });

  it('reports the committed v6 grammar coverage count', () => {
    expect(summarizePineV6GrammarCoverage()).toMatchObject({
      total: 63,
      covered: 63,
      missing: 0,
    });
  });
});
