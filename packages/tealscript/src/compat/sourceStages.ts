import {
  parse,
  TealscriptParseError,
} from '../parser';
import { checkProgram } from '../semantic';
import type { SemanticCheckOptions } from '../semantic';

import type {
  CompatibilityDiagnostic,
  CompatibilityFailureClass,
  CompatibilityStageOutcome,
} from './index';

export function createPineParseSemanticStageOutcomes(
  source: string,
  semanticOptions: SemanticCheckOptions = {},
): CompatibilityStageOutcome[] {
  try {
    const program = parse(source);
    const semanticResult = checkProgram(program, semanticOptions);

    if (semanticResult.diagnostics.length > 0) {
      const diagnostics = semanticResult.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        message: diagnostic.message,
        line: diagnostic.line,
        column: diagnostic.column,
      }));

      return [
        { stage: 'parse', status: 'passed' },
        {
          stage: 'semantic',
          status: 'failed',
          failureClass: classifySemanticDiagnostics(diagnostics),
          diagnostics,
        },
      ];
    }

    return [
      { stage: 'parse', status: 'passed' },
      { stage: 'semantic', status: 'passed' },
    ];
  } catch (error) {
    return [{
      stage: 'parse',
      status: 'failed',
      failureClass: 'parse_gap',
      message: error instanceof Error ? error.message : String(error),
      diagnostics: createParseCompatibilityDiagnostics(error),
    }];
  }
}

function classifySemanticDiagnostics(diagnostics: CompatibilityDiagnostic[]): CompatibilityFailureClass {
  return diagnostics.some((diagnostic) => diagnostic.code === 'unsupported-feature')
    ? 'unsupported_planned'
    : 'semantic_gap';
}

function createParseCompatibilityDiagnostics(error: unknown): CompatibilityDiagnostic[] {
  if (error instanceof TealscriptParseError) {
    return [{
      code: 'parse.error',
      message: error.message,
      line: error.location.start.line,
      column: error.location.start.column,
    }];
  }
  if (error instanceof Error) {
    return [{ code: 'parse.error', message: error.message }];
  }
  return [{ code: 'parse.error', message: String(error) }];
}
