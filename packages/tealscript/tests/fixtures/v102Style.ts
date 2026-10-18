import { executeEntry, json as styleJson, table as styleTable } from './v102Fixture';
export { revision as styleRevision, raw as styleRaw, json as styleJson, table as styleTable } from './v102Fixture';

export const styleCapture = 'v102/captures/v102/';
export interface StyleEntry {
  id: string; report: any; block: any; csv: ReturnType<typeof styleTable>; sourcePath: string; regions: any;
}
export const styleEntries: StyleEntry[] = styleJson(styleCapture + 'numeric-controls-v26.json').sources.filter((entry: { sourceId: string }) => /^v102-(extend-stroke|gap-style-geometry)-v6$/.test(entry.sourceId)).map((entry: { sourceId: string; report: { path: string } }) => {
  const report = styleJson(entry.report.path);
  const block = styleJson(report.nativeBlock.path);
  return { id: entry.sourceId, report, block, csv: styleTable(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: report.renderAssessment ? styleJson(report.renderAssessment.path) : null };
});

export function executeStyle(entry: StyleEntry) {
  const { result, bars } = executeEntry(entry, { checkSemantic: true });
  return { result, bars };
}

export const styleRefusedIds = ['v102-format-omitted-box-v6', 'v102-format-omitted-label-v6', 'v102-format-omitted-table-v6'];
export const styleStoppedIds = ['v102-extend-stroke-v5', 'v102-gap-style-geometry-v5'];
