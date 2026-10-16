import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const directory = 'v93/captures/v93/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
interface Proof { path: string; bytes: number; sha256: string }
const proof = (path: string): Proof => ({ path, bytes: Buffer.byteLength(read(path)),
  sha256: createHash('sha256').update(read(path)).digest('hex') });
function csv(path: string) {
  const records = read(path).trimEnd().split(/\r?\n/).map(line => {
    const cells: string[] = [];
    let cell = '', quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') { cell += '"'; index++; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
      else cell += char;
    }
    cells.push(cell);
    return cells;
  });
  return { columns: records[0], rows: records.slice(1) };
}
interface Source {
  sourceId: string; item: number; pineVersion: number; requestSource: string;
  sourceSha256: string; executed: Proof; nativeCompileSuccess: boolean;
  privateScriptId: string; privateVersion: string; nativeStudyInstanceId: null;
  nativeWarningChannel: unknown[]; separateMarkerArrays: null;
  saveBody: Proof; addBody: Proof | null;
}
interface Session {
  sourceId: string; csv: Proof; dataRows: number; columnCount: number;
  independentlyClosedRows: number; longestConsecutiveClosedRun: number;
  required32RowCriterion: string; nativeObservationUtc: string;
  closedRunRawPointers: { rowOrdinal: number; timeRaw: string; indexRaw: string }[];
  rawFirstRow: string[]; rawLastRow: string[]; closureMask: Proof; columnBindings: Proof;
}
interface Attempt { source: Source; status: string; removed: boolean | null; sessions: Session[] }
interface Pointer { csvSha256: string; rowOrdinal: number; timeRaw: string; columnOrdinal: number;
  title: string; raw: string; frozenExpected: string }
interface Property { sourceId?: string; pineVersion?: number; property: string; criterionVerdict: string;
  hypothesis: string; nativeCellPointers?: Pointer[]; cause?: string; compilerBody?: Proof }
interface Facet { sourceId: string; item: number; numericRowSet: string; properties: Property[];
  renderingClaim: boolean; nativeCompilerOutcome: unknown }
interface Column { columnOrdinal: number; originalHeader: string; owner: string; privateVersion?: string;
  sourceSha256?: string; nativePlotId?: string; nativePlotTitle?: string }
interface CompilerBody { success: boolean; reason?: string;
  reason2?: { errors: { start: { line: number; column: number }; end: { line: number; column: number }; message: string }[]; warnings: unknown[] };
  result: { metaInfo: { id: string; pine: { version: string }; warnings: unknown[]; styles: Record<string, { title: string }> } } }

const stems = ['box-points-v5', 'box-points-v6', 'box-xloc-v5', 'box-xloc-v6', 'line-v5', 'line-v6'];
const sourceIds = stems.map(stem => `v93-coordinate-${stem}`);
const attemptDirectory = (id: string) => `${directory}${id}/attempt-v1/`;
const inventory = json<{ attempts: Attempt[] }>(directory + 'attempt-inventory-v4.json');
const attempts = inventory.attempts.filter(attempt => sourceIds.includes(attempt.source.sourceId));
const facets = json<{ facets: Facet[] }>(directory + 'facet-capabilities-v4.json').facets
  .filter(facet => sourceIds.includes(facet.sourceId));
const controls = json<{ results: Property[] }>(directory + 'numeric-controls-v4.json').results
  .filter(control => sourceIds.includes(control.sourceId!));
const metadata = ['RESPONSE-v93-v4.md', 'artifact-integrity-v4.json', 'validation-result-v4.json',
  'attempt-inventory-v4.json', 'numeric-controls-v4.json', 'facet-capabilities-v4.json'];
const paths = metadata.map(file => directory + file).concat(sourceIds.flatMap(id => {
  const prefix = attemptDirectory(id);
  return [`v93/sources/${id}.pine`, ...['executed-v1.pine', 'save-request-v1.txt', 'save-response-v1.json',
    'observation-v1.json'].map(file => prefix + file),
  ...(id === 'v93-coordinate-box-xloc-v5'
    ? ['post-save-immediate-v1.txt', 'post-save-settled-v1.txt'].map(file => prefix + file)
    : [prefix + 'add-response-v1.json', ...['chart-native-v1.csv', 'column-bindings-v1.json',
      'row-closure-mask-v1.csv', 'row-set-observation-v1.json'].map(file => prefix + 'session-mode0-v1/' + file)])];
}));
const vectorFor = (id: string): Record<string, string> => id.includes('coordinate-line-')
  ? { TIME_X1_DELTA: '0', TIME_X2_DELTA: '120000', RETURN_X1_REL: '0', POINT_X1_REL: '2', POINT_Y1: '7', POINT_X2_REL: '3', POINT_Y2: '9' }
  : id.includes('box-xloc-')
    ? { TIME_LEFT_DELTA: '0', TIME_RIGHT_DELTA: '120000', RETURN_LEFT_REL: '2', RETURN_RIGHT_REL: '3' }
    : { POINT_LEFT_REL: '2', POINT_TOP: '10', POINT_RIGHT_REL: '3', POINT_BOTTOM: '4' };
const exports = attempts.filter(attempt => attempt.source.nativeCompileSuccess).map(attempt => {
  const session = attempt.sessions[0];
  return { attempt, session, data: csv(session.csv.path), mask: csv(session.closureMask.path) };
});
const refusalMessage = "Could not find function or function reference 'box.set_xloc'";

describe('v93 item5 native coordinate setters, bounded to the six captured sources', () => {
  it('SHA-binds only this family and the v4 inventory, integrity and validation artifacts', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const integrity = json<{ version: string; selfExcluded: boolean; files: Proof[] }>(directory + 'artifact-integrity-v4.json');
    expect([integrity.version, integrity.selfExcluded]).toEqual(['v4', true]);
    expect(paths).toHaveLength(63);
    expect(new Set(paths).size).toBe(63);
    for (const path of paths) {
      expect(lock.files.find(file => file.path === path)).toEqual(proof(path));
      if (!path.endsWith('/artifact-integrity-v4.json')) expect(integrity.files.find(file => file.path === path)).toEqual(proof(path));
    }
    // Snapshot-wide validation is provenance, not credit for other families.
    expect(json(directory + 'validation-result-v4.json')).toMatchObject({ version: 'v4',
      status: 'PASS;26-attempt progress snapshot; layout checkpoint remains12 sources',
      exactPrivateSaveAttempts: 26, saveRefusals: 1, nativeCsvBindings: 25 });
  });

  it('authenticates six exact source/private-version bindings and five successful Save/Add pairs', () => {
    expect(attempts.map(attempt => attempt.source.sourceId)).toEqual(sourceIds);
    expect(new Set(attempts.map(attempt => attempt.source.privateScriptId)).size).toBe(6);
    expect(exports).toHaveLength(5);
    for (const { source, sessions, removed } of attempts) {
      const prefix = attemptDirectory(source.sourceId);
      expect(json(prefix + 'observation-v1.json')).toEqual(source);
      expect([source.item, source.pineVersion, source.privateVersion]).toEqual([5, source.sourceId.endsWith('v5') ? 5 : 6, '1.0']);
      expect(source.executed).toEqual(proof(prefix + 'executed-v1.pine'));
      expect(source.sourceSha256).toBe(source.executed.sha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      const form = read(prefix + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      expect([source.nativeStudyInstanceId, source.separateMarkerArrays]).toEqual([null, null]);
      expect(source.nativeWarningChannel).toEqual([]);
      expect(sessions).toHaveLength(source.nativeCompileSuccess ? 1 : 0);
      expect(removed).toBe(source.nativeCompileSuccess ? true : null);
      for (const body of [source.saveBody, ...(source.addBody ? [source.addBody] : [])]) {
        expect(body).toEqual(proof(body.path));
        const native = json<CompilerBody>(body.path);
        expect(native.success).toBe(source.nativeCompileSuccess);
        expect(native.result.metaInfo.pine.version).toBe(source.privateVersion);
        expect(native.result.metaInfo.id).toBe(`Script$${source.privateScriptId}@tv-scripting-101`);
        expect(native.result.metaInfo.warnings).toEqual([]);
      }
      expect(source.addBody !== null).toBe(source.nativeCompileSuccess);
    }
  });

  it('independently checks every closure mask; developing nonblank getters remain OBSERVED and excluded', () => {
    let rows = 0, closed = 0, exactGetters = 0, maskedGetters = 0, maskedCells = 0;
    for (const { attempt, session, data, mask } of exports) {
      const prefix = attemptDirectory(attempt.source.sourceId) + 'session-mode0-v1/';
      expect(json(prefix + 'row-set-observation-v1.json')).toEqual(session);
      expect(session.csv).toEqual(proof(session.csv.path));
      expect(session.closureMask).toEqual(proof(session.closureMask.path));
      expect([data.rows.length, data.columns.length]).toEqual([session.dataRows, session.columnCount]);
      expect(mask.rows).toHaveLength(data.rows.length);
      const cell = (row: string[], title: string) => row[data.columns.indexOf(title)];
      const pointers: Session['closedRunRawPointers'] = [];
      let run = 0, longest = 0;
      data.rows.forEach((row, index) => {
        const physicalClose = Number(row[0]) + 120;
        const eligible = cell(row, 'CHART_CONFIRMED') === '1'
          && physicalClose * 1000 <= Date.parse(session.nativeObservationUtc);
        expect(row).toHaveLength(data.columns.length);
        expect(cell(row, 'INPUT_TIME')).toBe(String(Number(row[0]) * 1000));
        expect(mask.rows[index]).toEqual([session.csv.sha256, String(index + 1), row[0],
          cell(row, 'INPUT_TIME'), cell(row, 'INPUT_INDEX'), cell(row, 'CHART_CONFIRMED'),
          session.nativeObservationUtc, String(physicalClose), eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED',
          JSON.stringify(row.flatMap((value, ordinal) => value === '' ? [ordinal + 1] : [])),
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        rows++;
        if (eligible) {
          closed++; run++; longest = Math.max(longest, run);
          pointers.push({ rowOrdinal: index + 1, timeRaw: row[0], indexRaw: cell(row, 'INPUT_INDEX') });
          if (index > 0) {
            expect(Number(row[0]) - Number(data.rows[index - 1][0])).toBe(120);
            expect(Number(cell(row, 'INPUT_INDEX')) - Number(cell(data.rows[index - 1], 'INPUT_INDEX'))).toBe(1);
          }
          exactGetters += Object.keys(vectorFor(attempt.source.sourceId)).length;
        } else {
          run = 0;
          // Retain the native values as observations without closed-row parity credit.
          for (const [title, raw] of Object.entries(vectorFor(attempt.source.sourceId))) expect(cell(row, title)).toBe(raw);
          maskedGetters += Object.keys(vectorFor(attempt.source.sourceId)).length;
          maskedCells += row.slice(5).filter(raw => raw !== '').length;
        }
      });
      expect(pointers).toEqual(session.closedRunRawPointers);
      expect([pointers.length, longest, session.required32RowCriterion]).toEqual([
        session.independentlyClosedRows, session.longestConsecutiveClosedRun, 'CAPTURED']);
      expect(longest).toBeGreaterThanOrEqual(32);
      expect([data.rows[0], data.rows.at(-1)]).toEqual([session.rawFirstRow, session.rawLastRow]);
    }
    expect([rows, closed, exactGetters, maskedGetters, maskedCells]).toEqual([1705, 1700, 8825, 26, 41]);
  });

  for (const entry of exports) {
    it(`${entry.attempt.source.sourceId}: exactly replays all independently closed getter cells`, () => {
      const { attempt: { source }, session, data, mask } = entry;
      const binding = json<{ csv: Proof; source: Source; nativePrivateVersion: string; chartVolumeColumn: null;
        columns: Column[] }>(session.columnBindings.path);
      expect(session.columnBindings).toEqual(proof(session.columnBindings.path));
      expect(binding.csv).toEqual(session.csv);
      expect(binding.source).toEqual(source);
      expect(binding.nativePrivateVersion).toBe('1.0');
      expect(binding.chartVolumeColumn).toBeNull();
      expect(binding.columns.map(column => column.originalHeader)).toEqual(data.columns);
      binding.columns.forEach((column, index) => {
        expect(column.columnOrdinal).toBe(index + 1);
        if (index < 5) return;
        expect(column).toMatchObject({ owner: source.privateScriptId, privateVersion: '1.0',
          sourceSha256: source.sourceSha256, nativePlotId: `plot_${index - 5}`, nativePlotTitle: data.columns[index] });
        for (const body of [source.saveBody, source.addBody!]) {
          expect(json<CompilerBody>(body.path).result.metaInfo.styles[column.nativePlotId!].title).toBe(data.columns[index]);
        }
      });
      const ast = parse(read(source.executed.path));
      expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      const compiled = tryCompile(ast);
      expect(compiled.success).toBe(true);
      const native = data.rows.filter((_, index) => mask.rows[index][8] === '1');
      // These sources only read current time/index and replace/delete objects each bar.
      // Rebase index at the retained export frontier; compare relative getters only.
      // No native execution-frontier, INPUT_INDEX or volume parity is claimed.
      const bars: Bar[] = native.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]),
        high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: NaN }));
      const result = executeCompiled(compiled, bars, undefined, { runtime: {
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } })!;
      expect(result.errors).toEqual([]);
      expect(result.plots.map(plot => plot.title)).toEqual(data.columns.slice(5));
      const vector = vectorFor(source.sourceId);
      for (const [title, raw] of Object.entries(vector)) {
        const ordinal = data.columns.indexOf(title);
        const values = result.plots[ordinal - 5].values;
        expect(values).toHaveLength(native.length);
        native.forEach((row, index) => {
          expect(row[ordinal], `${source.sourceId}:${row[0]}:${title}:native`).toBe(raw);
          expect(values[index], `${source.sourceId}:${row[0]}:${title}`).toBe(Number(row[ordinal]));
        });
      }
      const facet = facets.find(facet => facet.sourceId === source.sourceId)!;
      expect([facet.item, facet.numericRowSet, facet.renderingClaim]).toEqual([5, 'CAPTURED', false]);
      expect(facet.properties.map(property => property.property)).toEqual(Object.keys(vector));
      for (const property of facet.properties) {
        expect([property.criterionVerdict, property.hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
        expect(property.nativeCellPointers).toHaveLength(32);
        expect(controls.find(control => control.sourceId === source.sourceId && control.property === property.property)).toEqual(property);
        property.nativeCellPointers!.forEach((pointer, index) => {
          expect(pointer.rowOrdinal).toBe(index + 1);
          expect(pointer.csvSha256).toBe(session.csv.sha256);
          expect(pointer.timeRaw).toBe(data.rows[index][0]);
          expect(mask.rows[index][8]).toBe('1');
          expect(pointer.columnOrdinal).toBe(data.columns.indexOf(property.property) + 1);
          expect([pointer.title, pointer.raw, pointer.frozenExpected]).toEqual([
            property.property, data.rows[index][pointer.columnOrdinal - 1], vector[property.property]]);
        });
      }
    });
  }

  it('v5 box.set_xloc refuses at the captured first callee', () => {
    const attempt = attempts.find(attempt => attempt.source.sourceId === 'v93-coordinate-box-xloc-v5')!;
    const { source } = attempt;
    const native = json<CompilerBody>(source.saveBody.path);
    expect(native.success).toBe(false);
    expect(native.reason).toBe(`line 4: ${refusalMessage}`);
    expect(native.reason2).toEqual({ errors: [{ start: { line: 4, column: 1 }, end: { line: 4, column: 12 }, message: refusalMessage }], warnings: [] });
    expect([attempt.status, attempt.sessions, source.addBody]).toEqual(['NATIVE SAVE COMPILER REFUSAL', [], null]);
    // The UI's separate count is not a full marker array or a second compiler error.
    expect(read(attemptDirectory(source.sourceId) + 'post-save-settled-v1.txt')).toContain('1 of 2 problems');
    const ast = parse(read(source.executed.path));
    const errors = checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    expect(errors).toEqual([{ code: 'unknown-function', severity: 'error', message: refusalMessage, line: 4, column: 1 }]);
    // TealScript diagnostics expose the start only. Preserve native's full inclusive
    // 1..12 span in the bound compiler body, without claiming an engine end field.
    const marker = native.reason2!.errors[0];
    expect(read(source.executed.path).split('\n')[marker.start.line - 1]
      .slice(marker.start.column - 1, marker.end.column)).toBe('box.set_xloc');
  });

  it('unchecked compilation also refuses v5 box.set_xloc while v6 remains admitted', () => {
    const v5 = attempts.find(attempt => attempt.source.sourceId === 'v93-coordinate-box-xloc-v5')!.source;
    const ast = parse(read(v5.executed.path));
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(false);
    expect(compiled.unsupported).toContain(refusalMessage);
    const v6 = attempts.find(attempt => attempt.source.sourceId === 'v93-coordinate-box-xloc-v6')!.source;
    expect(tryCompile(parse(read(v6.executed.path))).success).toBe(true);
  });

  it('keeps builtin receiver admission versioned and preserves a selected local method', () => {
    // Binding controls only: these derived sources receive no native value credit.
    for (const version of [5, 6]) {
      const header = `//@version=${version}\nindicator("binding")\na = box.new(0, 8, 1, 2)\n`;
      const builtin = parse(header + 'a.set_xloc(time, time + 120000, xloc.bar_time)\nplot(close)');
      expect(checkProgram(builtin).diagnostics.filter(diagnostic => diagnostic.severity === 'error').map(diagnostic => diagnostic.message))
        .toEqual(version === 5 ? [refusalMessage] : []);
      expect(tryCompile(builtin).success).toBe(version === 6);
      const local = parse(header + 'method set_xloc(box id, int left, int right, string loc) => id\na.set_xloc(0, 1, xloc.bar_index)\nplot(close)');
      expect(checkProgram(local).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      expect(tryCompile(local).success).toBe(true);
    }
  });

  it('keeps all four refused v5 getters held with zero value credit; label sources stay outside this snapshot', () => {
    expect(facets).toHaveLength(6);
    expect(controls).toHaveLength(26);
    const facet = facets.find(facet => facet.sourceId === 'v93-coordinate-box-xloc-v5')!;
    expect([facet.numericRowSet, facet.renderingClaim]).toEqual(['NOT OBSERVED', false]);
    expect(facet.properties.map(property => property.property)).toEqual(Object.keys(vectorFor(facet.sourceId)));
    for (const property of facet.properties) {
      expect([property.criterionVerdict, property.hypothesis]).toEqual(['NOT OBSERVED', 'UNDECIDED']);
      expect(property.cause).toBe('Exact-source native Save compiler refusal; no execution/getter CSV');
      expect(property.nativeCellPointers).toBeUndefined();
      expect(property.compilerBody).toEqual(proof(attemptDirectory(facet.sourceId) + 'save-response-v1.json'));
    }
    expect(paths.every(path => !path.includes('coordinate-label'))).toBe(true);
  });
});
