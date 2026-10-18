import { lock } from '../fixtures/v102Fixture';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { executeStack, stackCapture, stackEntries, stackJson, stackRaw, stackRevision, stackTable } from '../fixtures/v102Stack';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
describe('v102 stacking: four returned sources and bounded native observations', () => {
  it('binds the append-only pin and every immutable request/native/derived dependency', () => {
    expect(lock.revision).toBe(stackRevision);
    expect(stackEntries.map((entry: { id: string }) => entry.id).sort()).toEqual(['v102-stack-false-v5', 'v102-stack-false-v6', 'v102-stack-true-v5', 'v102-stack-true-v6']);
    const path = stackCapture + 'artifact-integrity-v4.json';
    const artifacts = stackJson(path).artifacts;
    expect(artifacts).toHaveLength(231);
    for (const proof of [...artifacts, { path, bytes: stackRaw(path).length, sha256: hash(stackRaw(path)) }]) {
      expect(lock.files.find((p: { path: string }) => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: stackRaw(proof.path).length, sha256: hash(stackRaw(proof.path)) }).toEqual(proof);
    }
  });
  for (const entry of stackEntries) {
    it(`${entry.id}: exact source/Save/Add/CSV ownership and independent physical closure`, () => {
      const { block, csv, report } = entry;
      const source = stackRaw(entry.sourcePath);
      const observation = report.sourceObservation;
      expect(hash(source)).toBe(block.sourceSha256);
      expect(source).toEqual(stackRaw(observation.executed.path));
      const saved = stackRaw(observation.sourceForm.path).toString('utf8').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
      expect(saved).toBe(source.toString('utf8'));
      const binding = stackJson(block.columnBindings.path);
      for (const body of [observation.saveBody, observation.addBody]) {
        const response = stackJson(body.path);
        expect(response.success).toBe(true);
        expect(response.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const column of binding.columns.filter((c: { sourceSha256?: string }) => c.sourceSha256)) {
          expect(column).toMatchObject({ sourceSha256: hash(source), owner: block.nativePrivateId, privateVersion: block.nativePrivateVersion });
          expect(csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(response.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      const session = observation.executed.path.replace('executed-v1.pine', 'session-mode0-v1/');
      const rowObservation = stackJson(session + 'row-set-observation-v1.json');
      const closed = csv.rows.map((row: string[]) => csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowObservation.nativeExportUtc));
      const anchors = csv.rows.flatMap((row: string[], index: number) => closed[index] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [index + 1] : []);
      expect(anchors).toEqual([block.uniqueVisualAnchorRowOrdinal]);
      const first = csv.rows.findIndex((row: string[], index: number) => Number(csv.get(row, 'INPUT_INDEX')) >= 200 && Number(csv.get(row, 'INPUT_INDEX')) % 8 === 0
        && index + 32 < anchors[0] && closed.slice(index, index + 32).length === 32 && closed.slice(index, index + 32).every(Boolean));
      expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => first + i + 1));
      const mask = stackTable(block.closureMask.path);
      for (const [index, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[index], 'independently_closed')).toBe(closed[index] ? '1' : '0');
        expect(mask.get(mask.rows[index], 'primary_scoring_eligible')).toBe(index >= first && index < first + 32 ? '1' : '0');
        if (index > first && index < first + 32) expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[index - 1], 'INPUT_INDEX')) + 1);
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (index) expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[index - 1], 'time')));
      }
      for (const row of block.rows) for (const pointer of Object.values(row.cells) as { csvSha256: string; columnOrdinal: number; rowOrdinal: number; headerRaw: string; valueRaw: string }[]) {
        expect(pointer.csvSha256).toBe(hash(stackRaw(block.csv.path)));
        expect(csv.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
        expect(csv.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
      }
      expect(block.rows).toHaveLength(32);
      expect(block.rows.reduce((n: number, row: { cells: object }) => n + Object.keys(row.cells).length, 0)).toBe(384);
      expect(report.properties).toHaveLength(10);
      expect(report.properties.every((p: { verdict: string }) => p.verdict === 'SUPPORTED')).toBe(true);
    });
    it(`${entry.id}: exact original-source replay of ten properties and chart time; absolute indices excluded`, () => {
      const { result } = executeStack(entry);
      let compared = 0;
      for (const [i, row] of entry.block.rows.entries()) for (const [title, pointer] of Object.entries(row.cells) as [string, { valueRaw: string }][]) {
        if (title === 'INPUT_INDEX') continue;
        const actual = result.plots.find(plot => plot.title === title)!.values[i];
        const raw = pointer.valueRaw;
        const label = `${entry.id} native row${row.rowOrdinal} ${title}`;
        expect(actual, label).toBe(raw === '' ? null : Number(raw));
        if (raw !== '') expect(String(actual), label).toBe(raw);
        compared++;
      }
      expect(compared).toBe(352);
      expect(entry.report.uniquePrimaryPlotCells).toBe(384);
      expect(result.declaration.explicitPlotZOrder).toBe(entry.id.includes('-true-'));
    });
    it(`${entry.id}: polyline-label and actual table intersections stay UNDECIDED with zero order credit`, () => {
      const facets = entry.regions.facets;
      for (const suffix of ['polyline-label-forward/reverse', 'table-actual-intersections']) {
        const facet = facets.find((f: { caseId: string }) => f.caseId.endsWith(':' + suffix));
        expect(facet.verdict).toBe('UNDECIDED');
        expect(facet.supportedCandidate).toBeUndefined();
      }
      expect(facets.filter((f: { verdict: string }) => f.verdict === 'SUPPORTED')).toHaveLength(3);
    });
  }
});
