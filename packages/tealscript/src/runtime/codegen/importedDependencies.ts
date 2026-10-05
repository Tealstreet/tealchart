export function resolveDependencyMember(
  name: string,
  owner: string | null | undefined,
  scopes: ReadonlyMap<string, ReadonlyMap<string, string>>,
): string {
  const separator = name.indexOf('.');
  if (!owner || separator < 0) return name;
  const alias = scopes.get(owner)?.get(name.slice(0, separator));
  return alias ? alias + name.slice(separator) : name;
}
