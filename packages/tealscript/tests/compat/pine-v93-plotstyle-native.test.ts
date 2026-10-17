import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { analyze } from '../../src/runtime/codegen/analyzer';
import { compile } from '../../src/runtime/codegen/compile';
import { builtinSignatureForCoverage, checkProgram } from '../../src/semantic/checker';
import { executePlotstyleV93, plotstyleCsv, plotstyleDirectory as directory, plotstyleJson as json,
  plotstyleRead as read, plotstyleSession as session, plotstyleSource as source } from '../helpers/plotstyleV93';

interface Binding { path: string; bytes: number; sha256: string }
interface NativeError { message: string; start: { line: number; column: number }; end: { line: number; column: number } }
const hash = (raw: Buffer) => createHash('sha256').update(raw).digest('hex');
const refusal = json<{ success: boolean; reason2: { errors: NativeError[]; warnings: unknown[] } }>(
  `${directory}v93-plot-dash-v5/attempt-v1/save-response-v1.json`);
const errors = (version: 5 | 6) => checkProgram(parse(source(version))).diagnostics.filter(d => d.severity === 'error');

describe('v93 item 8 plot-dash: versioned admission, constants, and native evidence', () => {
  it('binds all 54 item-8 dash/common artifacts to the immutable pin and v6 integrity inventory', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string; files: Binding[] };
    expect(lock.revision).toBe('9b09e201ded714141fbcb8de348c8c00cf66da0d');
    const common = ['RESPONSE-v93-v6.md', 'attempt-inventory-v6.json', 'numeric-controls-v6.json',
      'facet-capabilities-v6.json', 'artifact-integrity-v6.json', 'validation-result-v6.json'];
    const files = lock.files.filter(f => f.path.includes('/v93-plot-dash-v')
      || common.some(name => f.path === directory + name));
    expect(files).toHaveLength(54);
    expect(files.every(f => f.path.includes('/v93-plot-dash-v') || /\/[^/]+-v6\.(json|md)$/.test(f.path))).toBe(true);
    const integrity = json<{ selfExcluded: boolean; files: Binding[] }>(`${directory}artifact-integrity-v6.json`);
    expect(integrity.selfExcluded).toBe(true);
    for (const file of files) {
      const raw = read(file.path);
      expect({ bytes: raw.length, sha256: hash(raw) }, file.path).toEqual({ bytes: file.bytes, sha256: file.sha256 });
      if (!file.path.endsWith('/artifact-integrity-v6.json')) {
        expect(integrity.files.find(f => f.path === file.path), file.path).toEqual(file);
      }
    }
    expect(json<{ status: string }>(`${directory}validation-result-v6.json`).status).toMatch(/^PASS;/);
  });

  it.each([5, 6] as const)('binds v%s request, execution, and exact Save form without substitutions', version => {
    const prefix = `${directory}v93-plot-dash-v${version}/attempt-v1/`;
    const text = source(version);
    expect(read(`${prefix}executed-v1.pine`).toString()).toBe(text);
    const form = read(`${prefix}save-request-v1.txt`).toString().replace(/\r\n/g, '\n');
    const saved = form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0];
    expect(saved).toBe(text);
    const observation = json<{ sourceSha256: string; nativeCompileSuccess: boolean; addBody: Binding | null }>(`${prefix}observation-v1.json`);
    expect(observation.sourceSha256).toBe(hash(Buffer.from(text)));
    expect(observation.nativeCompileSuccess).toBe(version === 6);
    if (version === 5) expect(observation.addBody).toBeNull();
  });

  it('refuses the exact v5 source with all seven native errors in native order and start positions', () => {
    expect(refusal.success).toBe(false);
    expect(refusal.reason2.errors).toHaveLength(7);
    expect(refusal.reason2.warnings).toEqual([]);
    expect(errors(5).map(({ message, line, column }) => ({ message, line, column }))).toEqual(
      refusal.reason2.errors.map(({ message, start }) => ({ message, ...start })));
    // Native end spans are retained, but SemanticDiagnostic exposes only starts.
  });

  it('also refuses v5 through direct unchecked compilation and analysis', () => {
    expect(compile(parse(source(5))).success).toBe(false);
    expect(analyze(parse(source(5))).unsupported).toContain("Undeclared identifier 'plot.linestyle_solid'");
  });

  it('keeps v6 admission and the coverage signatures versioned', () => {
    expect(errors(6)).toEqual([]);
    expect(compile(parse(source(6))).success).toBe(true);
    expect(builtinSignatureForCoverage('plot', 5)?.params).not.toContain('linestyle');
    expect(builtinSignatureForCoverage('plot', 6)?.params).toContain('linestyle');
  });

  it('re-derives closure independently and compares 1083 closed constant cells exactly', () => {
    const { result, rows } = executePlotstyleV93();
    expect(result.errors).toEqual([]);
    const [header, ...mask] = plotstyleCsv(`${session}row-closure-mask-v1.csv`);
    expect(header[8]).toBe('closed_numeric_eligible');
    expect(rows).toHaveLength(362);
    expect(mask).toHaveLength(rows.length);
    const observation = json<{ nativeObservationUtc: string; independentlyClosedRows: number }>(`${session}row-set-observation-v1.json`);
    const clock = Date.parse(observation.nativeObservationUtc) / 1000;
    const digest = hash(read(`${session}chart-native-v1.csv`));
    const plots = ['SOLID', 'DASHED', 'DOTTED'].map(title => result.plots.find(p => p.title === title)!);
    expect(plots.map(p => p.lineStyle)).toEqual(['solid', 'dashed', 'dotted']);
    let comparisons = 0;
    const excluded: string[][] = [];
    rows.forEach((row, i) => {
      const closed = row[10] === '1' && Number(row[0]) + 120 <= clock;
      expect(mask[i].slice(0, 6)).toEqual([digest, String(i + 1), row[0], row[9], row[8], row[10]]);
      expect(mask[i][7]).toBe(String(Number(row[0]) + 120));
      expect(mask[i][8]).toBe(closed ? '1' : '0');
      expect(Number(row[9])).toBe(Number(row[0]) * 1000);
      if (!closed) { excluded.push(row); return; }
      plots.forEach((plot, lane) => {
        expect(row[5 + lane]).toBe(String((lane + 1) * 10));
        expect(plot.values[i]).toBe(Number(row[5 + lane]));
        comparisons++;
      });
    });
    expect([observation.independentlyClosedRows, comparisons]).toEqual([361, 1083]);
    // OBSERVED / EXCLUDED developing values, never parity credit or unobserved.
    expect(excluded.map(r => [r[0], ...r.slice(5)])).toEqual([
      ['1792175160', '10', '20', '30', '23593', '1792175160000', '0'],
    ]);
    expect(mask.at(-1)?.[11]).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
  });

  it('binds the 96 frozen numeric pointers and 32 closed visual rows to the raw CSV', () => {
    const [headers, ...rows] = plotstyleCsv(`${session}chart-native-v1.csv`);
    const bindings = json<{ columns: { columnOrdinal: number; originalHeader: string; nativePlotTitle?: string; owner: string; sourceSha256?: string }[] }>(`${session}column-bindings-v1.json`);
    bindings.columns.forEach(b => expect(headers[b.columnOrdinal - 1]).toBe(b.originalHeader));
    const controls = json<{ results: { sourceId: string; property: string; nativeCellPointers: {
      rowOrdinal: number; columnOrdinal: number; title: string; timeRaw: string; raw: string;
      frozenExpected: string; expectedNativeMissing: boolean; csvSha256: string }[] }[] }>(`${directory}numeric-controls-v6.json`)
      .results.filter(c => c.sourceId === 'v93-plot-dash-v6');
    expect(controls.map(c => c.property)).toEqual(['SOLID', 'DASHED', 'DOTTED']);
    controls.forEach((c, lane) => {
      expect(c.nativeCellPointers).toHaveLength(32);
      c.nativeCellPointers.forEach(p => {
        expect(p.columnOrdinal).toBe(6 + lane);
        expect([p.title, p.timeRaw, p.raw, p.frozenExpected, p.expectedNativeMissing, p.csvSha256]).toEqual([
          headers[p.columnOrdinal - 1], rows[p.rowOrdinal - 1][0], rows[p.rowOrdinal - 1][p.columnOrdinal - 1],
          String((lane + 1) * 10), false, hash(read(`${session}chart-native-v1.csv`)),
        ]);
        expect(bindings.columns[p.columnOrdinal - 1]).toMatchObject({ nativePlotTitle: c.property,
          sourceSha256: hash(Buffer.from(source(6))) });
      });
    });
    const map = json<{ sourceSha256: string; screenshot: Binding; csv: Binding;
      visibleClosed32BarRun: { rowOrdinals: number[]; firstTimeRaw: string; lastTimeRaw: string };
      properties: { property: string; criterionVerdict: string; hypothesis: string }[];
      numericValuesDoNotCertifyRendering: boolean; crossVersionPixelEqualityClaim: boolean }>(`${session}derived-region-map-v1.json`);
    expect(map.sourceSha256).toBe(hash(Buffer.from(source(6))));
    [map.screenshot, map.csv].forEach(b => expect(hash(read(b.path))).toBe(b.sha256));
    const ordinals = map.visibleClosed32BarRun.rowOrdinals;
    expect(ordinals).toEqual(Array.from({ length: 32 }, (_, i) => 289 + i));
    expect([rows[ordinals[0] - 1][0], rows[ordinals.at(-1)! - 1][0]]).toEqual([
      map.visibleClosed32BarRun.firstTimeRaw, map.visibleClosed32BarRun.lastTimeRaw]);
    ordinals.forEach(n => expect(rows[n - 1][10]).toBe('1'));
    expect(map.properties.map(p => [p.property, p.criterionVerdict, p.hypothesis])).toEqual([
      ['SOLID stroke', 'CAPTURED', 'SUPPORTED'], ['DASHED stroke', 'CAPTURED', 'SUPPORTED'], ['DOTTED stroke', 'CAPTURED', 'SUPPORTED'],
    ]);
    expect([map.numericValuesDoNotCertifyRendering, map.crossVersionPixelEqualityClaim]).toEqual([true, false]);
  });

  it('gives the refused v5 source no numeric or rendering credit', () => {
    const facets = json<{ facets: { sourceId: string; valueAndRenderingCredit?: number; properties: {
      criterionVerdict: string; hypothesis: string; cause?: string }[] }[] }>(`${directory}facet-capabilities-v6.json`);
    const v5 = facets.facets.find(f => f.sourceId === 'v93-plot-dash-v5')!;
    expect(v5.valueAndRenderingCredit).toBe(0);
    expect(v5.properties).toHaveLength(6);
    v5.properties.forEach(p => expect(p).toMatchObject({ criterionVerdict: 'NOT OBSERVED', hypothesis: 'UNDECIDED',
      cause: 'Exact-source native Save refusal; no Add/CSV/rendering execution' }));
    const inventory = json<{ attempts: { source: { sourceId: string }; sessions: unknown[]; status: string }[] }>(`${directory}attempt-inventory-v6.json`);
    expect(inventory.attempts.find(a => a.source.sourceId === 'v93-plot-dash-v5')).toMatchObject({
      status: 'NATIVE SAVE COMPILER REFUSAL', sessions: [],
    });
  });
});


describe('plot linestyle admission boundaries (local controls, no native credit)', () => {
  it.each(['"solid"', '"dashed"', '"dotted"'])('refuses the v5 named slot even with literal %s', value => {
    const ast = parse(`//@version=5\nindicator("Slot")\nplot(1, linestyle=${value})`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([
      { code: 'plot-linestyle-version', severity: 'error',
        message: "The 'plot' function does not have an argument with the name 'linestyle'", line: 3, column: 9 },
    ]);
    expect(compile(ast).success).toBe(false);
  });

  it('keeps the legacy v5 transp overload while refusing its linestyle slot', () => {
    const admitted = parse('//@version=5\nindicator("Legacy transparency")\nplot(1, transp=25)');
    expect(checkProgram(admitted).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(compile(admitted).success).toBe(true);
    const refused = parse('//@version=5\nindicator("Legacy transparency")\nplot(1, transp=25, linestyle="solid")');
    expect(checkProgram(refused).diagnostics.filter(d => d.severity === 'error').map(d => d.message)).toEqual([
      "The 'plot' function does not have an argument with the name 'linestyle'",
    ]);
    expect(compile(refused).success).toBe(false);
  });

  it('refuses an unavailable constant even without the plot call slot', () => {
    const ast = parse('//@version=5\nindicator("Alias")\ns = plot.linestyle_dashed\nplot(1)');
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error').map(d => d.message)).toEqual([
      "Undeclared identifier 'plot'", "Undeclared identifier 'plot.linestyle_dashed'",
    ]);
    expect(compile(ast).success).toBe(false);
  });

  it.each([5, 6])('keeps v%s plot styles and hline/line styles available', version => {
    const ast = parse(`//@version=${version}\nindicator("Unaffected")\nplot(1, style=plot.style_line)\nhline(2, linestyle=hline.style_dashed)\nline.new(0, 1, 1, 2, style=line.style_dotted)`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(compile(ast).success).toBe(true);
  });

  it('does not treat a v5 local UDT field as the builtin plot namespace', () => {
    const ast = parse(`//@version=5
indicator("Local receiver")
type Local
    string linestyle_dashed
f(Local plot) => plot.linestyle_dashed
f(Local.new("local"))
plot(1)
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(compile(ast).success).toBe(true);
  });

  it('does not refuse a local callable solely for a parameter named linestyle', () => {
    const ast = parse(`//@version=5
indicator("Local callable")
f(float linestyle) => linestyle
plot(f(linestyle=10))
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(compile(ast).success).toBe(true);
  });
});


it('resolves a local v5 function named plot before enforcing the builtin slot', () => {
  const ast = parse(`//@version=5
indicator("Local plot callable")
plot(float value, string linestyle) => value
log.info(str.tostring(plot(10, linestyle="local")))
`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  expect(compile(ast).success).toBe(true);
});


it('does not let a local callable named plot enable the unavailable builtin constants', () => {
  const ast = parse(`//@version=5
indicator("Local plot namespace")
plot(float value) => value
s = plot.linestyle_solid
log.info(str.tostring(plot(10)))
`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error').map(d => d.message)).toEqual([
    "Undeclared identifier 'plot'", "Undeclared identifier 'plot.linestyle_solid'",
  ]);
  expect(compile(ast).success).toBe(false);
});


it('does not let a scalar named plot enable the unavailable builtin constants', () => {
  const ast = parse(`//@version=5
indicator("Scalar plot namespace")
plot = 1
s = plot.linestyle_dashed
log.info(str.tostring(plot))
`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error').map(d => d.message)).toEqual([
    "Undeclared identifier 'plot'", "Undeclared identifier 'plot.linestyle_dashed'",
  ]);
  expect(compile(ast).success).toBe(false);
});
