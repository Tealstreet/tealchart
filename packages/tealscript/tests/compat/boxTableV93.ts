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
export interface Property { property: string; criterionVerdict: string; hypothesis: string;
  pixelRegionXYXY?: number[]; nativeVisualObservation?: string }
export interface Region {
  sourceId: string; sourceSha256: string; privateScriptId: string; privateVersion: string;
  screenshot: Proof & { dimensionsPixels: number[] }; csv: Proof; sessionReceipt: Proof;
  screenshotAtUtc: string; nativeFeedFrameAsOfClock: null; originalImageAltered: boolean;
  properties: Property[]; visibleClosed32BarRun: { rowOrdinals: number[]; firstTimeRaw: string; lastTimeRaw: string };
  currentSourceBar?: { csvRowOrdinal: number; timeRawSeconds: string; inputIndexRaw: string;
    nativeConfirmedRaw: string; strictClosedNumericCredit: number; presentStatus: string };
  currentFrontBoxes?: { role: string; pixelRegionXYXY: number[]; leftTimeRawSeconds: number;
    rightTimeRawSeconds: number; sourceYBounds: number[] }[];
  tableRegions?: Record<'constructor' | 'setter', { outerFrame: number[]; bottomBlueFrame: number[];
    redVerticalSeparator: number[]; redHorizontalSeparator: number[] }>;
  priorObjectFragments?: string; clipping?: string; namedNativeFontFamily?: null;
  viewportActions: { observedOutcome?: string }[]; nativeTableGetterClaim?: boolean;
  captionOverlapLimit?: string;
}
export const sourceIds = ['box-text-v5', 'box-text-v6', 'table-setters-v5', 'table-setters-v6'].map(stem => 'v93-' + stem);
export const attempts = json<{ attempts: { source: Source; status: string; removed: boolean; sessions: Session[] }[] }>(directory + 'attempt-inventory-v6.json')
  .attempts.filter(attempt => sourceIds.includes(attempt.source.sourceId));
export const entries = attempts.map(attempt => {
  const source = attempt.source, session = attempt.sessions[0];
  const prefix = `${directory}${source.sourceId}/attempt-v1/`;
  const region = json<Region>(prefix + 'session-mode0-v1/derived-region-map-v1.json');
  return { source, session, prefix, region, data: csv(session.csv.path), mask: csv(session.closureMask.path) };
});
export const paths = ['RESPONSE-v93-v6.md', 'artifact-integrity-v6.json', 'validation-result-v6.json',
  'attempt-inventory-v6.json', 'numeric-controls-v6.json', 'facet-capabilities-v6.json'].map(file => directory + file)
  .concat(entries.flatMap(({ source, prefix, region }) => [source.requestSource, source.executed.path,
    source.saveBody.path, source.addBody.path, source.receipt.path, prefix + 'save-request-v1.txt', prefix + 'observation-v1.json',
    ...['chart-native-v1.csv', 'column-bindings-v1.json', 'row-closure-mask-v1.csv', 'row-set-observation-v1.json',
      'render-v1.png', 'derived-region-map-v1.json'].map(file => prefix + 'session-mode0-v1/' + file), region.sessionReceipt.path]),
  ['viewport-action-v1.json', 'viewport-action-observation-v1.json', 'viewport-preview-v1.png']
    .map(file => directory + 'v93-box-text-v5/attempt-v1/' + file));

export function replay(entry: typeof entries[number]) {
  const ast = parse(read(entry.source.executed.path));
  const checked = checkProgram(ast);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(compiled.unsupported.join('; '));
  // Rebase indices at the retained export frontier. No native volume is exported.
  const bars: Bar[] = entry.data.rows.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]),
    high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: NaN }));
  const result = executeCompiled(compiled, bars, undefined, { realtimeLastBar: { isNew: true },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } });
  if (!result) throw new Error('Native box/table source must execute');
  return { result, bars, checked };
}
