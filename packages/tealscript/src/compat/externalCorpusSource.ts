import { createHash } from 'node:crypto';

/**
 * Source-shape helpers for the external Pine corpus.
 *
 * These live in `src/` and not in `scripts/` because TESTS import them, and
 * `scripts/` is excluded from this package's typecheck: it is ad-hoc corpus
 * tooling that compile-time-imports the JSON it generates into `reports/`,
 * which is generated output and not tracked. A test importing from `scripts/`
 * drags one of those modules back into the program and breaks the whole
 * monorepo's `turbo run typecheck` — which is how deleting `reports/` took CI
 * down on 2026-09-12.
 *
 * The dependency direction is one-way and must stay that way: `scripts/` may
 * import from `src/`, never the reverse.
 */

export interface ExternalCorpusSourceTransform {
  kind: 'tradingview-copy-code-body';
  startLine: number;
  removedTrailingExpandMarker: boolean;
  normalizedCopiedCodeSpaces: boolean;
  rawByteSize: number;
  transformedByteSize: number;
}

export function hashSource(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

// TradingView's "copy code" puts a header above the script and a variety of
// non-breaking spaces inside it; both have to go before a source hash means
// anything.
function normalizeCopiedCodeSpaces(line: string): string {
  return line.replace(/[\u00a0\u2007\u202f\u2009\u200a\u200b\u2060]/gu, ' ');
}

export function normalizeHarvestedPineSource(source: string): {
  source: string;
  transform?: ExternalCorpusSourceTransform;
} {
  const rawByteSize = Buffer.byteLength(source, 'utf8');
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.trim() === 'PineScript code:');
  const startLine = lines.findIndex((line, index) => (
    index > markerLine
    && /^\s*(?:\/\/\s*@version\s*=|(?:indicator|strategy|study|library)\s*\()/u.test(normalizeCopiedCodeSpaces(line))
  ));
  if (markerLine === -1 || startLine === -1) return { source };

  const bodyLines = lines.slice(startLine).map(normalizeCopiedCodeSpaces);
  const expandMarkerIndex = bodyLines.findIndex((line) => /^Expand \(\d+ lines\)\s*$/u.test(line.trim()));
  const sourceLines = expandMarkerIndex === -1 ? bodyLines : bodyLines.slice(0, expandMarkerIndex);
  const transformed = `${sourceLines.join('\n').trimEnd()}\n`;
  const transformedByteSize = Buffer.byteLength(transformed, 'utf8');
  return {
    source: transformed,
    transform: {
      kind: 'tradingview-copy-code-body',
      startLine: startLine + 1,
      removedTrailingExpandMarker: expandMarkerIndex !== -1,
      normalizedCopiedCodeSpaces: transformed !== `${lines.slice(startLine, expandMarkerIndex === -1 ? undefined : startLine + expandMarkerIndex).join('\n').trimEnd()}\n`,
      rawByteSize,
      transformedByteSize,
    },
  };
}
