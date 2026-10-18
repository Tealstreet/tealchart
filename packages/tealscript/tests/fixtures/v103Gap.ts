import { executeEntry, json, lock, raw, table, text } from './v102Fixture';

export { json, lock, raw, table, text } from './v102Fixture';
export const revision = 'c1d406006d80e2edc4d16d2952b503bf9dff0dc4';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}`);
export const capture = 'v103/captures/v103/';
export const manifest = json('v103/bundle-manifest-v1.json');
export const entries = [5, 6].map(version => {
  const id = `v103-visible-gap-v${version}`;
  const spec = manifest.sources.find((s: any) => s.sourceId === id);
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  const csv = table(block.csv.path);
  const anchor = block.visualAnchor.rowOrdinal as number;
  const primary = block.rows.map((r: any) => r.rowOrdinal) as number[];
  const first = csv.rows.findIndex(row => Number(csv.get(row, 'INPUT_INDEX')) % 8 === 0) + 1;
  return { id, version, spec, report, block, csv, anchor, primary, first,
    indexDelta: Number(csv.raw(first, 'INPUT_INDEX')), sourcePath: spec.path as string,
    regions: json(capture + id + '/derived-region-map-v1.json'),
    assessment: json(capture + id + '/facet-assessment-v1.json') };
});
export type GapEntry = typeof entries[number];
export function executeGap(entry: GapEntry) {
  return executeEntry({ ...entry, block: { primaryRowOrdinals: entry.primary, uniqueVisualAnchorRowOrdinal: entry.anchor } },
    { startRowOrdinal: entry.first, checkSemantic: true });
}
export function bound(proof: { path: string; bytes: number; sha256: string }) {
  const bytes = raw(proof.path);
  const registered = lock.files.find(p => p.path === proof.path);
  if (!registered || registered.bytes !== proof.bytes || registered.sha256 !== proof.sha256) throw new Error(`V103 proof mismatch ${proof.path}`);
  return bytes;
}
