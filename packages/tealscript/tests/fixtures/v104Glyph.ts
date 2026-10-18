import { executeEntry, json, table } from './v104Fixture';

export { json, lock, raw, revision, table } from './v104Fixture';
export const capture = 'v104/captures/v104/';
export const id = 'v104-glyph-advance-v6';
const report = json(capture + id + '/numeric-results-v1.json');
const block = json(report.nativeBlock.path);
export const entry = {
  id,
  report,
  block,
  rowSet: json(block.rowSet.path),
  csv: table(block.csv.path),
  sourcePath: report.sourceObservation.requested.path as string,
  regions: json(capture + id + '/derived-region-map-v1.json'),
};
export function executeGlyph() {
  const first = entry.csv.rows.findIndex((row) => Number(entry.csv.get(row, 'INPUT_INDEX')) % 8 === 0);
  const last = entry.rowSet.uniqueVisualAnchorRowOrdinal as number;
  if (first < 0 || last - first - 1 < 240) throw new Error('V104 original prefix cannot reach its retained build');
  const replay = executeEntry(entry, { startRowOrdinal: first + 1, endRowOrdinal: last, checkSemantic: true });
  return {
    ...replay,
    firstRowOrdinal: first + 1,
    firstNativeIndex: Number(entry.csv.get(entry.csv.rows[first], 'INPUT_INDEX')),
  };
}
