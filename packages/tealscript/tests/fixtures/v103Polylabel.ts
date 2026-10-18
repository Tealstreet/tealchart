import { executeEntry, json, lock, table } from './v102Fixture';

export { json, lock, raw, table } from './v102Fixture';
export const revision = '1aad8cc2b41f53bd85b0c5558b36365d371b7244';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
export const capture = 'v103/captures/v103/';
export const sourceIds = ['v103-polyline-label-v5', 'v103-polyline-label-v6', 'v103-table-over-line-v6', 'v103-table-over-polyline-v6',
  'v103-table-over-box-v6', 'v103-table-over-label-v6', 'v103-table-over-linefill-v6'];
export const entries = sourceIds.map(id => {
  const version = Number(id.at(-1));
  const root = capture + id + '/';
  const report = json(root + 'numeric-results-v1.json');
  const nativeBlock = json(report.nativeBlock.path);
  const rowSet = json(nativeBlock.rowSet.path);
  return { id, version, root, report, nativeBlock, rowSet, csv: table(nativeBlock.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: json(root + 'derived-region-map-v1.json'),
    assessment: json(root + 'facet-assessment-v1.json'),
    block: { primaryRowOrdinals: rowSet.selectedPrimaryClosedRowOrdinals as number[], uniqueVisualAnchorRowOrdinal: rowSet.uniqueVisualAnchorRowOrdinal as number },
  };
});
export type PolylabelEntry = typeof entries[number];

export function drawingTypes(id: string) {
  if (id.includes('polyline-label')) return ['polyline', 'label', 'label', 'polyline'];
  if (id.includes('over-linefill')) return ['table', 'line', 'line', 'linefill'];
  return ['table', id.split('-over-')[1].split('-')[0]];
}

export function executePolylabel(entry: PolylabelEntry) {
  const start = entry.csv.rows.findIndex(row => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0) + 1;
  if (start === 0 || start > entry.rowSet.originalClosedPredecessorRowOrdinals[0]) throw new Error('Missing original phase-aligned prefix');
  // Actual exported prefix aligns modulo8 without editing source or inventing bars.
  // Absolute index values are translated context, never direct numeric parity credit.
  const replay = executeEntry(entry, { startRowOrdinal: start, checkSemantic: true });
  const origin = Number(entry.csv.get(entry.csv.rows[start - 1], 'INPUT_INDEX'));
  return { ...replay, start, origin };
}
