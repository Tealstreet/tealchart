import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';
import { readV58Observation, readV58Refusal } from './v58NativeFixtures';

const rows = [
  {
    id: 'V58-082',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-083',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-084',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-085',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-090',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v6-security-int-first-function-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v6-security-int-first-function-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-091',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v6-security-int-first-method-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v6-security-int-first-method-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-092',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v6-security-float-first-function-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v6-security-float-first-function-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-093',
    ...readV58Refusal(
      'v58/captures/v58/consumers/v6-security-float-first-method-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/v6-security-float-first-method-v1/default/attempt-v1/observation-v1.json',
    ),
  },
];
describe('v58 method declaration naturals', () => {
  for (const row of rows.filter((row) => Number(row.id.slice(4)) < 100)) {
    it(row.id, () => {
      expect(
        row.observation.markers.some(
          (marker) => marker.severity === 8 && /first method argument/i.test(marker.message),
        ),
      ).toBe(true);
      expect(
        checkProgram(parse(row.source)).diagnostics.some(
          (d) => d.severity === 'error' && d.message.includes('first method argument'),
        ),
      ).toBe(true);
    });
  }
});

describe('valid method receiver uses', () => {
  for (const version of [5, 6]) {
    for (const body of ['xs', 'xs + 1', 'math.max(xs, 1)', 'xs > 0 ? xs : 0']) {
      it(`v${version} receiver ${body}`, () => {
        const source = `//@version=${version}\nindicator("used receiver")\nmethod score(float xs) => ${body}\nplot(close.score())`;
        expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      });
    }
    it(`v${version} ordinary unused parameter remains allowed`, () => {
      expect(
        checkProgram(
          parse(`//@version=${version}\nindicator("unused UDF")\nscore(float xs) => 10\nplot(score(close))`),
        ).diagnostics.filter((d) => d.severity === 'error'),
      ).toEqual([]);
    });
  }
});

for (const version of [5, 6]) {
  for (const library of [false, true]) {
    it(`v${version} unused UDT receiver ${library ? 'library remains admitted' : 'indicator refuses per v60'}`, () => {
      const source = `//@version=${version}\n${library ? 'library("UnusedUdt")' : 'indicator("UnusedUdt")'}\n${library ? 'export ' : ''}type Point\n    float x\nmethod shift(Point p, Point other, float delta) => other.x + delta${library ? '' : '\np = Point.new(open)\nother = Point.new(close)\nplot(p.shift(other, 1))'}`;
      const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
      if (library) {
        expect(errors).toEqual([]);
      } else {
        const attempt = `v60/captures/v60/unused-udt-v${version}-indicator-v1/attempt-v1`;
        const native = readV58Refusal(`${attempt}/executed-v1.pine`, `${attempt}/observation-v4.json`);
        const marker = native.observation.markers.find((d) => d.severity === 8)!;
        expect(errors).toEqual([expect.objectContaining({
          code: 'unused-method-receiver', message: marker.message, line: 5, column: 13,
        })]);
      }
    });
  }
}
for (const id of ['547eb85fa13d', 'b4dddfb489fd', '0c3e7d5d2afc']) {
  it(`captured v6 exported numeric receiver ${id} is unused`, () => {
    const observation = readV58Observation(
      `v58/captures/v58/prerequisites/root2-library-${id}-v58-v1/attempt-v1/observation-v1.json`,
    );
    expect(
      observation.markers.some((marker) => marker.code === 'CE10236' && /first method argument/i.test(marker.message)),
    ).toBe(true);
    expect(
      checkProgram(parse(observation.executedSource)).diagnostics.some((d) => d.code === 'CE10236'),
    ).toBe(true);
  });
}
