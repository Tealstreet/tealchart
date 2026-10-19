import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { capture, entries, executeBoxText, json, lock, raw, revision, table } from '../fixtures/v104BoxText';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const absoluteIndexCause =
  'OBSERVED / EXCLUDED: native absolute index and missing own-origin prefix are not replay context';

describe('v104 original box text wrapping, horizontal and vertical alignment', () => {
  it('binds an independent immutable revision, all v2/v11 integrity dependencies and validation', () => {
    expect(revision).toBe('04a6378c310ef405448e5eea719bf4bc0e699e1a');
    expect(lock.revision).toBe(revision);
    for (const version of [2, 11]) {
      const path = capture + `artifact-integrity-v${version}.json`;
      for (const proof of [...json(path).artifacts, { path, bytes: raw(path).length, sha256: hash(raw(path)) }]) {
        expect(lock.files.find((p) => p.path === proof.path)).toEqual(proof);
        expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
      }
      expect(json(capture + `validation-result-v${version}.json`).status).toBe('PASS');
    }
    const models = json('v104/CASE-MATRIX-v1.json').facets;
    const manifest = json('v104/bundle-manifest-v1.json');
    for (const entry of entries) {
      const slot = manifest.entries.find((c: { sourceId: string }) => c.sourceId === entry.id);
      expect(slot).toMatchObject({
        path: entry.sourcePath,
        sha256: hash(raw(entry.sourcePath)),
        primaryClosedRows: 32,
        phaseModulo: 8,
        minimumBuildIndex: 240,
      });
      expect(slot.plots.map((p: { title: string }) => p.title)).toEqual(
        entry.csv.headers.filter((title) => entry.block.ownedTitles.includes(title)),
      );
      expect(entry.regions.facets).toHaveLength(1);
      for (const facet of entry.regions.facets) {
        const model = models.find((f: { facetId: string }) => f.facetId === facet.facetId);
        expect(facet.frozenModels).toEqual({ A: model.modelA, B: model.modelB });
        expect(facet.frozenPixelWindow).toEqual(model.pixelWindow);
        expect(facet.outcome).toBe('SUPPORTED_A');
      }
    }
  });
  for (const entry of entries) {
    it(`${entry.id}: owns exact source/columns and independently selects the retained A-31..A block`, () => {
      const { block, csv, rowSet, report, regions } = entry;
      const obs = report.sourceObservation;
      expect(obs).toEqual(json(block.sourceObservation.path));
      for (const proof of [
        block.csv,
        block.rowSet,
        block.columnBindings,
        block.closureMask,
        block.sourceObservation,
        regions.originalPng,
        regions.manualInspection,
        regions.sessionReceipt,
        regions.registration.uncertaintySource,
        obs.requested,
        obs.executed,
        obs.sourceForm,
        obs.saveBody,
        obs.addBody,
        obs.fullEditorUi,
        obs.fullEditorVerification,
      ]) {
        expect(lock.files.find((p) => p.path === proof.path)).toEqual(proof);
        expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
      }
      const source = raw(entry.sourcePath);
      expect(source).toEqual(raw(obs.executed.path));
      expect(source).toEqual(raw(obs.fullEditorUi.path));
      expect(json(obs.fullEditorVerification.path).exact).toBe(true);
      expect(hash(source)).toBe(block.sourceSha256);
      expect(
        raw(obs.sourceForm.path)
          .toString('utf8')
          .replaceAll('\r\n', '\n')
          .split('name="source"\n\n')[1]
          .split(/\n------WebKitFormBoundary/)[0],
      ).toBe(source.toString('utf8'));
      const bindings = json(block.columnBindings.path);
      for (const path of [obs.saveBody.path, obs.addBody.path]) {
        const body = json(path);
        expect(body.success).toBe(true);
        expect(body.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const column of bindings.columns.filter((c: { sourceSha256?: string }) => c.sourceSha256)) {
          expect(csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(column).toMatchObject({
            sourceSha256: hash(source),
            owner: block.nativePrivateId,
            privateVersion: block.nativePrivateVersion,
          });
          expect(body.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      const closed = csv.rows.map(
        (row) =>
          csv.get(row, 'CHART_CONFIRMED') === '1' &&
          (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowSet.nativeExportUtc),
      );
      const anchors = csv.rows.flatMap((row, i) =>
        closed[i] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [i + 1] : [],
      );
      expect(anchors).toEqual([rowSet.uniqueVisualAnchorRowOrdinal]);
      const last = anchors[0];
      const primary = Array.from({ length: 32 }, (_, i) => last - 31 + i);
      expect(rowSet.selectedPrimaryClosedRowOrdinals).toEqual(primary);
      expect(block.primaryCertificate).toBe(true);
      expect(block.rows.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual(primary);
      expect(block.predecessors.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual(
        Array.from({ length: 8 }, (_, i) => last - 39 + i),
      );
      expect(closed.slice(last - 40, last).every(Boolean)).toBe(true);
      const phases = primary.map((n) => Number(csv.raw(n, 'CASE_ID')));
      for (let phase = 0; phase < 8; phase++) expect(phases.filter((n) => n === phase)).toHaveLength(4);
      expect(Number(csv.raw(last, 'INPUT_INDEX'))).toBeGreaterThanOrEqual(240);
      const mask = table(block.closureMask.path);
      for (const [i, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[i], 'independently_closed')).toBe(closed[i] ? '1' : '0');
        const selected = primary.includes(i + 1);
        expect(mask.get(mask.rows[i], 'primary_scoring_eligible')).toBe(selected ? '1' : '0');
        expect(mask.get(mask.rows[i], 'primary_exclusion_cause')).toBe(
          selected
            ? ''
            : closed[i]
              ? i + 1 >= last - 39 && i + 1 <= last - 32
                ? 'RESERVED_ORIGINAL_CLOSED_PREDECESSOR'
                : 'OUTSIDE_FIXED_PRIMARY_BLOCK'
              : 'PHYSICALLY_OPEN_OR_SOURCE_CONFIRMATION_CONTEXT_UNAVAILABLE',
        );
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (i) {
          expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[i - 1], 'INPUT_INDEX')) + 1);
          expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[i - 1], 'time')));
        }
      }
      for (const row of [...block.rows, ...block.predecessors])
        for (const pointer of [row.chartTime, ...Object.values(row.cells)] as {
          csvSha256: string;
          rowOrdinal: number;
          columnOrdinal: number;
          headerRaw: string;
          valueRaw: string;
        }[]) {
          expect(pointer.csvSha256).toBe(hash(raw(block.csv.path)));
          expect(csv.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
          expect(csv.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
        }
      expect(regions).toMatchObject({
        sourceId: entry.id,
        sourceSha256: block.sourceSha256,
        nativePrivateId: block.nativePrivateId,
        nativePrivateVersion: block.nativePrivateVersion,
        sourceObservation: block.sourceObservation,
      });
      expect(regions.originalCsv).toEqual(block.csv);
      const receipt = json(regions.sessionReceipt.path);
      expect(receipt).toMatchObject({ source: entry.id, sourceSha256: block.sourceSha256, inputMode: 0 });
      expect(receipt.csv).toMatchObject({ path: block.csv.path, rows: csv.rows.length, columns: csv.headers.length });
      expect(regions.screenshotUtcWindow).toEqual({
        start: receipt.screenshotAtUtc,
        end: receipt.screenshotCompletedAtUtc,
      });
      expect(receipt.nativeFrameAsOfClock).toBeNull();
      expect(receipt.sourceSpecificExecutionIdentity).toBeNull();
      for (const [title, pointer] of Object.entries(regions.retainedAnchor))
        expect(pointer).toEqual(title === 'time' ? block.visualAnchor.chartTime : block.visualAnchor.cells[title]);
      expect(regions.nativeFrameId).toBeNull();
      expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    });
    it(`${entry.id}: exact replay, one build event and31 intentional blanks; absolute indices remain observed exclusions`, () => {
      const { result, firstRowOrdinal, firstNativeIndex, bars } = executeBoxText(entry);
      expect(firstNativeIndex % 8).toBe(0);
      expect(bars.length - 1).toBeGreaterThanOrEqual(240);
      let exact = 0,
        excluded = 0,
        blanks = 0;
      for (const row of entry.block.rows)
        for (const [title, pointer] of Object.entries(row.cells) as [string, { valueRaw: string }][]) {
          const actual = result.plots.find((p) => p.title === title)!.values[row.rowOrdinal - firstRowOrdinal];
          const isAbsolute = title === 'INPUT_INDEX' || (title === 'VISUAL_ANCHOR_INDEX' && pointer.valueRaw !== '');
          if (isAbsolute) {
            expect(absoluteIndexCause).toContain('missing own-origin prefix');
            expect(Number(pointer.valueRaw) - firstNativeIndex).toBe(actual);
            excluded++;
          } else {
            expect(actual, `${entry.id} row${row.rowOrdinal} ${title}`).toBe(
              pointer.valueRaw === '' ? null : Number(pointer.valueRaw),
            );
            if (pointer.valueRaw !== '') expect(String(actual)).toBe(pointer.valueRaw);
            exact++;
            if (pointer.valueRaw === '') blanks++;
          }
        }
      expect(excluded).toBe(33);
      expect(blanks).toBe(155);
      expect(exact).toBe(entry.block.ownedTitles.length * 32 - 33);
      for (const title of ['VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']) {
        const values = entry.block.rows.map(
          (row: { cells: Record<string, { valueRaw: string }> }) => row.cells[title].valueRaw,
        );
        expect(values.slice(0, 31)).toEqual(Array(31).fill(''));
        expect(values[31]).toBe(entry.csv.raw(entry.rowSet.uniqueVisualAnchorRowOrdinal, title));
      }
    });
  }
});
