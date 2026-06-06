import type { Program } from '../parser/ast';
import type { SemanticCheckOptions } from '../semantic';

export function semanticOptionsFromLibraries(libraries?: Map<string, Program>): SemanticCheckOptions {
  return libraries ? { libraries } : {};
}
