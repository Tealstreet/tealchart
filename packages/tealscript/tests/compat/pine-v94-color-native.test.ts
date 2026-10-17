import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof { path: string; bytes: number; sha256: string }
interface Point { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Control {
  sourceId: string; sourceSha256: string; csv: Proof;
  coverage: { selectedDataRowOrdinals: number[] };
  modelVerdicts: Record<string, { verdict: string }>;
  rows: { rowOrdinal: number; cells: Point[]; comparisons: { model: string;
    properties: { property: string; verdict: string; predictedRational: string }[] }[] }[];
}
const base = 'v94/captures/v94/';
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => raw(path).toString();
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const csv = (path: string) => {
  // These captures contain no quoted fields; mask blank lists are [].
  const [headers, ...values] = text(path).trimEnd().split(/\r?\n/).map(line => line.split(','));
  return { headers, rows: values.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]]))) };
};
const controls = json<{ sources: Control[] }>(base + 'numeric-controls-v2.json').sources;
const ids = ['v94-gradient-clamp-v5', 'v94-gradient-clamp-v6', 'v94-gradient-rsi-v5', 'v94-gradient-rsi-v6', 'v94-gradient-discriminators-v5', 'v94-gradient-discriminators-v6'];
const entries = ids.map(id => {
  const folder = `${base}${id}/attempt-v1/`;
  const session = folder + 'session-mode0-v1/';
  const data = csv(session + 'chart-native-v1.csv');
  return { id, folder, session, data, source: text(`v94/sources/${id}.pine`),
    control: controls.find(c => c.sourceId === id)!, mask: csv(session + 'row-closure-mask-v1.csv').rows,
    observation: json<{ csv: Proof; nativeObservationUtc: string; independentlyClosedRows: number }>(session + 'row-set-observation-v1.json') };
});
function bars(entry: (typeof entries)[number], ordinals: number[]) {
  return ordinals.map(n => {
    const r = entry.data.rows[n - 1];
    return { time: Number(r.time) * 1000, open: Number(r.open), high: Number(r.high), low: Number(r.low),
      close: Number(r.close), volume: Number(r.Volume) };
  });
}
function compile(source: string) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  return compiled;
}

describe('v94 color adjudication: premultiplication, RGB bytes and transparency quantization', () => {
  it('authenticates all 205 complete v94 source/common artifacts including discriminators', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const common = ['v94/REQUEST-v94-v1.md', ...['RESPONSE-v94-v1.md', 'attempt-inventory-v2.json',
      'numeric-controls-v1.json', 'facet-capabilities-v1.json', 'artifact-integrity-v1.json', 'validation-result-v1.json', 'RESPONSE-v94-v2.md', 'attempt-inventory-v3.json', 'numeric-controls-v2.json',
      'facet-capabilities-v2.json', 'artifact-integrity-v2.json', 'validation-result-v2.json'].map(n => base + n)];
    const files = lock.files.filter(f => common.includes(f.path) || ids.some(id => f.path.startsWith(base + id + '/') || f.path === `v94/sources/${id}.pine`));
    expect(files).toHaveLength(205);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v2.json');
    for (const f of files) {
      const b = raw(f.path);
      expect({ path: f.path, bytes: b.length, sha256: hash(b) }).toEqual(f);
      if (!f.path.endsWith('/artifact-integrity-v2.json')) expect(integrity.files.find(p => p.path === f.path)).toEqual(f);
    }
    expect(json(base + 'validation-result-v2.json')).toMatchObject({ status: 'PASS', sourceAttemptsAudited: 6,
      dataRows: 1867, independentlyClosedRows: 1861, rawCellPointers: 6784 });
    const inventory = json<{ remainingSourceIds: string[]; observedSourceAttempts: number }>(base + 'attempt-inventory-v3.json');
    expect(inventory.remainingSourceIds).toEqual([]);
    expect(inventory.observedSourceAttempts).toBe(6);
    expect(files.some(f => f.path.includes('discriminators'))).toBe(true);
  });

  it('retains all archived refutations of continuous-alpha RSI hypotheses', () => {
    for (const entry of entries.filter(e => e.id.includes('-rsi-'))) {
      const models = Object.entries(entry.control.modelVerdicts).filter(([name]) => name !== 'SOURCE_CONTROL');
      expect(models).toHaveLength(18);
      expect(models.every(([, value]) => value.verdict === 'REFUTED')).toBe(true);
      expect(entry.control.modelVerdicts.SOURCE_CONTROL.verdict).toBe('SUPPORTED');
      for (const row of entry.control.rows) {
        const fullModels = row.comparisons.filter(c => c.model.startsWith('P/') || c.model.startsWith('S/'));
        expect(fullModels).toHaveLength(18);
        fullModels.forEach(c => expect(c.properties.find(p => p.property === 'RESULT_T')?.verdict).toBe('REFUTED'));
      }
      const first = entry.data.rows[0];
      expect([first.RSI, first.RESULT_R, first.RESULT_G, first.RESULT_B, first.RESULT_T, first.RESULT_NA])
        .toEqual(['38.759821737559854', '193', '61', '0', '20', '0']);
    }
  });

  for (const entry of entries) {
    it(`${entry.id}: keeps the exact request/Save source and native ownership`, () => {
      expect(entry.source).toBe(text(entry.folder + 'executed-v1.pine'));
      expect(hash(Buffer.from(entry.source))).toBe(entry.control.sourceSha256);
      const form = text(entry.folder + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(entry.source);
      const observation = json<{ sourceSha256: string; privateScriptId: string; privateVersion: string;
        nativeCompileSuccess: boolean; nativeWarningChannel: unknown[] }>(entry.folder + 'observation-v1.json');
      expect(observation).toMatchObject({ sourceSha256: entry.control.sourceSha256, nativeCompileSuccess: true, nativeWarningChannel: [] });
      expect(json<{ success: boolean }>(entry.folder + 'save-response-v1.json').success).toBe(true);
      expect(json<{ success: boolean }>(entry.folder + 'add-response-v1.json').success).toBe(true);
      const binding = json<{ columns: { columnOrdinal: number; originalHeader: string; nativePlotTitle?: string;
        owner: string; sourceSha256?: string; privateVersion?: string }[] }>(entry.session + 'column-bindings-v1.json');
      binding.columns.forEach(c => {
        expect(entry.data.headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
        if (c.nativePlotTitle !== undefined) expect(c).toMatchObject({ owner: observation.privateScriptId,
          privateVersion: observation.privateVersion, sourceSha256: observation.sourceSha256 });
      });
      compile(entry.source); // Unmodified native source admits; not an RSI-frontier replay.
    });

    it(`${entry.id}: derives closure and authenticates every scored cell, keeping developing rows excluded`, () => {
      const closed: number[] = [];
      expect(entry.mask).toHaveLength(entry.data.rows.length);
      entry.data.rows.forEach((r, i) => {
        const eligible = r.CHART_CONFIRMED === '1' && (Number(r.time) + 120) * 1000 <= Date.parse(entry.observation.nativeObservationUtc);
        const m = entry.mask[i];
        expect([m.csv_sha256, m.row_ordinal, m.time_raw_seconds, m.input_time_raw_ms, m.input_index_raw])
          .toEqual([entry.observation.csv.sha256, String(i + 1), r.time, r.INPUT_TIME, r.INPUT_INDEX]);
        expect(m.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        expect(Number(r.INPUT_TIME)).toBe(Number(r.time) * 1000);
        if (eligible) closed.push(i + 1);
        else {
          expect(m.present_cell_status).toBe('OBSERVED / EXCLUDED');
          expect(m.exclusion_cause).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
          expect(r.RESULT_NA ?? r.MIDDLE_NA ?? r.PARTIAL_NA).toBe('0'); // Present, not an absence/eligibility filter.
        }
      });
      expect(closed).toHaveLength(entry.observation.independentlyClosedRows);
      expect(entry.data.rows.length - closed.length).toBe(1);
      expect(entry.control.coverage.selectedDataRowOrdinals).toEqual(closed.slice(0, 32));
      expect(entry.control.rows).toHaveLength(32);
      let pointers = 0;
      entry.control.rows.forEach((sample, i) => {
        expect(sample.rowOrdinal).toBe(i + 1);
        sample.cells.forEach(p => {
          expect(p.rowOrdinal).toBe(sample.rowOrdinal);
          expect(entry.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(entry.data.rows[p.rowOrdinal - 1][p.headerRaw]).toBe(p.valueRaw);
          pointers++;
        });
      });
      expect(pointers).toBe(entry.id.includes('-clamp-') ? 1184 : entry.id.includes('-rsi-') ? 736 : 1472);
      // Builtin Volume is present and retained, not synthesized or interpreted as a plot.
      expect(entry.data.headers.indexOf('Volume') + 1).toBe(entry.id.includes('-rsi-') ? 27 : 6);
    });

    it(`${entry.id}: matches all 32 scored nonidentity plot rows, including transparency exactly`, () => {
      const scored = entry.control.coverage.selectedDataRowOrdinals;
      const identities = ['INPUT_INDEX', 'INPUT_TIME', 'CHART_CONFIRMED'];
      const titles = entry.data.headers.filter(h => !['time', 'open', 'high', 'low', 'close', 'Volume', ...identities].includes(h));
      let comparisons = 0;
      if (entry.id.includes('-clamp-')) {
        const result = executeCompiled(compile(entry.source), bars(entry, scored))!;
        expect(result.errors).toEqual([]);
        titles.forEach(title => {
          const plot = result.plots.find(p => p.title === title)!;
          scored.forEach((n, i) => { expect(plot.values[i], `${entry.id}:${n}:${title}`).toBe(Number(entry.data.rows[n - 1][title])); comparisons++; });
        });
        expect(comparisons).toBe(1024);
      } else if (entry.id.includes('-discriminators-')) {
        // Native PHASE joins to all seven locally executed phases. This is a
        // complete phase projection, never a native bar_index seed/frontier replay.
        const result = executeCompiled(compile(entry.source), bars(entry, [1, 2, 3, 4, 5, 6, 7]))!;
        expect(result.errors).toEqual([]);
        expect(result.plots.find(p => p.title === 'PHASE')!.values).toEqual([0, 1, 2, 3, 4, 5, 6]);
        for (const n of scored) {
          const r = entry.data.rows[n - 1];
          const phase = Number(r.PHASE);
          expect(phase).toBe(Number(r.INPUT_INDEX) % 7);
          titles.forEach(title => {
            expect(result.plots.find(p => p.title === title)!.values[phase], `${entry.id}:${n}:${title}`).toBe(Number(r[title]));
            comparisons++;
          });
        }
        expect(comparisons).toBe(1312);
        expect(entry.control.modelVerdicts.P.verdict).toBe('SUPPORTED');
        expect(entry.control.modelVerdicts.S.verdict).toBe('REFUTED');
        expect([...new Set(scored.map(n => Number(entry.data.rows[n - 1].PHASE)))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
        for (const row of entry.control.rows) {
          const premultiplied = row.comparisons.filter(c => c.model === 'P').flatMap(c => c.properties);
          expect(premultiplied).toHaveLength(15);
          expect(premultiplied.every(p => p.verdict === 'SUPPORTED')).toBe(true);
          // Opaque integer channels agree under S and P; they do not discriminate.
          const opaque = row.comparisons.filter(c => c.model === 'S').flatMap(c => c.properties).filter(p => p.property.startsWith('OPAQUE_'));
          expect(opaque).toHaveLength(5);
          expect(opaque.every(p => p.verdict === 'SUPPORTED')).toBe(true);
        }
      } else {
        // New, explicitly isolated kernel program. Feed each observed native RSI
        // scalar through the exact captured gradient expression and endpoint/getter
        // lines. No source repair, RSI seed, fake prefix or native-frontier claim.
        const gradientLine = entry.source.split('\n').find(l => l.startsWith('signalColor = '))!;
        const version = entry.id.endsWith('v5') ? 5 : 6;
        const projection = `//@version=${version}\nindicator("V94 gradient input projection")\nsignal = input.float(0, "NativeRSI")\n${gradientLine}\nplot(signal, title="Signal", color=signalColor)\n` + entry.source.slice(entry.source.indexOf('lower = '));
        const compiled = compile(projection);
        for (const n of scored) {
          const r = entry.data.rows[n - 1];
          const result = executeCompiled(compiled, bars(entry, [n]), new Map([['input_NativeRSI', Number(r.RSI)]]))!;
          expect(result.errors).toEqual([]);
          titles.forEach(title => {
            expect(result.plots.find(p => p.title === title)!.values[0], `${entry.id}:${n}:${title}`).toBe(Number(r[title]));
            comparisons++;
          });
        }
        expect(comparisons).toBe(576);
      }
    });
  }
});
