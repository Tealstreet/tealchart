import { executeEntry, json, table } from './v104Fixture';

export const capture = 'v104/captures/v104/';
const id = 'v104-arrow-direction-v6';
const spec = json('v104/bundle-manifest-v1.json').entries.find((s: any) => s.sourceId === id);
const report = json(capture + id + '/numeric-results-v1.json');
const block = json(report.nativeBlock.path);
const csv = table(block.csv.path);
const anchor = block.visualAnchor.rowOrdinal as number;
const primary = block.rows.map((r: any) => r.rowOrdinal) as number[];
const first = csv.rows.findIndex(row => Number(csv.get(row, 'INPUT_INDEX')) % 32 === 0) + 1;
export const arrowEntry = { id, spec, report, block, csv, anchor, primary, first, sourcePath: spec.path as string,
  indexDelta: Number(csv.raw(first, 'INPUT_INDEX')), regions: json(capture + id + '/derived-region-map-v1.json'),
  assessment: json(capture + id + '/facet-assessment-v1.json') };
export const certificate = json(capture + id + '/arrow-certificate-v1.json');
let execution: ReturnType<typeof executeEntry> | undefined;
export function executeArrow() {
  return execution ??= executeEntry({ ...arrowEntry,
    block: { primaryRowOrdinals: primary, uniqueVisualAnchorRowOrdinal: anchor } },
  { startRowOrdinal: first, checkSemantic: true });
}
