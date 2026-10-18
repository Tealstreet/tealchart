import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { executeLinefill, linefillCapture, linefillEntries, linefillJson, linefillRaw, linefillRevision, linefillTable } from '../fixtures/v102Linefill';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8'));
describe('v102 linefill: three returned sources and bounded native observations', () => {
  it('binds the append-only pin and every immutable request/native/derived dependency', () => {
    expect(lock.revision).toBe(linefillRevision);
    expect(linefillEntries.map((entry: { id: string }) => entry.id).sort()).toEqual(['v102-line-price-v5', 'v102-line-price-vertical-v5', 'v102-linefill-sloped-v5']);
    const path = linefillCapture + 'artifact-integrity-v12.json';
    const artifacts = linefillJson(path).artifacts;
    expect(artifacts).toHaveLength(565);
    expect(linefillJson(linefillCapture + 'facet-capabilities-v12.json').held).toEqual([
      'Every absent/clipped/nonintersecting/already obscured/precision-ambiguous visual property',
      'Unexposed independent editor arrays, native frame/feed/execution IDs, full private inventory and actual backend calculation count',
      'Historical preservation/semantic holds and universal color/identity/raster/font contracts',
    ]);
    for (const proof of [...artifacts, { path, bytes: linefillRaw(path).length, sha256: hash(linefillRaw(path)) }]) {
      expect(lock.files.find((p: { path: string }) => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: linefillRaw(proof.path).length, sha256: hash(linefillRaw(proof.path)) }).toEqual(proof);
    }
  });
  for (const entry of linefillEntries) {
    it(`${entry.id}: exact source/Save/Add/CSV ownership and independent physical closure`, () => {
      const { block, csv, report } = entry;
      const source = linefillRaw(entry.sourcePath);
      const observation = report.sourceObservation;
      expect(hash(source)).toBe(block.sourceSha256);
      expect(source).toEqual(linefillRaw(observation.executed.path));
      const saved = linefillRaw(observation.sourceForm.path).toString('utf8').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
      expect(saved).toBe(source.toString('utf8'));
      const binding = linefillJson(block.columnBindings.path);
      for (const body of [observation.saveBody, observation.addBody]) {
        const response = linefillJson(body.path);
        expect(response.success).toBe(true);
        expect(response.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const column of binding.columns.filter((c: { sourceSha256?: string }) => c.sourceSha256)) {
          expect(column).toMatchObject({ sourceSha256: hash(source), owner: block.nativePrivateId, privateVersion: block.nativePrivateVersion });
          expect(csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(response.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      const session = observation.executed.path.replace('executed-v1.pine', 'session-mode0-v1/');
      const rowObservation = linefillJson(session + 'row-set-observation-v1.json');
      const closed = csv.rows.map((row: string[]) => csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowObservation.nativeExportUtc));
      const anchors = csv.rows.flatMap((row: string[], index: number) => closed[index] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [index + 1] : []);
      expect(anchors).toEqual([block.uniqueVisualAnchorRowOrdinal]);
      const first = csv.rows.findIndex((row: string[], index: number) => Number(csv.get(row, 'INPUT_INDEX')) >= 200 && Number(csv.get(row, 'INPUT_INDEX')) % 8 === 0
        && index + 32 < anchors[0] && closed.slice(index, index + 32).length === 32 && closed.slice(index, index + 32).every(Boolean));
      expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => first + i + 1));
      const mask = linefillTable(block.closureMask.path);
      for (const [index, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[index], 'independently_closed')).toBe(closed[index] ? '1' : '0');
        expect(mask.get(mask.rows[index], 'primary_scoring_eligible')).toBe(index >= first && index < first + 32 ? '1' : '0');
        if (index > first && index < first + 32) expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[index - 1], 'INPUT_INDEX')) + 1);
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (index) expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[index - 1], 'time')));
      }
      for (const row of block.rows) for (const pointer of Object.values(row.cells) as { csvSha256: string; columnOrdinal: number; rowOrdinal: number; headerRaw: string; valueRaw: string }[]) {
        expect(pointer.csvSha256).toBe(hash(linefillRaw(block.csv.path)));
        expect(csv.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
        expect(csv.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
      }
      expect(block.completePrimaryCertificate).toBe(true);
      expect(block.originalClosedPredecessorRows).toEqual([]);
      expect(block.rows.every((row: { originalClosedDependencyAvailable: boolean; originalClosedDependencyRowOrdinals: number[] }) => row.originalClosedDependencyAvailable && row.originalClosedDependencyRowOrdinals.length === 0)).toBe(true);
      expect(block.rows).toHaveLength(32);
      expect(block.rows.reduce((n: number, row: { cells: object }) => n + Object.keys(row.cells).length, 0)).toBe(entry.block.ownedTitles.length * 32);
      expect(report.properties).toHaveLength(entry.id.includes('sloped') ? 14 : entry.id.includes('vertical') ? 7 : 17);
      expect(report.properties.every((p: { verdict: string }) => p.verdict === 'SUPPORTED')).toBe(true);
    });
    it(`${entry.id}: exact original-source replay of all observed primary cells and chart time; absolute indices excluded`, () => {
      const { result } = executeLinefill(entry);
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
      expect(compared).toBe((entry.block.ownedTitles.length - 1) * 32);
      expect(entry.report.uniquePrimaryPlotCells).toBe(entry.block.ownedTitles.length * 32);
    });
  }
});

describe('v102 linefill and price: numeric alternatives, bounded appearance and explicit holds', () => {
  for (const entry of linefillEntries) {
    it(`${entry.id}: joins every supported property and alternative to exact primary raw cells`, () => {
      for (const property of entry.report.properties) {
        expect(property.verdict).toBe('SUPPORTED');
        for (const row of entry.block.rows) expect(row.cells[property.title].valueRaw).toBe(property.expectedRawByPhase[row.phase]);
      }
      const selected: Record<string, string[]> = {
        'same-pair-count-and-old-handle-delete': ['REPLACEMENT_ALIASED'],
        'exterior-interpolation': ['INFINITE'], 'mutated-slope': ['UPDATED'], 'vertical-price-result': ['UNDEFINED'],
      };
      for (const alternative of entry.report.numericAlternatives) {
        const matches = alternative.variants.filter((variant: { expectedRawByPhase: Record<string, string[]> }) =>
          Object.entries(variant.expectedRawByPhase).every(([title, phases]) => entry.block.rows.every((row: { phase: number; cells: Record<string, { valueRaw: string }> }) => row.cells[title].valueRaw === phases[row.phase])));
        expect(matches.map((v: { id: string }) => v.id)).toEqual(selected[alternative.id]);
        expect(alternative.supportedVariantIds).toEqual(selected[alternative.id]);
        for (const variant of alternative.variants) expect(variant.verdict).toBe(matches.includes(variant) ? 'SUPPORTED' : 'REFUTED');
      }
      if (entry.id.includes('sloped')) {
        expect(entry.report.observedWithoutPrediction).toMatchObject([{ title: 'OLD_FILL_NA', predictionStatus: 'UNSPECIFIED; actual raw source observations only', observedRawCounts: { '0': 32 } }]);
      } else expect(entry.report.observedWithoutPrediction).toEqual([]);
    });
    it(`${entry.id}: binds visual observations to the original PNG, CSV, source and anchor; held facets get zero credit`, () => {
      if (entry.id.includes('vertical')) {
        expect(entry.regions).toBeNull();
        expect(entry.report.renderAssessment).toBeNull();
        return;
      }
      const region = entry.regions;
      expect(region.sourceSha256).toBe(hash(linefillRaw(entry.sourcePath)));
      expect(region.nativePrivateId).toBe(entry.block.nativePrivateId);
      expect(region.originalCsv).toEqual(entry.block.csv);
      expect(linefillJson(region.sourceObservation.path)).toEqual(entry.report.sourceObservation);
      const png = linefillRaw(region.originalPng.path);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      expect(hash(png)).toBe(region.originalPng.sha256);
      expect(region.visualAnchor).toEqual(entry.block.visualAnchor.cells);
      expect(region.exportAndPngClockBarUnchanged).toBe(true);
      linefillJson(region.sessionReceipt.path);
      const held = region.facets.filter((f: { verdict: string }) => f.verdict === 'UNDECIDED');
      expect(held.map((f: { caseId: string }) => f.caseId.split(':')[1])).toEqual(entry.id.includes('sloped')
        ? ['same-pair-replace-vs-add'] : ['infinite-slope-vs-extend-clamping', 'positive-negative-exact-slopes', 'getter-reflects-mutated-endpoint']);
      for (const facet of held) { expect(facet.supportedCandidate).toBeUndefined(); expect(facet.notObservedCause).toBeTruthy(); }
      expect(region.facets.filter((f: { verdict: string }) => f.verdict === 'SUPPORTED').map((f: { supportedCandidate: string }) => f.supportedCandidate)).toEqual(entry.id.includes('sloped')
        ? ['LIVE_TRACKING_ORANGE_BAND', 'NO_VISIBLE_BLUE_G_AFTER_OLD_DELETE'] : []);
      expect(region.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
      expect(region.nativeFrameId).toBeNull();
    });
  }
});
