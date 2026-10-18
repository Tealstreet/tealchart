import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NativeSource {
  sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof;
  selectedDataRowOrdinals: number[]; primaryUniquePlotCells: number;
  rows: { allRequestedRawCells: Pointer[]; nativeContextCells: Pointer[] }[];
}
const revision = '5c8a503d7b6cc1c161f75d484b5340ebc459a55b';
const base = 'v99/captures/v99/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
function csv(path: string) {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
  return { headers, rows, get: (row: string[], title: string) => row[headers.indexOf(title)] };
}
const sources = json<{ sources: NativeSource[] }>(base + 'numeric-controls-v3.json').sources.filter(s => s.sourceId.startsWith('v99-'));
const entries = sources.map(native => {
  const source = text(`v99/sources/${native.sourceId}.pine`);
  const titles = [...source.matchAll(/^plot\(.*title="([^"]+)"/gm)].map(m => m[1]);
  return { native, source, titles, data: csv(native.csv.path), mask: csv(native.closureMask.path) };
});
const manifest = json<{ comparisonCases: {
  transparencyRaw: string; sourceId: string; comparedSourceLiterals: string[];
  comparisonPolicyPredictions: Record<string, { nominalAlphaLabel: number; literalCodes: Record<string, number> }>;
}[] }>('v99/bundle-manifest-v1.json');
function nominalAlpha(t: number, policy: string) {
  const transformed = policy.startsWith('PERCENT_TRUNC') ? Math.floor(t) : policy.startsWith('PERCENT_ROUND') ? Math.round(t)
    : policy.startsWith('PERCENT_CEIL') ? Math.ceil(t) : t;
  const alpha = (100 - transformed) * 255 / 100;
  return policy === 'BYTE_FLOOR' ? Math.floor(alpha) : Math.round(alpha);
}

describe('v99 direct v5 RGB/NEW: historical observations and refuted frozen policies', () => {
  it('binds the immutable complete two-slot return, dependencies and native raw pointers', () => {
    expect(lock.revision).toBe(revision);
    // The append-only union also retains batch 77's 73 v99 cast artifacts.
    expect(lock.files.filter(f => f.path.startsWith('v99/'))).toHaveLength(251);
    const integrity = json<{ artifacts: Proof[] }>(base + 'artifact-integrity-v3.json');
    for (const proof of integrity.artifacts) {
      expect(lock.files.find(f => f.path === proof.path)).toEqual(proof);
      const raw = bytes(proof.path);
      expect({ path: proof.path, bytes: raw.length, sha256: hash(raw) }).toEqual(proof);
    }
    const self = lock.files.find(f => f.path === base + 'artifact-integrity-v3.json')!;
    expect({ ...self, bytes: bytes(self.path).length, sha256: hash(bytes(self.path)) }).toEqual(self);
    expect(json(base + 'validation-result-v3.json')).toMatchObject({ status: 'PASS', counts: {
      nativeSaves: 3, nativeAdds: 3, csvs: 3, dataRows: 915, independentlyClosedRows: 912, primaryRows: 192, uniquePrimaryPlotCells: 12096,
    } });
    for (const e of entries) {
      const folder = base + e.native.sourceId + '/attempt-v1/';
      expect(e.source).toBe(text(folder + 'executed-v1.pine'));
      expect(hash(Buffer.from(e.source))).toBe(e.native.sourceSha256);
      const form = text(folder + 'save-request-v1.txt').replaceAll('\r\n', '\n');
      expect(form.split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0]).toBe(e.source);
      const binding = json<{ nativePrivateId: string; nativePrivateVersion: string; columns: {
        columnOrdinal: number; originalHeader: string; sourceLiteralPlotOrdinal?: number; nativePlotId?: string;
        sourceSha256?: string; owner: string; privateVersion?: string;
      }[]; missingOrAmbiguousRequestedPlotTitles: unknown[]; unresolvedColumnOrdinals: unknown[] }>(e.native.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
      expect(binding.unresolvedColumnOrdinals).toEqual([]);
      for (const [i, title] of e.titles.entries()) expect(binding.columns.find(c => c.sourceLiteralPlotOrdinal === i)).toMatchObject({
        columnOrdinal: e.data.headers.indexOf(title) + 1, originalHeader: title, sourceSha256: e.native.sourceSha256,
        owner: binding.nativePrivateId, privateVersion: binding.nativePrivateVersion, nativePlotId: `plot_${i}`,
      });
      for (const file of ['save-response-v1.json', 'add-response-v1.json']) {
        const body = json<{ success: boolean; result: { metaInfo: { scriptIdPart: string; styles: Record<string, { title: string }> } } }>(folder + file);
        expect(body.success).toBe(true);
        expect(body.result.metaInfo.scriptIdPart).toBe(binding.nativePrivateId);
        expect(e.titles.map((_, i) => body.result.metaInfo.styles[`plot_${i}`].title)).toEqual(e.titles);
      }
      for (const row of e.native.rows) for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells]) {
        expect(p.csvSha256).toBe(e.native.csv.sha256);
        expect(e.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(e.data.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      }
    }
  });

  for (const [i, e] of entries.entries()) it(`${e.native.sourceId}: retains all4032 primary raw cells and excludes outside/developing observations`, () => {
    const observation = json<{ nativeExportUtc: string; samplingCompleteness: boolean }>(base + e.native.sourceId + '/attempt-v1/session-mode0-v1/row-set-observation-v1.json');
    expect(e.native.selectedDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(e.titles).toHaveLength(63);
    expect(e.native.primaryUniquePlotCells).toBe(4032);
    expect(e.data.rows).toHaveLength(i === 0 ? 302 : 304);
    expect(e.mask.rows).toHaveLength(e.data.rows.length);
    let closed = 0;
    for (const [j, row] of e.data.rows.entries()) {
      const get = (title: string) => e.data.get(row, title);
      const eligible = get('CHART_CONFIRMED') === '1' && (Number(get('time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc);
      expect(e.mask.get(e.mask.rows[j], 'closed_numeric_eligible')).toBe(eligible ? '1' : '0');
      expect(get('INPUT_TIME')).toBe(String(Number(get('time')) * 1000));
      if (eligible) closed++;
      if (j < 64) {
        expect(eligible).toBe(true);
        expect(get('INPUT_INDEX')).toBe(String(23796 + j));
        for (const title of e.titles.slice(3)) {
          let expected: string;
          if (title.includes('_EQ_')) {
            const literal = /^LIT_([0-9A-F]+)_EQ_([0-9A-F]+)$/.exec(title);
            expected = literal ? String(Number(literal[1] === literal[2])) : String(Number(title === 'RGB_99P5_EQ_01' || title === 'NEW_99P5_EQ_03'));
          } else if (title.endsWith('_T')) {
            const key = title.split('_')[1];
            const t: Record<string, number> = title.startsWith('RGB_')
              ? { '12P1': 12, '12P5': 13, '12P9': 13, '22P9': 23, '0P5': 0, '99P5': 100 }
              : { '12P1': 12, '12P5': 12, '12P9': 12, '22P9': 22, '0P5': 0, '99P5': 99 };
            expected = String(t[key]);
          } else expected = title.endsWith('_NA') ? '0' : title.endsWith('_R') ? '33' : title.endsWith('_G') ? '66' : '99';
          expect(get(title), `${title}:original row${j + 1}`).toBe(expected);
        }
      }
    }
    expect(closed).toBe(i === 0 ? 301 : 303);
    expect(observation.samplingCompleteness).toBe(false);
  });

  it('retains the newly captured unchanged v6 constructor control and all4032 raw cells', () => {
    const native = json<{ sources: NativeSource[] }>(base + 'numeric-controls-v3.json').sources.find(s => s.sourceId === 'v98-color-constructors-v6')!;
    const source = text('v98/sources/v98-color-constructors-v6.pine');
    const folder = base + native.sourceId + '/attempt-v1/';
    expect(hash(Buffer.from(source))).toBe('fba851172d72dbe8d9bd74b08ea4bc7857f57633294493d81e9b2f8cb87aa245');
    expect(source).toBe(text(folder + 'executed-v1.pine'));
    expect(hash(Buffer.from(source))).toBe(native.sourceSha256);
    const form = text(folder + 'save-request-v1.txt').replaceAll('\r\n', '\n');
    expect(form.split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0]).toBe(source);
    const binding = json<{ nativePrivateId: string; nativePrivateVersion: string; columns: {
      sourceLiteralPlotOrdinal?: number; sourceSha256?: string; owner: string; originalHeader: string; nativePlotId?: string;
    }[]; missingOrAmbiguousRequestedPlotTitles: unknown[]; unresolvedColumnOrdinals: unknown[] }>(native.columnBindings.path);
    expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
    expect(binding.unresolvedColumnOrdinals).toEqual([]);
    const titles = [...source.matchAll(/^plot\(.*title="([^"]+)"/gm)].map(m => m[1]);
    for (const [i, title] of titles.entries()) expect(binding.columns.find(c => c.sourceLiteralPlotOrdinal === i)).toMatchObject({
      sourceSha256: native.sourceSha256, owner: binding.nativePrivateId, originalHeader: title, nativePlotId: `plot_${i}`,
    });
    for (const file of ['save-response-v1.json', 'add-response-v1.json']) {
      const body = json<{ success: boolean; result: { metaInfo: { scriptIdPart: string } } }>(folder + file);
      expect(body.success).toBe(true);
      expect(body.result.metaInfo.scriptIdPart).toBe(binding.nativePrivateId);
    }
    expect(native.primaryUniquePlotCells).toBe(4032);
    expect(native.selectedDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 13));
    const data = csv(native.csv.path), mask = csv(native.closureMask.path);
    const observation = json<{ nativeExportUtc: string; samplingCompleteness: boolean }>(folder + 'session-mode0-v1/row-set-observation-v1.json');
    expect(data.rows).toHaveLength(309);
    expect(mask.rows).toHaveLength(309);
    let closed = 0, pointers = 0;
    for (const [i, row] of data.rows.entries()) {
      const get = (title: string) => data.get(row, title);
      const eligible = get('CHART_CONFIRMED') === '1' && (Number(get('time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc);
      expect(mask.get(mask.rows[i], 'closed_numeric_eligible')).toBe(eligible ? '1' : '0');
      expect(get('INPUT_TIME')).toBe(String(Number(get('time')) * 1000));
      expect(get('CASE_ID')).toBe(String(Number(get('INPUT_INDEX')) % 16));
      if (eligible) closed++;
      if (i >= 12 && i < 76) expect(eligible).toBe(true);
    }
    for (const row of native.rows) {
      expect(row.allRequestedRawCells).toHaveLength(63);
      for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells]) {
        expect(p.csvSha256).toBe(native.csv.sha256);
        expect(data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(data.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      }
      pointers += row.allRequestedRawCells.length;
    }
    expect(closed).toBe(308);
    expect(pointers).toBe(4032);
    expect(observation.samplingCompleteness).toBe(false);
    for (const ordinal of native.selectedDataRowOrdinals) {
      const row = data.rows[ordinal - 1];
      expect(data.get(row, 'EXACT_RGB12_5_EQ_DF')).toBe('1');
      expect(data.get(row, 'EXACT_RGB12_5_EQ_DF_CODE')).toBe('1');
    }
  });

  it('refutes all five frozen immediate-comparison policies for both constructors, including both earlier witnesses', () => {
    for (const kind of ['RGB', 'NEW']) for (const policy of Object.keys(manifest.comparisonCases[0].comparisonPolicyPredictions)) {
      let contrary = 0;
      for (const c of manifest.comparisonCases) {
        const alpha = nominalAlpha(Number(c.transparencyRaw), policy);
        expect(alpha).toBe(c.comparisonPolicyPredictions[policy].nominalAlphaLabel);
        const e = entries.find(e => e.native.sourceId === c.sourceId)!;
        for (const literal of c.comparedSourceLiterals) {
          const predicted = Number(parseInt(literal.slice(-2), 16) === alpha);
          const title = `${kind}_${c.transparencyRaw.replace('.', 'P')}_EQ_${literal.slice(-2)}`;
          for (const row of e.data.rows.slice(0, 64)) if (e.data.get(row, title) !== String(predicted)) contrary++;
        }
      }
      expect(contrary, `${kind}:${policy}`).toBeGreaterThan(0);
    }
  });

  it('admits incompatible equality-relation completions without installing a storage algorithm', () => {
    const equations: [string, string, number][] = [];
    for (const e of entries) {
      const direct = [...e.source.matchAll(/^plot\(f_code\(color\.(rgb|new)\(([^)]+)\) == (#[A-F0-9]{8})\), title="([^"]+)"/gm)];
      for (const [, kind, args, literal, title] of direct) equations.push([`${kind}:${args.split(',').at(-1)!.trim()}`, literal, Number(e.data.get(e.data.rows[0], title))]);
      for (const title of e.titles) {
        const m = /^LIT_([A-F0-9]+)_EQ_([A-F0-9]+)$/.exec(title);
        if (m) equations.push([`#214263${m[1]}`, `#214263${m[2]}`, Number(e.data.get(e.data.rows[0], title))]);
      }
    }
    expect(equations).toHaveLength(88);
    const completions = [false, true].map(merge => {
      const parent = new Map<string, string>();
      function find(x: string): string {
        if (!parent.has(x)) parent.set(x, x);
        const p = parent.get(x)!;
        if (p !== x) parent.set(x, find(p));
        return parent.get(x)!;
      }
      const join = (a: string, b: string) => parent.set(find(a), find(b));
      for (const [a, b, value] of equations) if (value) join(a, b);
      if (merge) join('rgb:12.1', 'new:12.1');
      for (const [a, b, value] of equations) expect(Number(find(a) === find(b))).toBe(value);
      return Number(find('rgb:12.1') === find('new:12.1'));
    });
    expect(completions).toEqual([0, 1]);
    expect(equations.some(([a, b]) => new Set([a, b]).has('rgb:12.1') && new Set([a, b]).has('new:12.1'))).toBe(false);
  });
});
