import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';
import { readV58Refusal } from './v58NativeFixtures';

const rows = [
  {
    id: 'V58-180',
    ...readV58Refusal(
      'v58/captures/v58/consumers/g03-v6-array-reassigned-before-float-int-int-first-typed/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/g03-v6-array-reassigned-before-float-int-int-first-typed/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-181',
    ...readV58Refusal(
      'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/observation-v1.json',
    ),
  },
];
describe('v58 collection reassignment', () => {
  for (const row of rows.filter((row) => ['V58-180', 'V58-181'].includes(row.id))) {
    it(row.id, () =>
      expect(
        checkProgram(parse(row.source)).diagnostics.some((d) => d.severity === 'error' && d.code === 'type-mismatch'),
      ).toBe(true),
    );
  }
});

describe('collection reassignment controls', () => {
  for (const version of [5, 6]) {
    for (const init of [
      'array.new<int>(1, 3)',
      'array.new<float>(1, 3.5)',
      'map.new<string,int>()',
      'map.new<string,float>()',
    ]) {
      it(`v${version} ${init}`, () =>
        expect(
          checkProgram(
            parse(`//@version=${version}\nindicator("same kind")\nx = ${init}\ny = ${init}\nx := y\nplot(1)`),
          ).diagnostics.filter((d) => d.severity === 'error'),
        ).toEqual([]));
    }
    it(`v${version} scalar widening and float element insertion`, () =>
      expect(
        checkProgram(
          parse(
            `//@version=${version}\nindicator("scalar widening")\nfloat x = 1.5\nx := 3\nxs = array.new<float>()\narray.push(xs, 3)\nplot(x)`,
          ),
        ).diagnostics.filter((d) => d.severity === 'error'),
      ).toEqual([]));
  }
});

for (const version of [5, 6]) {
  it(`v${version} preserves float-array method on int-array receiver`, () => {
    const source = `//@version=${version}\nindicator("Preserved collection receiver")\nmethod removeEmtpytimes(float[] self) => self.get(0)\nplot(array.from(41).removeEmtpytimes())`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
}


describe('typed-parameter collection reassignment capture boundary', () => {
  for (const version of [5, 6]) {
    for (const typed of [false, true]) {
      for (const collection of ['array', 'map']) {
        it(`v${version} ${collection} ${typed ? 'typed' : 'untyped'} parameters`, () => {
          const intType = collection === 'array' ? 'array<int>' : 'map<string,int>';
          const floatType = collection === 'array' ? 'array<float>' : 'map<string,float>';
          const floatInit = collection === 'array' ? 'array.new<float>(1,1.5)' : 'map.new<string,float>()';
          const intInit = collection === 'array' ? 'array.new<int>(1,3)' : 'map.new<string,int>()';
          const params = typed ? `${floatType} xs, ${intType} ys` : 'xs, ys';
          const source = `//@version=${version}\nindicator("Reassignment boundary")\nscore(${intType} xs) => 10\nscore(${floatType} xs) => 20\nrelay(${params}) =>\n    copied = xs\n    copied := ys\n    score(copied)\nplot(relay(${floatInit},${intInit}))`;
          const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
          if (version === 6) {
            const attempt = `v60/captures/v60/v60-${collection}-reassign-v6-${typed ? 'typed' : 'untyped'}-v1/attempt-v1`;
            const native = readV58Refusal(`${attempt}/executed-v1.pine`, `${attempt}/observation-v4.json`);
            const marker = native.observation.markers.find((d) => d.severity === 8)!;
            expect(errors).toContainEqual(expect.objectContaining({
              code: 'type-mismatch', message: marker.message, line: 7, column: 5,
            }));
          } else {
            expect(errors).toEqual([]);
          }
        });
      }
    }
  }
});
