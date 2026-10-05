export function importedInternalName(parts: readonly string[], reservedNames: ReadonlySet<string>): string {
  const legacyName = parts.join('__');
  if (!parts.some(part => part.includes('__')) && !reservedNames.has(legacyName)) return legacyName;
  return `$import$${parts.map(part => `${part.length}$${part}`).join('$')}`;
}
