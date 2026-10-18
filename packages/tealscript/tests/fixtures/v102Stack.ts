import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

export const stackRevision = '8606897ec777cca3ad18e755b7c0d99a486d777e';
export const stackCapture = 'v102/captures/v102/';
const oracleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../oracle-probes');
interface FixtureProof { path: string; bytes: number; sha256: string }
const fixtureLock: { revision: string; files: FixtureProof[] } = JSON.parse(readFileSync(resolve(oracleRoot, '../oracle-fixtures.json'), 'utf8'));
const fixtureProofs = new Map(fixtureLock.files.map(proof => [proof.path, proof]));
export function stackRaw(path: string) {
  const bytes = readFileSync(resolve(oracleRoot, path));
  const proof = fixtureProofs.get(path);
  if (fixtureLock.revision !== stackRevision || !proof || proof.bytes !== bytes.length || proof.sha256 !== createHash('sha256').update(bytes).digest('hex')) {
    throw new Error(`Unbound v102 fixture: ${path}`);
  }
  return bytes;
}
export const stackJson = (path: string) => JSON.parse(stackRaw(path).toString('utf8'));
export function stackTable(path: string) {
  const [headers, ...rows] = stackRaw(path).toString('utf8').trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
  return { headers, rows, get: (row: string[], title: string) => row[headers.indexOf(title)] };
}
export interface StackEntry {
  id: string; report: any; block: any; csv: ReturnType<typeof stackTable>; sourcePath: string; regions: any;
}
export const stackEntries: StackEntry[] = stackJson(stackCapture + 'numeric-controls-v4.json').sources.map((entry: { sourceId: string; report: { path: string } }) => {
  const report = stackJson(entry.report.path);
  const block = stackJson(report.nativeBlock.path);
  return { id: entry.sourceId, report, block, csv: stackTable(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: stackJson(report.renderAssessment.path) };
});

export function executeStack(entry: StackEntry) {
  const source = stackRaw(entry.sourcePath).toString('utf8');
  const compiled = tryCompile(parse(source));
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
