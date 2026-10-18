import { executeEntry, json, table, text } from './v104Fixture';

export const dashId = 'v104-dash-period-v6';
export const dashFolder = `v104/captures/v104/${dashId}/`;
export const dashReport = json(dashFolder + 'numeric-results-v1.json');
export const dashBlock = json(dashReport.nativeBlock.path);
export const dashRows = json(dashBlock.rowSet.path);
export const dashCsv = table(dashBlock.csv.path);
export const dashRegions = json(dashFolder + 'derived-region-map-v1.json');
export const dashSourcePath = `v104/sources/${dashId}.pine`;
export const dashSource = text(dashSourcePath);
export function executeDash() {
  const first = dashCsv.rows.findIndex(row => Number(dashCsv.get(row, 'INPUT_INDEX')) % 8 === 0);
  const last = dashRows.uniqueVisualAnchorRowOrdinal as number;
  if (first < 0 || last - first <= 240) throw new Error('V104 dash original prefix cannot reach its build');
  const replay = executeEntry({ sourcePath: dashSourcePath, csv: dashCsv,
    block: { primaryRowOrdinals: [first + 1], uniqueVisualAnchorRowOrdinal: last } }, { checkSemantic: true });
  return { ...replay, firstRowOrdinal: first + 1, firstNativeIndex: Number(dashCsv.get(dashCsv.rows[first], 'INPUT_INDEX')) };
}
