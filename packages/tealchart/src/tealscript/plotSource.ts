/** Stable source identity is persisted; sampled values only travel to workers. */
const PREFIX = 'tealscript-source:';

export interface PlotSourceOption {
  value: string;
  label: string;
}

export function encodePlotSource(scriptId: string, plotId: string): string {
  return `${PREFIX}${encodeURIComponent(scriptId)}:${encodeURIComponent(plotId)}`;
}

export function decodePlotSource(value: unknown): { scriptId: string; plotId: string } | undefined {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return undefined;
  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 2) return undefined;
  try {
    return { scriptId: decodeURIComponent(parts[0]), plotId: decodeURIComponent(parts[1]) };
  } catch {
    return undefined;
  }
}
