import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface NativeSource { sourceId: string; csv?: Proof; columnBindings: Proof; selectedDataRowOrdinals: number[] }
interface RequestSource { sourceId: string; path: string; plots: { title: string }[] }
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const json = <T>(path: string): T => JSON.parse(raw(path).toString('utf8')) as T;
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
function bound(path: string) {
  const bytes = raw(path);
  expect(lock.files.find(f => f.path === path)).toEqual({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  return bytes.toString('utf8');
}
function table(path: string) {
  const [headers, ...rows] = bound(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
  return { headers, rows };
}
const controls = ['v99/captures/v99/numeric-controls-v3.json', 'v98/captures/v98/numeric-controls-v6.json', 'v96/captures/v96/numeric-controls-v1.json'];
const cases = controls.flatMap(path => json<{ sources: NativeSource[] }>(path).sources.filter(s => s.csv && !s.sourceId.includes('na-cast')).map(s => ({
  sourceId: s.sourceId, sourcePath: `${s.sourceId.split('-')[0]}/sources/${s.sourceId}.pine`, csv: s.csv!, rows: s.selectedDataRowOrdinals,
  titles: json<{ columns: { sourceSha256?: string; originalHeader: string }[] }>(s.columnBindings.path).columns.filter(c => c.sourceSha256).map(c => c.originalHeader),
})));
for (const s of json<{ sources: RequestSource[] }>('v100/bundle-manifest-v1.json').sources) {
  const block = json<{ csv: Proof; primaryRowOrdinals: number[] }>(`v100/captures/v100/${s.sourceId}/native-cell-block-v1.json`);
  cases.push({ sourceId: s.sourceId, sourcePath: s.path, csv: block.csv, rows: block.primaryRowOrdinals, titles: s.plots.map(p => p.title) });
}
// V101 now witnesses DIRECT_RGB_NEW_90_EQ=1 on all64 closed rows.
// The companion v101 lock asserts the value; CM-A is refuted at that new frontier.
describe('v96/v98/v99/v100 constant colors: every selected closed non-index cell', () => {
  it('keeps nine immutable source executions and their complete 23,448-cell accounting', () => {
    expect(lock.revision).toBe('c1d406006d80e2edc4d16d2952b503bf9dff0dc4');
    expect(cases).toHaveLength(9);
    expect(cases.reduce((n, c) => n + c.rows.length * c.titles.filter(t => t !== 'INPUT_INDEX').length, 0)).toBe(23448);
    for (const path of controls) bound(path);
  });
  for (const native of cases) it(native.sourceId, () => {
    const source = bound(native.sourcePath);
    const { headers, rows } = table(native.csv.path);
    const input = native.rows.map(i => rows[i - 1]);
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
    const result = executeCompiled(compiled, input.map(r => ({ time: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: headers.includes('Volume') ? Number(r[headers.indexOf('Volume')]) : 0 })))!;
    expect(result.errors).toEqual([]);
    for (const [i, row] of input.entries()) for (const title of native.titles.filter(t => t !== 'INPUT_INDEX')) {
      const target = row[headers.indexOf(title)];
      const actual = result.plots.find(p => p.title === title)!.values[i];
      const pointer = `${native.sourceId} row${native.rows[i]} ${title}`;
      if (target === '') expect(actual, pointer).toBeNull();
      else {
        expect(actual, pointer).toBe(Number(target));
        expect(String(actual), pointer).toBe(target);
      }
    }
  });
});
