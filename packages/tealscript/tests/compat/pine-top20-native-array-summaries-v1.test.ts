import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// DOC-CONFLICT-NATIVE-WINS: CF003 rejects numeric v6 predicates;
// native standardize preserves NA slots. Receipt hashes bind both authorities.
const root = new URL('../../oracle-probes/v2/', import.meta.url);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const source = (body: string, version = 6) => `//@version=${version}\nindicator("Native array summaries")\n${body}`;
const errors = (text: string) => checkProgram(parse(text)).diagnostics.filter((entry) => entry.severity === 'error');
const call = (form: string, member: string) => (form === 'method' ? `a.${member}()` : `array.${member}(a)`);

it('binds CF003 source and native CE10123 receipt to the three captured numeric calls', () => {
  const text = readFileSync(new URL('outcome-only/conflicts-batch-4-v1.pine', root), 'utf8');
  const outcomeText = readFileSync(new URL('captures/v2/outcomes-v2.json', root), 'utf8');
  const evidence = readFileSync(new URL('captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt', root), 'utf8');
  expect(sha256(text)).toBe('deb97f1b51ed444051045dfc240ea6621651d8d0e7056e57f939af7967b5adee');
  expect(sha256(outcomeText)).toBe('59ef234328856bcc14124d18176af8dc012dee5163f0d0737cf2c094bd181ddd');
  expect(sha256(evidence)).toBe('d878994a8cd39a067259f137c86c7afe6342f1585d5b870bc43d130a96374210');
  const outcome = JSON.parse(outcomeText).outcomes.find(
    (entry: { probe: string; attempt: number }) => entry.probe === 'conflicts-batch-4-v1.pine' && entry.attempt === 2,
  );
  expect(outcome.runtime.status).toBe('COMPILE-ERROR');
  expect(
    outcome.runtime.error.compiler_markers.map((marker: { code: string; startLineNumber: number }) => [
      marker.code,
      marker.startLineNumber,
    ]),
  ).toEqual([
    ['CE10123', 19],
    ['CE10123', 20],
    ['CE10123', 21],
  ]);
  const diagnostics = errors(text).filter((entry) => entry.code === 'type-mismatch');
  expect(diagnostics.map((entry) => entry.line)).toEqual([19, 20, 21]);
});

for (const form of ['namespace', 'method']) {
  describe(`native array summary rules: ${form}`, () => {
    for (const [kind, cases] of [
      ['int', ['0, 2', '-1, 3', '0, 0']],
      ['float', ['0.0, 2.0', '-1.0, 3.0', '0.0, 0.0']],
    ] as const) {
      for (const member of ['some', 'every']) {
        it(`v6 refuses known ${kind} ${member} and admits bool controls`, () => {
          expect(errors(source(`a = array.new<${kind}>(2, 0)\nresult = ${call(form, member)}`))).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
          );
          expect(errors(source(`a = array.from(false, true)\nresult = ${call(form, member)}`))).toEqual([]);
        });
      }
      for (const [index, elements] of cases.entries()) {
        it(`v5 ${kind} finite numeric predicates retain nonzero truth: ${elements}`, () => {
          const result = runCompatScript(
            source(
              `a = array.from(${elements})
plot(${call(form, 'some')} ? 1 : 0, "some")
plot(${call(form, 'every')} ? 1 : 0, "every")`,
              5,
            ),
          );
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'some').values).toEqual(compatibilityBars.map(() => (index === 2 ? 0 : 1)));
          expect(getPlot(result, 'every').values).toEqual(compatibilityBars.map(() => (index === 1 ? 1 : 0)));
        });
      }
      it(`empty ${kind} min is NA and standardize is empty`, () => {
        const result = runCompatScript(
          source(`a = array.new<${kind}>()
plot(na(${call(form, 'min')}) ? 1 : 0, "missing")
plot(array.size(${call(form, 'standardize')}), "size")`),
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'missing').values).toEqual(compatibilityBars.map(() => 1));
        expect(getPlot(result, 'size').values).toEqual(compatibilityBars.map(() => 0));
      });
    }
    it('native all-NA standardize retains length and independent missing slots', () => {
      const result = runCompatScript(
        source(`a = array.new<float>(3, na)
b = ${call(form, 'standardize')}
plot(b.size(), "size")
plot(na(b.get(0)) and na(b.get(1)) and na(b.get(2)) ? 1 : 0, "missing")
b.set(1, 17)
plot(na(a.get(1)) ? 1 : 0, "source missing")
plot(b.get(1), "written")`),
      );
      expect(result.errors).toEqual([]);
      for (const [title, value] of [
        ['size', 3],
        ['missing', 1],
        ['source missing', 1],
        ['written', 17],
      ] as const) {
        expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => value));
      }
    });
  });
}

it('binds the native standardize source/CSV and all-NA sentinels', () => {
  const text = readFileSync(new URL('coverage-collections-2-v1.pine', root), 'utf8');
  const csv = readFileSync(new URL('captures/v2/coverage-collections-2-v1.csv', root), 'utf8');
  expect(sha256(text)).toBe('0b7b9afb6c0b7073a86ebe747a686e783c83708ebb8936f4f1d0c2cb7bff5bb6');
  expect(sha256(csv)).toBe('bc1b3d1395730dab05bccffed34f0e23cac482df9d5e7f3c240f971900cee21d');
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const warm = columns.indexOf('array_standardize_warm0_7');
  const hole = columns.indexOf('array_standardize_hole97');
  expect(warm).toBeGreaterThanOrEqual(0);
  expect(hole).toBeGreaterThanOrEqual(0);
  const rows = lines.slice(0, 43).map((line) => line.split(','));
  expect(rows.slice(0, 8).map((row) => Number(row[warm]))).toEqual(Array(8).fill(2001));
  expect(rows.slice(40, 43).map((row) => Number(row[hole]))).toEqual(Array(3).fill(2001));
});
