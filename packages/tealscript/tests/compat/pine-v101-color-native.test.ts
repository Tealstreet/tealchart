import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Plot { sourcePlotOrdinal: number; title: string }
interface Block {
  sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  csv: Proof; columnBindings: Proof; closureMask: Proof; primaryRowOrdinals: number[];
  rows: { rowOrdinal: number; cells: Record<string, Pointer>; physicallyClosed: boolean; primaryScoringCredit: boolean }[];
}
const prefix = 'v101/';
const capture = prefix + 'captures/v101/';
const attempt = capture + 'proposed-v101-rgb90-v5-v1/attempt-v1/';
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const json = <T>(path: string): T => JSON.parse(raw(path).toString('utf8')) as T;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const source = json<{ sources: (Proof & { plots: Plot[] })[] }>(prefix + 'bundle-manifest-v1.json').sources[0];
const numeric = json<{ nativeBlock: Block; modelSummary: string; models: { modelId: string; verdict: string }[]; discriminator: { observedRawCounts: Record<string, number> } }>(capture + 'numeric-controls-v1.json');
const block = numeric.nativeBlock;
function table(path: string) {
  const [headers, ...rows] = raw(path).toString('utf8').trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
  return { headers, rows, get: (row: string[], title: string) => row[headers.indexOf(title)] };
}
const csv = table(block.csv.path);
const selected = block.primaryRowOrdinals.map(i => csv.rows[i - 1]);
const codes = source.plots.filter(p => p.sourcePlotOrdinal >= 3);

describe('v101 constant-color witness: native direct RGB/NEW90 equals one', () => {
  it('binds every dependency, exact frozen source and source-owned original cells', () => {
    expect(lock.revision).toBe('528e23e9b8d5068bc079aaeb5bf6ab6a826e3d5c');
    const integrityPath = capture + 'artifact-integrity-v1.json';
    const artifacts = json<{ artifacts: Proof[] }>(integrityPath).artifacts;
    expect(artifacts).toHaveLength(107);
    for (const p of [...artifacts, { path: integrityPath, bytes: raw(integrityPath).length, sha256: hash(raw(integrityPath)) }]) {
      expect(lock.files.find(f => f.path === p.path)).toEqual(p);
      expect({ path: p.path, bytes: raw(p.path).length, sha256: hash(raw(p.path)) }).toEqual(p);
    }
    expect(source.sha256).toBe('542bdcaf0a1823869f097e65207caed2a2ea7b403b7dd993a11224018a7538f2');
    expect(raw(source.path)).toEqual(raw(attempt + 'executed-v1.pine'));
    expect(raw(source.path).length).toBe(4895);
    expect(hash(raw(source.path))).toBe(source.sha256);
    expect(block.sourceSha256).toBe(source.sha256);
    const saved = raw(attempt + 'save-request-v1.txt').toString('utf8').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
    expect(saved).toBe(raw(source.path).toString('utf8'));
    const binding = json<{ nativePrivateId: string; nativePrivateVersion: string; columns: { sourceLiteralPlotOrdinal?: number; sourceSha256?: string; originalHeader: string; owner?: string; privateVersion?: string }[] }>(block.columnBindings.path);
    expect(binding.nativePrivateId).toBe(block.nativePrivateId);
    expect(binding.nativePrivateVersion).toBe(block.nativePrivateVersion);
    expect(source.plots).toHaveLength(40);
    for (const p of source.plots) expect(binding.columns.find(c => c.sourceLiteralPlotOrdinal === p.sourcePlotOrdinal)).toMatchObject({ sourceSha256: source.sha256, originalHeader: p.title, owner: block.nativePrivateId, privateVersion: block.nativePrivateVersion });
    for (const name of ['save-response-v1.json', 'add-response-v1.json']) {
      const body = json<{ success: boolean; result: { metaInfo: { scriptIdPart: string; styles: Record<string, { title: string }> } } }>(attempt + name);
      expect(body.success).toBe(true);
      expect(body.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
      for (const p of source.plots) expect(body.result.metaInfo.styles[`plot_${p.sourcePlotOrdinal}`].title).toBe(p.title);
    }
    for (const row of block.rows) for (const p of Object.values(row.cells)) {
      expect(p.csvSha256).toBe(block.csv.sha256);
      expect(csv.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
      expect(csv.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
    }
    expect(json(capture + 'validation-result-v1.json')).toMatchObject({ status: 'PASS', modelSummary: 'ONLY_CM_B', counts: { primaryRows: 64, uniquePrimaryColorCodeCells: 2368, newDiscriminatorCells: 64 } });
  });

  it('re-derives the first64 physically closed rows and retains all other rows as exclusions', () => {
    const observation = json<{ nativeExportUtc: string; ownOriginRequired: boolean; samplingCompleteness: boolean }>(attempt + 'session-mode0-v1/row-set-observation-v1.json');
    expect(observation.ownOriginRequired).toBe(false);
    expect(observation.samplingCompleteness).toBe(false);
    expect(csv.headers).toHaveLength(46);
    expect(csv.rows).toHaveLength(301);
    const closed = csv.rows.map(row => csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc));
    expect(closed.filter(Boolean)).toHaveLength(300);
    const start = closed.findIndex((_, i) => closed.slice(i, i + 64).length === 64 && closed.slice(i, i + 64).every(Boolean));
    expect(start).toBe(0);
    expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    const mask = table(block.closureMask.path);
    for (const [i, row] of csv.rows.entries()) {
      expect(mask.get(mask.rows[i], 'closed_numeric_eligible')).toBe(closed[i] ? '1' : '0');
      expect(mask.get(mask.rows[i], 'primary_scoring_eligible')).toBe(i < 64 ? '1' : '0');
      expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
      if (i > 0 && i < 64) {
        expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[i - 1], 'INPUT_INDEX')) + 1);
        expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[i - 1], 'time')));
      }
    }
    expect({ codes: codes.length * selected.length, context: 3 * selected.length, outsideClosed: (300 - 64) * 40, developing: 40 }).toEqual({ codes: 2368, context: 192, outsideClosed: 9440, developing: 40 });
  });

  it('locks the observed raw1 frontier while retaining the finite-witness and Boolean-NA limits', () => {
    expect(numeric.modelSummary).toBe('ONLY_CM_B');
    expect(numeric.models.map(m => [m.modelId, m.verdict])).toEqual([['CM-A', 'REFUTED'], ['CM-B', 'SUPPORTED']]);
    expect(numeric.discriminator.observedRawCounts).toEqual({ '1': 64 });
    expect(raw(source.path).toString('utf8')).toContain('f_code(bool value) => value ? 1 : 0');
    expect(codes).toHaveLength(37);
    for (const row of selected) expect(csv.get(row, 'DIRECT_RGB_NEW_90_EQ')).toBe('1');
  });

  it('compares all37 codes on all64 rows exactly, plus the two reproducible context outputs', () => {
    const compiled = tryCompile(parse(raw(source.path).toString('utf8')));
    expect(compiled.success).toBe(true);
    if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
    const result = executeCompiled(compiled, selected.map(row => ({ time: Number(csv.get(row, 'time')) * 1000, open: Number(csv.get(row, 'open')), high: Number(csv.get(row, 'high')), low: Number(csv.get(row, 'low')), close: Number(csv.get(row, 'close')), volume: Number(csv.get(row, 'Volume')) })))!;
    expect(result.errors).toEqual([]);
    let codeComparisons = 0;
    for (const [i, row] of selected.entries()) for (const p of source.plots.filter(p => p.title !== 'INPUT_INDEX')) {
      const target = csv.get(row, p.title);
      const actual = result.plots.find(plot => plot.title === p.title)!.values[i];
      const pointer = `${block.csv.sha256} row${block.primaryRowOrdinals[i]} ${p.title}`;
      expect(actual, pointer).toBe(Number(target));
      expect(String(actual), pointer).toBe(target);
      if (p.sourcePlotOrdinal >= 3) {
        expect(['0', '1'], pointer).toContain(target);
        codeComparisons++;
      }
    }
    expect(codeComparisons).toBe(2368);
  });
});
