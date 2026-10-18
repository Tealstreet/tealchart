import { executeEntry, json, lock, raw, table } from './v103Fixture';

export { json, lock, raw, table, text, revision } from './v103Fixture';
export const capture = 'v103/captures/v103/';
export const manifest = json('v103/bundle-manifest-v1.json');
export const entries = ['polyline-fill-style-v6', 'fillgaps-overloads-v6', 'plot-controls-v6', 'markers-v6', 'plotarrow-height-v6', 'polyline-arrows-v5', 'polyline-arrows-v6'].map(name => {
  const id = `v103-${name}`;
  const spec = manifest.sources.find((s: any) => s.sourceId === id);
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  const csv = table(block.csv.path);
  const anchor = block.visualAnchor.rowOrdinal as number;
  const primary = block.rows.map((r: any) => r.rowOrdinal) as number[];
  const first = csv.rows.findIndex(row => Number(csv.get(row, 'INPUT_INDEX')) % 32 === 0) + 1;
  return { id, spec, report, block, csv, anchor, primary, first, sourcePath: spec.path as string,
    indexDelta: Number(csv.raw(first, 'INPUT_INDEX')), regions: json(capture + id + '/derived-region-map-v1.json'),
    assessment: json(capture + id + '/facet-assessment-v1.json') };
});
export type StyleEntry = typeof entries[number];
const executions = new Map<StyleEntry, ReturnType<typeof executeEntry>>();
export function executeStyle(entry: StyleEntry) {
  let execution = executions.get(entry);
  if (!execution) {
    execution = executeEntry({ ...entry, block: { primaryRowOrdinals: entry.primary, uniqueVisualAnchorRowOrdinal: entry.anchor } },
      { startRowOrdinal: entry.first, checkSemantic: true });
    executions.set(entry, execution);
  }
  return execution;
}
export function bound(proof: { path: string; bytes: number; sha256: string }) {
  const bytes = raw(proof.path);
  const registered = lock.files.find(p => p.path === proof.path);
  if (!registered || registered.bytes !== proof.bytes || registered.sha256 !== proof.sha256) throw new Error(`V103 proof mismatch ${proof.path}`);
  return bytes;
}
