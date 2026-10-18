import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

export interface FixtureProof { path: string; bytes: number; sha256: string }
const oracleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../oracle-probes');
export const lock = JSON.parse(readFileSync(resolve(oracleRoot, '../oracle-fixtures.json'), 'utf8')) as {
  revision: string; files: FixtureProof[];
};
export const revision = lock.revision;
const proofs = new Map(lock.files.map(proof => [proof.path, proof]));

export function raw(path: string) {
  const bytes = readFileSync(resolve(oracleRoot, path));
  const proof = proofs.get(path);
  if (!proof || proof.bytes !== bytes.length || proof.sha256 !== createHash('sha256').update(bytes).digest('hex')) {
    throw new Error(`Unbound v102 fixture: ${path}`);
  }
  return bytes;
}
export const text = (path: string) => raw(path).toString('utf8');
export const json = <T = any>(path: string): T => JSON.parse(text(path)) as T;
export function table(path: string) {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
  const get = (row: string[], title: string) => row[headers.indexOf(title)];
  return { headers, rows, get, raw: (ordinal: number, title: string) => get(rows[ordinal - 1], title) };
}
export interface FixtureEntry {
  sourcePath: string;
  csv: ReturnType<typeof table>;
  block: { primaryRowOrdinals: number[]; uniqueVisualAnchorRowOrdinal: number };
}
interface ReplayOptions {
  startRowOrdinal?: number;
  endRowOrdinal?: number;
  executionOptions?: Parameters<typeof executeCompiled>[3];
  checkSemantic?: boolean;
}
export function executeEntry(entry: FixtureEntry, options: ReplayOptions = {}) {
  const source = text(entry.sourcePath);
  const program = parse(source);
  if (options.checkSemantic) {
    const errors = checkProgram(program).diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    if (errors.length) throw new Error(JSON.stringify(errors));
  }
  const compiled = tryCompile(program);
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const first = options.startRowOrdinal ?? entry.block.primaryRowOrdinals[0];
  const last = options.endRowOrdinal ?? entry.block.uniqueVisualAnchorRowOrdinal;
  const bars = entry.csv.rows.slice(first - 1, last).map(row => {
    const value = (title: string) => Number(entry.csv.get(row, title));
    return { time: value('time') * 1000, open: value('open'), high: value('high'), low: value('low'), close: value('close'),
      volume: entry.csv.headers.includes('Volume') ? value('Volume') : Number.NaN };
  });
  const result = executeCompiled(compiled, bars, undefined, options.executionOptions ?? {
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true }, syminfo: { tickerid: 'BINANCE:BTCUSDT' } },
  });
  if (!result) throw new Error(`Failed to execute v102 source: ${entry.sourcePath}`);
  if (result.errors.length || result.profile.compiledBarErrors?.count || result.profile.swallowedErrors?.length) {
    throw new Error(JSON.stringify({ errors: result.errors, profile: result.profile }));
  }
  return { source, program, compiled, result, bars };
}
