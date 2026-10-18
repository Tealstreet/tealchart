import { executeEntry, json, table } from './v103Fixture';

export { json, lock, raw, table, revision } from './v103Fixture';
export const capture = 'v103/captures/v103/';
export const sourceIds = ['v103-noncoincident-points-v5', 'v103-noncoincident-points-v6'];
export const entries = sourceIds.map(id => {
  const root = capture + id + '/';
  const report = json(root + 'numeric-results-v1.json');
  const nativeBlock = json(report.nativeBlock.path);
  const rowSet = json(nativeBlock.rowSet.path);
  return { id, version: Number(id.at(-1)), root, report, nativeBlock, rowSet, csv: table(nativeBlock.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: json(root + 'derived-region-map-v1.json'), assessment: json(root + 'facet-assessment-v1.json'),
    block: { primaryRowOrdinals: rowSet.selectedPrimaryClosedRowOrdinals as number[], uniqueVisualAnchorRowOrdinal: rowSet.uniqueVisualAnchorRowOrdinal as number },
  };
});
export type PointsEntry = typeof entries[number];

export function executePoints(entry: PointsEntry) {
  const start = entry.csv.rows.findIndex(row => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0) + 1;
  if (!start || start > entry.rowSet.originalClosedPredecessorRowOrdinals[0]) throw new Error('Missing actual phase-aligned prefix');
  // Keep the exact source and actual exported bars; only absolute indices are translated context.
  const replay = executeEntry(entry, { startRowOrdinal: start, checkSemantic: true });
  return { ...replay, start, origin: Number(entry.csv.raw(start, 'INPUT_INDEX')) };
}

export function pointGeometry(entry: PointsEntry) {
  const replay = executePoints(entry);
  const anchor = replay.bars.length - 1;
  const geometry = replay.result.drawings.map(d => {
    if (d.type === 'line') return [d.x1! - anchor, d.y1, d.x2! - anchor, d.y2, d.xloc];
    if (d.type === 'box') return [d.left! - anchor, d.top, d.right! - anchor, d.bottom, d.xloc];
    if (d.type === 'label') return [d.x! - anchor, d.y, d.text, d.xloc];
    throw new Error(`Unexpected drawing ${d.type}`);
  });
  return { ...replay, geometry };
}
