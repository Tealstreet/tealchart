import { executeEntry, json, lock, table } from './v102Fixture';

export { json, lock, raw, table } from './v102Fixture';
export const revision = 'ac9d6992d6d84e296c58dca98fb6b707224d55a1';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
export const capture = 'v103/captures/v103/';
export const entries = ['v103-extend-stroke-v5', 'v103-retained-replacement-v5', 'v103-retained-replacement-v6'].map(id => {
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  return { id, report, block, rowSet: json(block.rowSet.path), csv: table(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string, regions: json(capture + id + '/derived-region-map-v1.json') };
});
export type MiscEntry = typeof entries[number];
export function executeMisc(entry: MiscEntry) {
  const first = entry.csv.rows.findIndex(row => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0) + 1;
  const last = entry.rowSet.uniqueVisualAnchorRowOrdinal as number;
  if (first < 1 || last - first < 240) throw new Error(`V103 original prefix cannot reach build: ${entry.id}`);
  return { ...executeEntry(entry, { startRowOrdinal: first, endRowOrdinal: last, checkSemantic: true }), firstRowOrdinal: first,
    firstNativeIndex: Number(entry.csv.raw(first, 'INPUT_INDEX')) };
}
