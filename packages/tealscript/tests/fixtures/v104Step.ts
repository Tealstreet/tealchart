import { executeEntry, json, lock, raw, table, text } from './v104Fixture';

export { json, raw, text } from './v104Fixture';
export const capture = 'v104/captures/v104/';
export const entries = [5, 6].map(version => {
  const id = `v104-step-turn-v${version}`;
  const sourcePath = `v104/sources/${id}.pine`;
  const report = json(capture + id + '/numeric-results-v1.json');
  const block = json(report.nativeBlock.path);
  const csv = table(block.csv.path);
  const closure = table(block.closureMask.path);
  const anchor = block.visualAnchor.rowOrdinal as number;
  const primary = block.rows.map((r: any) => r.rowOrdinal) as number[];
  const first = csv.rows.findIndex(row => Number(csv.get(row, 'INPUT_INDEX')) % 32 === 0) + 1;
  return { id, version, sourcePath, report, block, csv, closure, anchor, primary, first,
    indexDelta: Number(csv.raw(first, 'INPUT_INDEX')),
    regions: json(capture + id + '/derived-region-map-v1.json'),
    pixels: json(capture + id + '/pixel-certificate-v1.json'),
    certificate: json(capture + id + '/step-certificate-v1.json') };
});
export type StepEntry = typeof entries[number];
const executions = new Map<StepEntry, ReturnType<typeof executeEntry>>();
export function executeStep(entry: StepEntry) {
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
  if (!registered || registered.bytes !== proof.bytes || registered.sha256 !== proof.sha256) throw new Error(`V104 proof mismatch ${proof.path}`);
  return bytes;
}
