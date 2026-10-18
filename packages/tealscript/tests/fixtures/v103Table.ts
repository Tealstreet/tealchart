import { executeEntry, json, lock, table } from './v102Fixture';

export { json, lock, raw, table } from './v102Fixture';
export const revision = 'eca042005e30671c45fe5cd250dd6a29ba2505bf';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
export const capture = 'v103/captures/v103/';
export const ids = ['v103-table-survival-v6', 'v103-table-zero-auto-v5', 'v103-table-zero-auto-v6'];
export const entries = ids.map(id => {
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  const rowSet = json(block.rowSet.path);
  const csv = table(block.csv.path);
  return { id, report, block, rowSet, csv, sourcePath: report.sourceObservation.requested.path as string,
    regions: json(capture + id + '/derived-region-map-v1.json') };
});
export type TableEntry = typeof entries[number];
export function executeTable(entry: TableEntry) {
  const first = entry.csv.rows.findIndex(row => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0);
  const last = entry.rowSet.uniqueVisualAnchorRowOrdinal as number;
  if (first < 0 || last - first - 1 < 240) throw new Error(`V103 original prefix cannot reach its build: ${entry.id}`);
  // Use only original bars; absolute index/frontier identity remains excluded.
  const replay = executeEntry({ ...entry, block: { primaryRowOrdinals: [first + 1], uniqueVisualAnchorRowOrdinal: last } }, { checkSemantic: true });
  return { ...replay, firstRowOrdinal: first + 1, firstNativeIndex: Number(entry.csv.get(entry.csv.rows[first], 'INPUT_INDEX')) };
}
