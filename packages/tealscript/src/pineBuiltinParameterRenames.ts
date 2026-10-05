import type { CallArgument } from './parser/ast';
import { pineVersionRules } from './pineVersionRules';

// Published v4 -> v5 slot renames. Keep modern names canonical internally;
// legacy aliases are accepted only before the namespace migration boundary.
export const PINE_V4_BUILTIN_PARAMETER_RENAMES: ReadonlyMap<string, Readonly<Record<string, string>>> = new Map<string, Readonly<Record<string, string>>>([
  ['math.exp', { x: 'number' }],
  ['math.round', { x: 'number' }],
  ['math.log10', { x: 'number' }],
  ['ta.correlation', { source_a: 'source1', source_b: 'source2' }],
  ['math.round_to_mintick', { x: 'number' }],
  ['math.sqrt', { x: 'number' }],
  ['math.log', { x: 'number' }],
  ['math.floor', { x: 'number' }],
  ['math.cos', { x: 'number' }],
  ['math.sin', { x: 'number' }],
  ['math.ceil', { x: 'number' }],
  ['math.asin', { x: 'number' }],
  ['math.atan', { x: 'number' }],
  ['math.acos', { x: 'number' }],
  ['ta.swma', { x: 'source' }],
  ['ta.crossover', { x: 'source1', y: 'source2' }],
  ['ta.rsi', { x: 'source', y: 'length' }],
  ['math.sign', { x: 'number' }],
  ['ta.cum', { x: 'source' }],
  ['str.tonumber', { x: 'string' }],
  ['ta.cross', { x: 'source1', y: 'source2' }],
]);

export function legacyBuiltinParameterAliases(name: string, version: number): Readonly<Record<string, string>> | undefined {
  return pineVersionRules(version).allowsLegacyGlobalBuiltinAliases
    ? PINE_V4_BUILTIN_PARAMETER_RENAMES.get(name)
    : undefined;
}

export function canonicalBuiltinArguments(args: CallArgument[], name: string, version: number): CallArgument[] {
  const aliases = legacyBuiltinParameterAliases(name, version);
  if (!aliases) return args;
  return args.map((argument) => {
    const canonical = argument.name && aliases[argument.name.name];
    return canonical && argument.name
      ? { ...argument, name: { ...argument.name, name: canonical } }
      : argument;
  });
}
