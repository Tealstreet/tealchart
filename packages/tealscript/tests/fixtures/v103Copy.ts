import { executeEntry, json, table, text } from './v103Fixture';
import type { FixtureProof } from './v102Fixture';

export { revision as copyRevision } from './v103Fixture';
export interface CopyPointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface CopyBlock {
  sourceId: string; sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  csv: FixtureProof; rowSet: FixtureProof; columnBindings: FixtureProof; closureMask: FixtureProof;
  ownedTitles: string[]; primaryScoringCells: number; primaryCertificate: boolean;
  rows: { rowOrdinal: number; cells: Record<string, CopyPointer> }[];
  predecessors: { rowOrdinal: number; cells: Record<string, CopyPointer> }[];
}
export interface CopyFacet {
  facetId: string; frozenModels: { A: string; B: string }; outcome: string; verdict: string;
  frozenPixelWindow: { x: number[]; y: number[]; paddingPx: number };
  derivedWindowPx: number[]; modelAVerdict: string; modelBVerdict: string; notObservedCauses: string[];
  manualFinding: { actualSubjectRegionsPx: number[][]; actualControlRegionsPx: number[][]; scope: string };
}
interface CopyRegions {
  sourceId: string; sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  originalPng: FixtureProof; originalCsv: FixtureProof; sourceObservation: FixtureProof;
  sessionReceipt: FixtureProof; manualInspection: FixtureProof; originalDimensionsPx: { width: number; height: number };
  retainedAnchor: Record<string, CopyPointer>; nativeFrameId: null;
  registration: { anchorXPx: number; pixelsPerOwnBar: number; uncertaintyPx: { x: number; y: number; strokeEdge: number };
    xTicks: { xPx: number; time: CopyPointer; ownIndex: CopyPointer }[] };
  facets: CopyFacet[]; exposedAppearanceMetadata: { zoom: null; dpi: null; resolvedFont: null };
}
const id = 'v103-copy-appearance-v6';
const folder = `v103/captures/v103/${id}/`;
const block = json<CopyBlock>(folder + 'native-cell-block-v1.json');
const csv = table(block.csv.path);
const sourcePath = `v103/sources/${id}.pine`;
const rowSet = json<{ dataRows: number; nativeExportUtc: string; independentlyClosedRows: number;
  independentlyClosedRowOrdinals: number[]; selectedPrimaryClosedRowOrdinals: number[];
  originalClosedPredecessorRowOrdinals: number[]; uniqueVisualAnchorRowOrdinal: number;
  primaryInputCertificateValid: boolean; runtimeFailed: boolean }>(block.rowSet.path);
const primaryRowOrdinals = rowSet.selectedPrimaryClosedRowOrdinals;
// Preserve actual suffix inputs and phase; no native outputs or own-index-zero seeds enter execution.
const startRowOrdinal = csv.rows.findIndex((_, i) => csv.raw(i + 1, 'CASE_ID') === '0') + 1;
const replay = executeEntry({ sourcePath, csv, block: { primaryRowOrdinals, uniqueVisualAnchorRowOrdinal: rowSet.uniqueVisualAnchorRowOrdinal } }, {
  startRowOrdinal, endRowOrdinal: rowSet.uniqueVisualAnchorRowOrdinal, checkSemantic: true,
});
export const copy6 = { id, folder, block, csv, rowSet, sourcePath, source: text(sourcePath), startRowOrdinal, replay,
  regions: json<CopyRegions>(folder + 'derived-region-map-v1.json') };
