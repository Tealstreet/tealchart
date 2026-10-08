import type { SemanticQualifier } from './checker';

const SIMPLE_INPUT_RESULTS = new Set([
  'str.contains', 'str.startswith', 'str.endswith', 'str.length', 'str.pos',
]);

export function stringResultQualifier(name: string, argumentQualifier: SemanticQualifier | undefined, pineVersion: number): SemanticQualifier | undefined {
  if (pineVersion < 6) return argumentQualifier;
  if (name === 'str.format_time') return 'series';
  if (!argumentQualifier) return undefined;
  if (name === 'str.match') return argumentQualifier === 'series' ? 'series' : 'simple';
  return argumentQualifier === 'input' && SIMPLE_INPUT_RESULTS.has(name) ? 'simple' : argumentQualifier;
}
