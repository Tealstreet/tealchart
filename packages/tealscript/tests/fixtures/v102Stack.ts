import { executeEntry, json as stackJson, table as stackTable } from './v102Fixture';
export { revision as stackRevision, raw as stackRaw, json as stackJson, table as stackTable } from './v102Fixture';

export const stackCapture = 'v102/captures/v102/';
export interface StackEntry {
  id: string; report: any; block: any; csv: ReturnType<typeof stackTable>; sourcePath: string; regions: any;
}
export const stackEntries: StackEntry[] = stackJson(stackCapture + 'numeric-controls-v4.json').sources.map((entry: { sourceId: string; report: { path: string } }) => {
  const report = stackJson(entry.report.path);
  const block = stackJson(report.nativeBlock.path);
  return { id: entry.sourceId, report, block, csv: stackTable(block.csv.path),
    sourcePath: report.sourceObservation.requested.path as string,
    regions: stackJson(report.renderAssessment.path) };
});

export function executeStack(entry: StackEntry) {
  const { result, bars } = executeEntry(entry);
  return { result, bars };
}
