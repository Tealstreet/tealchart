import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

export const directory = 'v93/captures/v93/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
export const read = (path: string) => bytes(path).toString('utf8');
export const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
export interface Proof { path: string; bytes: number; sha256: string }
export const proof = (path: string): Proof => ({ path, bytes: bytes(path).length,
  sha256: createHash('sha256').update(bytes(path)).digest('hex') });
export function csv(path: string) {
  const records = read(path).trimEnd().split(/\r?\n/).map(line => {
    const cells: string[] = [];
    let cell = '', quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') { cell += '"'; index++; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
      else cell += char;
    }
    cells.push(cell);
    return cells;
  });
  return { columns: records[0], rows: records.slice(1) };
}
export interface Source {
  sourceId: string; pineVersion: number; item: number; sourceSha256: string; requestSource: string;
  executed: Proof; saveBody: Proof; addBody: Proof; receipt: Proof; privateScriptId: string;
  privateVersion: string; nativeCompileSuccess: boolean; nativeWarningChannel: unknown[];
  nativeStudyInstanceId: null; separateMarkerArrays: null;
}
export interface Session {
  sourceId: string; csv: Proof; dataRows: number; columnCount: number; independentlyClosedRows: number;
  nativeObservationUtc: string; closureMask: Proof; columnBindings: Proof; nativeScreenshot: Proof;
  closedRunRawPointers: { rowOrdinal: number; timeRaw: string; indexRaw: string }[];
}
export interface Region {
  sourceId: string; sourceSha256: string; privateScriptId: string; privateVersion: string;
  inputMode: number; inputName: string; screenshot: Proof & { dimensionsPixels: number[] };
  csv: Proof; sessionReceipt: Proof; screenshotAtUtc: string; screenshotCompletedAtUtc: string;
  axisMapping: { price81300AtYPixel: number; price81400AtYPixel: number; manualPixelUncertainty: number };
  anchor: { currentSourceRowOrdinal: number; sourceRowNativeConfirmedRaw: string; sourceRowStrictNumericCredit: number;
    referencedChartRowOrdinal: number; referencedChartTimeRawSeconds: string; referencedCandleIndependentlyClosed: boolean;
    referencedChartOHLC: { open: string; high: string; low: string; close: string }; nativeCandleXApproxPixels: number;
    inputCellPointers: { csvSha256: string; rowOrdinal: number; columnOrdinal: number; title: string; raw: string; cellStatus: string }[] };
  visibleTimeContext: { atLeast32ClosedBars: { rowOrdinals: number[]; firstTimeRaw: string; lastTimeRaw: string } };
  nativeFeedFrameAsOfClock: null;
  properties: { property: string; criterionVerdict: string; hypothesis: string; pixelRegionXYXY: number[] }[];
}
export const sourceIds = [5, 6].map(version => `v93-coordinate-label-v${version}`);
export const attempts = json<{ attempts: { source: Source; status: string; removed: boolean; sessions: Session[] }[] }>(directory + 'attempt-inventory-v5.json')
  .attempts.filter(attempt => sourceIds.includes(attempt.source.sourceId));
export const sessions = attempts.flatMap(attempt => attempt.sessions.map((session, mode) => {
  const prefix = `${directory}${attempt.source.sourceId}/attempt-v1/session-mode${mode}-v1/`;
  return { source: attempt.source, session, mode, prefix, data: csv(session.csv.path), mask: csv(session.closureMask.path),
    region: json<Region>(prefix + 'derived-region-map-v1.json') };
}));
export type LabelSession = typeof sessions[number];
export const paths = ['RESPONSE-v93-v5.md', 'artifact-integrity-v5.json', 'validation-result-v5.json',
  'attempt-inventory-v5.json', 'numeric-controls-v5.json', 'facet-capabilities-v5.json'].map(file => directory + file)
  .concat(sourceIds.flatMap(id => [`v93/sources/${id}.pine`, ...['executed-v1.pine', 'save-request-v1.txt',
    'save-response-v1.json', 'add-response-v1.json', 'observation-v1.json', 'capture-receipt-v3.json']
    .map(file => `${directory}${id}/attempt-v1/${file}`)]), sessions.flatMap(entry => ['chart-native-v1.csv',
    'column-bindings-v1.json', 'row-closure-mask-v1.csv', 'row-set-observation-v1.json', 'session-receipt-v1.json',
    'render-v1.png', 'derived-region-map-v1.json'].map(file => entry.prefix + file)));

export function replay(entry: LabelSession) {
  const ast = parse(read(entry.source.executed.path));
  const checked = checkProgram(ast);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(compiled.unsupported.join('; '));
  // No invented predecessor or volume. First-row history comparisons are excluded.
  // The developing last row is used as rendering context, never closed numeric credit.
  const bars: Bar[] = entry.data.rows.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]),
    high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: NaN }));
  const result = executeCompiled(compiled, bars, new Map([['input_YLOC_MODE', entry.mode]]), {
    realtimeLastBar: { isNew: true }, runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  if (!result) throw new Error('Native label source must execute');
  return { result, checked, bars };
}
