import { executeEntry, json as linefillJson, table as linefillTable } from './v102Fixture';
export { revision as linefillRevision, raw as linefillRaw, json as linefillJson, table as linefillTable } from './v102Fixture';

export const linefillCapture = 'v102/captures/v102/';
export interface LinefillEntry {
  id: string; report: any; block: any; csv: ReturnType<typeof linefillTable>; sourcePath: string; regions: any;
}
export const linefillEntries: LinefillEntry[] = linefillJson(linefillCapture + 'numeric-controls-v26.json').sources.filter((entry: { sourceId: string }) => /^v102-(linefill-sloped|line-price|line-price-vertical)-v[56]$/.test(entry.sourceId)).map((entry: { sourceId: string; report: { path: string } }) => {
  const report = linefillJson(entry.report.path);
  const block = linefillJson(report.nativeBlock.path);
  return { id: entry.sourceId, report, block, csv: linefillTable(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: report.renderAssessment ? linefillJson(report.renderAssessment.path) : null };
});

export function executeLinefill(entry: LinefillEntry) {
  const { result, bars } = executeEntry(entry);
  return { result, bars };
}
