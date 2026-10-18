import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

export const styleRevision = 'f47a4e34ce33441ad37add124d9572119826138d';
export const styleCapture = 'v102/captures/v102/';
const oracleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../oracle-probes');
interface FixtureProof { path: string; bytes: number; sha256: string }
const fixtureLock: { revision: string; files: FixtureProof[] } = JSON.parse(readFileSync(resolve(oracleRoot, '../oracle-fixtures.json'), 'utf8'));
const fixtureProofs = new Map(fixtureLock.files.map(proof => [proof.path, proof]));
export function styleRaw(path: string) {
  const bytes = readFileSync(resolve(oracleRoot, path));
  const proof = fixtureProofs.get(path);
  if (fixtureLock.revision !== styleRevision || !proof || proof.bytes !== bytes.length || proof.sha256 !== createHash('sha256').update(bytes).digest('hex')) {
    throw new Error(`Unbound v102 style fixture: ${path}`);
  }
  return bytes;
}
export const styleJson = (path: string) => JSON.parse(styleRaw(path).toString('utf8'));
export function styleTable(path: string) {
  const [headers, ...rows] = styleRaw(path).toString('utf8').trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
  return { headers, rows, get: (row: string[], title: string) => row[headers.indexOf(title)] };
}
export interface StyleEntry {
  id: string; report: any; block: any; csv: ReturnType<typeof styleTable>; sourcePath: string; regions: any;
}
export const styleEntries: StyleEntry[] = styleJson(styleCapture + 'numeric-controls-v26.json').sources.filter((entry: { sourceId: string }) => /^v102-(extend-stroke|gap-style-geometry)-v6$/.test(entry.sourceId)).map((entry: { sourceId: string; report: { path: string } }) => {
  const report = styleJson(entry.report.path);
  const block = styleJson(report.nativeBlock.path);
  return { id: entry.sourceId, report, block, csv: styleTable(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: report.renderAssessment ? styleJson(report.renderAssessment.path) : null };
});

export function executeStyle(entry: StyleEntry) {
  const source = styleRaw(entry.sourcePath).toString('utf8');
  const ast = parse(source);
  const errors = checkProgram(ast).diagnostics.filter(d => d.severity === 'error');
  if (errors.length) throw new Error(JSON.stringify(errors));
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const first = entry.block.primaryRowOrdinals[0] as number;
  const input = entry.csv.rows.slice(first - 1, entry.block.uniqueVisualAnchorRowOrdinal);
  const bars = input.map((row: string[]) => {
    const value = (title: string) => Number(entry.csv.get(row, title));
    return { time: value('time') * 1000, open: value('open'), high: value('high'), low: value('low'), close: value('close'),
      volume: entry.csv.headers.includes('Volume') ? value('Volume') : Number.NaN };
  });
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true }, syminfo: { tickerid: 'BINANCE:BTCUSDT' } },
  })!;
  if (result.errors.length || result.profile.compiledBarErrors?.count || result.profile.swallowedErrors?.length) {
    throw new Error(JSON.stringify({ errors: result.errors, profile: result.profile }));
  }
  return { result, bars };
}

export const styleRefusedIds = ['v102-format-omitted-box-v6', 'v102-format-omitted-label-v6', 'v102-format-omitted-table-v6'];
export const styleStoppedIds = ['v102-extend-stroke-v5', 'v102-gap-style-geometry-v5'];
