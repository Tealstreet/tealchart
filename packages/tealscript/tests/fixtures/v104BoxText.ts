import { executeEntry, json, table } from './v104Fixture';

export { json, lock, raw, table, revision } from './v104Fixture';
export const capture = 'v104/captures/v104/';
export const ids = ['v104-box-wrap-v5', 'v104-box-align-v5', 'v104-box-vertical-v5'];
export const entries = ids.map((id) => {
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  const rowSet = json(block.rowSet.path);
  const csv = table(block.csv.path);
  return {
    id,
    report,
    block,
    rowSet,
    csv,
    sourcePath: report.sourceObservation.requested.path as string,
    regions: json(capture + id + '/derived-region-map-v1.json'),
  };
});
export type BoxTextEntry = (typeof entries)[number];
export function executeBoxText(entry: BoxTextEntry) {
  const first = entry.csv.rows.findIndex((row) => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0);
  const last = entry.rowSet.uniqueVisualAnchorRowOrdinal as number;
  if (first < 0 || last - first - 1 < 240) throw new Error(`V104 original prefix cannot reach its build: ${entry.id}`);
  // Use only original bars; absolute index/frontier identity remains excluded.
  const replay = executeEntry(
    { ...entry, block: { primaryRowOrdinals: [first + 1], uniqueVisualAnchorRowOrdinal: last } },
    { checkSemantic: true },
  );
  return {
    ...replay,
    firstRowOrdinal: first + 1,
    firstNativeIndex: Number(entry.csv.get(entry.csv.rows[first], 'INPUT_INDEX')),
  };
}
