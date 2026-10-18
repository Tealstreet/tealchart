import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Analytic countermodels, never engine implementations or parity expected values.
// Both explain the captured operations; ARRAY_EQ_SELF would distinguish them.
interface Value {
  kind: 'present' | 'typed-na' | 'cast-na';
  rgba?: readonly number[];
  payload?: string;
  token?: object;
  stable?: boolean;
}
const canonical = {};
const cast = (): Value => ({ kind: 'cast-na', token: canonical, stable: true });
const typedNa: Value = { kind: 'typed-na' };
// Getter transparency is rounded; equality uses an independent literal/gradient payload.
const present = (r: number, g: number, b: number, t: number, alpha: number): Value => ({
  kind: 'present',
  rgba: [r, g, b, t],
  payload: `${r}/${g}/${b}/${alpha}`,
});
// A storage boundary erases static initializer knowledge (folding model) or
// copies the cast token (identity model). Neither transition depends on row parity.
const store = (value: Value): Value =>
  value.kind === 'cast-na' ? { kind: 'cast-na', token: {}, stable: false } : value;
const missing = (value: Value) => value.kind !== 'present';
function equal(left: Value, right: Value, model: 'stable-folding' | 'copied-identity'): boolean {
  if (left.kind !== right.kind || left.kind === 'typed-na') return false;
  if (left.kind === 'present') return left.payload === right.payload;
  return left.token === right.token && (model === 'copied-identity' || (!!left.stable && !!right.stable));
}
function channels(value: Value): (number | null)[] {
  if (value.kind === 'typed-na') return [null, null, null, null, 1];
  return [...(value.rgba ?? [0, 0, 0, 100]), Number(missing(value))];
}
const base = 'v98/captures/v98/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const json = <T>(path: string): T => JSON.parse(read(path).toString('utf8')) as T;
const csv = (path: string) =>
  read(path)
    .toString('utf8')
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => line.split(','));
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
  revision: string;
  files: { path: string; bytes: number; sha256: string }[];
};
const native = json<{
  sources: {
    sourceId: string;
    sourceSha256: string;
    csv: { path: string; sha256: string };
    selectedDataRowOrdinals: number[];
  }[];
}>(base + 'numeric-controls-v6.json').sources.find((s) => s.sourceId === 'v98-color-na-cast-v6')!;
const [headers, ...rows] = csv(native.csv.path);
const indexOf = (name: string) => headers.indexOf(name);
const cell = (ordinal: number, name: string) => rows[ordinal - 1][indexOf(name)];
const df = present(33, 66, 99, 13, 223);
const black0 = present(0, 0, 0, 0, 255);
const black100 = present(0, 0, 0, 100, 0);

describe('v98 v6 cast: observation-only non-identifiability witnesses', () => {
  it('binds the exact source, native inputs and existing complete evidence pin', () => {
    expect(lock.revision).toBe('5c8a503d7b6cc1c161f75d484b5340ebc459a55b');
    for (const path of [
      base + 'numeric-controls-v6.json',
      native.csv.path,
      'v98/sources/v98-color-na-cast-v6.pine',
      base + 'artifact-integrity-v6.json',
      base + 'validation-result-v6.json',
    ]) {
      const bytes = read(path);
      expect(lock.files.find((f) => f.path === path)).toEqual({
        path,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
    const source = read('v98/sources/v98-color-na-cast-v6.pine');
    expect(createHash('sha256').update(source).digest('hex')).toBe(native.sourceSha256);
    expect(source.toString()).toContain('fromArray = array.get(slot, 0)');
    expect(source.toString()).toContain('prior = alternating[1]');
    expect(native.selectedDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 4));
  });

  for (const model of ['stable-folding', 'copied-identity'] as const) {
    it(`${model}: satisfies all 4,032 raw cells, without engine parity credit or a fitted row-parity rule`, () => {
      let checked = 0;
      for (const ordinal of native.selectedDataRowOrdinals) {
        const currentIndex = Number(cell(ordinal, 'INPUT_INDEX'));
        const precedingIndex = Number(cell(ordinal - 1, 'INPUT_INDEX'));
        expect(precedingIndex).toBe(currentIndex - 1);
        // Evaluate the source's actual previous branch, not a fitted equality sequence.
        const previous = (precedingIndex % 4) % 2 === 0 ? cast() : df;
        const prior = store(previous);
        const expectedPrior = currentIndex === 0 ? typedNa : ((currentIndex % 4) + 3) % 2 === 0 ? cast() : df;
        const current = (currentIndex % 4) % 2 === 0 ? cast() : df;
        const arrayValue = store(cast());
        const retained = cast(); // This source's never-reassigned, literal var initializer.
        const tupleValues: Record<string, Value> = {
          CAST: cast(),
          VAR: retained,
          ARRAY: arrayValue,
          HISTORY: prior,
          CAST_HISTORY: store(cast()),
          NZ_DEFAULT: missing(cast()) ? black100 : cast(),
          NZ_REPLACEMENT: missing(cast()) ? df : cast(),
          // Both endpoints are missing under na(); interpolation from missing lower
          // to red at the midpoint retains native half-transparent red.
          GRAD_CAST: present(255, 0, 0, 50, 127),
          GRAD_NA: present(255, 0, 0, 50, 127),
        };
        const predicted: Record<string, number | null> = {
          INPUT_INDEX: currentIndex,
          INPUT_TIME: Number(rows[ordinal - 1][0]) * 1000,
          CHART_CONFIRMED: 1,
          CASE_ID: currentIndex % 4,
          CURRENT_NA: Number(missing(current)),
          EXACT_NA_CAST_CODE: Number(missing(cast())),
          EXACT_NA_CAST: Number(missing(cast())),
          TYPED_NA_NA: 1,
          CAST_EQ_SELF: Number(equal(cast(), cast(), model)),
          CAST_EQ_TYPED_NA: Number(equal(cast(), typedNa, model)),
          CAST_EQ_BLACK0: Number(equal(cast(), black0, model)),
          CAST_EQ_BLACK100: Number(equal(cast(), black100, model)),
          CAST_EQ_DF: Number(equal(cast(), df, model)),
          VAR_EQ_CAST: Number(equal(retained, cast(), model)),
          ARRAY_EQ_CAST: Number(equal(arrayValue, cast(), model)),
          HISTORY_EQ_EXPECTED: Number(equal(prior, expectedPrior, model)),
          EQ_PRESENT_SELF: Number(equal(df, df, model)),
          EQ_PRESENT_DISTINCT: Number(equal(df, present(33, 66, 99, 12, 224), model)),
        };
        for (const [prefix, value] of Object.entries(tupleValues)) {
          const tuple = channels(value);
          for (const [i, suffix] of ['R', 'G', 'B', 'T', 'NA'].entries()) predicted[`${prefix}_${suffix}`] = tuple[i];
        }
        expect(Object.keys(predicted).sort()).toEqual(headers.slice(6).sort());
        for (const title of headers.slice(6)) {
          expect(predicted[title] === null ? '' : String(predicted[title]), `${model}:${ordinal}:${title}`).toBe(
            cell(ordinal, title),
          );
          checked++;
        }
      }
      // 64 absolute indices are native inputs/context, not earned replay credit.
      expect(checked).toBe(4032);
    });
  }

  it('identifies the minimal missing observation instead of choosing a storage or optimizer rule', () => {
    const arrayValue = store(cast());
    expect(equal(arrayValue, arrayValue, 'stable-folding')).toBe(false);
    expect(equal(arrayValue, arrayValue, 'copied-identity')).toBe(true);
    expect(headers).not.toContain('ARRAY_EQ_SELF');
    // Frozen v98-only predictions; the separate v99 regression binds the later native discriminator.
    const query = 'plot(f_code(fromArray == fromArray), title="ARRAY_EQ_SELF", display=display.data_window)';
    expect(query).toContain('fromArray == fromArray');
  });
});
