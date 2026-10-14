import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';
import { readV58PublishedLibrary, readV58Refusal } from './v58NativeFixtures';

const rows = [
  {
    id: 'V58-222',
    ...readV58Refusal(
      'v58/captures/v58/consumers/root2-widening-5-receiver-v58-v1/widening-5/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/root2-widening-5-receiver-v58-v1/widening-5/attempt-v1/observation-v3.json',
    ),
    library: { importPath: 'sours-lat/R2Ns7300f5f6f0f4/1', path: 'v58/root2-library-7300f5f6f0f4-v58-v1.pine' },
  },
  {
    id: 'V58-230',
    ...readV58Refusal(
      'v58/captures/v58/consumers/root2-widening-6-receiver-v58-v1/widening-6/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/root2-widening-6-receiver-v58-v1/widening-6/attempt-v1/observation-v3.json',
    ),
    library: { importPath: 'sours-lat/R2Ns97602e8de8f2/1', path: 'v58/root2-library-97602e8de8f2-v58-v1.pine' },
  },
  {
    id: 'V58-232',
    ...readV58Refusal(
      'v58/captures/v58/consumers/root2-root1-float-only-int-widening-preservation-control-v58-v1/root1-float-only-int-widening/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/root2-root1-float-only-int-widening-preservation-control-v58-v1/root1-float-only-int-widening/attempt-v1/observation-v3.json',
    ),
    library: { importPath: 'sours-lat/R2Ns34c7d0619d7b/1', path: 'v58/root2-library-34c7d0619d7b-v58-v1.pine' },
  },
];
describe('v58 method receiver kind', () => {
  for (const row of rows) {
    it(row.id, () => {
      expect(
        row.observation.markers.some((marker) => marker.severity === 8 && /method.*pick/i.test(marker.message)),
      ).toBe(true);
      const libraries = new Map([
        [
          row.library.importPath,
          parse(readV58PublishedLibrary(row.library.path, row.observation, row.library.importPath)),
        ],
      ]);
      const diagnostic = checkProgram(parse(row.source), { libraries }).diagnostics.find(
        (d) => d.severity === 'error',
      );
      expect(diagnostic).toMatchObject({
        code: row.id === 'V58-222' ? 'method-receiver-type' : 'CE10271',
        message: row.id === 'V58-222'
          ? "Could not find method or method reference 'pick' for 'integer'"
          : "Could not find method or method reference 'integer.pick'",
        line: 4,
        column: 12,
      });
    });
  }
});

describe('method receiver kind controls', () => {
  for (const version of [5, 6]) {
    for (const form of ['receiver', 'function']) {
      for (const type of ['int', 'float']) {
        it(`v${version} ${type} ${form}`, () => {
          const argument = type === 'int' ? '3' : '3.5';
          const call = form === 'receiver' ? `(${argument}).pick()` : `pick(${argument})`;
          const source = `//@version=${version}\nindicator("receiver")\nmethod pick(${type} self) => self + 10\nplot(${call})`;
          expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        });
      }
    }
    it(`v${version} function syntax preserves scalar widening`, () => {
      const source = `//@version=${version}\nindicator("widening")\nmethod pick(float self) => self + 10\nplot(pick(3))`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }
});
